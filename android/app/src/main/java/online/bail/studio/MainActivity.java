package online.bail.studio;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.io.OutputStream;

public class MainActivity extends Activity {
 static final String ORIGIN = "https://appassets.androidplatform.net";
 WebView webView;
 final DownloadsBridge downloads = new DownloadsBridge();
 private ValueCallback<Uri[]> fileCallback;
 private View fullScreenView;
 private WebChromeClient.CustomViewCallback fullScreenCallback;
 private static final int PICK_FILE = 401;

 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(245,244,239));
  getWindow().setNavigationBarColor(Color.rgb(245,244,239));
  webView = new WebView(this);
  webView.setBackgroundColor(Color.rgb(245,244,239));
  // Android 15 edge-to-edge: keep the web header and footer inside system bars.
  webView.setOnApplyWindowInsetsListener((view,insets) -> {
   view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
   return insets.consumeSystemWindowInsets();
  });
  setContentView(webView);
  webView.requestApplyInsets();
  WebSettings settings = webView.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(true);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setMediaPlaybackRequiresUserGesture(false);
  settings.setSupportMultipleWindows(false);
  webView.addJavascriptInterface(downloads,"BailAndroid");
  WebViewAssetLoader loader = new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  webView.setWebViewClient(new WebViewClient() {
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) { return loader.shouldInterceptRequest(request.getUrl()); }
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
    Uri uri=request.getUrl();
    // Only bundled app pages can navigate inside the privileged WebView.
    if(uri.toString().startsWith(ORIGIN+"/assets/")) return false;
    if(request.isForMainFrame()) {
     if("https".equals(uri.getScheme())||"http".equals(uri.getScheme())) {
      try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch(Exception ignored) { toast("No browser available to open this link."); }
     }
     return true;
    }
    return false;
   }
  });
  webView.setWebChromeClient(new WebChromeClient() {
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
    if(fileCallback!=null) fileCallback.onReceiveValue(null);
    fileCallback=callback;
    Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("*/*");
    String[] accepts=params.getAcceptTypes();
    if(accepts!=null&&accepts.length>0) intent.putExtra(Intent.EXTRA_MIME_TYPES,accepts);
    try { startActivityForResult(intent,PICK_FILE); }
    catch(Exception e) { fileCallback.onReceiveValue(null);fileCallback=null;toast("File picker unavailable."); }
    return true;
   }
   @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result) {
    new AlertDialog.Builder(MainActivity.this).setTitle("Bail").setMessage(message).setPositiveButton("Continue",(d,w)->result.confirm()).setNegativeButton("Cancel",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;
   }
   @Override public void onShowCustomView(View view,CustomViewCallback callback) {
    if(fullScreenView!=null){callback.onCustomViewHidden();return;}
    fullScreenView=view;fullScreenCallback=callback;setContentView(view);getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
   }
   @Override public void onHideCustomView() {
    if(fullScreenView==null)return;
    setContentView(webView);getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);fullScreenView=null;
    if(fullScreenCallback!=null){fullScreenCallback.onCustomViewHidden();fullScreenCallback=null;}
   }
  });
  webView.loadUrl(ORIGIN+"/assets/index.html");
 }
 private void toast(String text) { runOnUiThread(()->Toast.makeText(this,text,Toast.LENGTH_LONG).show()); }
 @Override protected void onActivityResult(int request,int result,Intent data) {
  super.onActivityResult(request,result,data);
  if(request==PICK_FILE&&fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));fileCallback=null;}
 }
 @Override public void onBackPressed() {
  if(fullScreenView!=null){webView.getWebChromeClient().onHideCustomView();return;}
  webView.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(!d)return false;if(window.__bailRendering)return true;d.close();return true;})()",handled->{if(!"true".equals(handled))new AlertDialog.Builder(this).setTitle("Close Bail?").setMessage("Save your project before leaving.").setPositiveButton("Close",(d,w)->finish()).setNegativeButton("Stay",null).show();});
 }
 @Override protected void onDestroy() {
  downloads.abortDownload();
  if(fileCallback!=null)fileCallback.onReceiveValue(null);
  if(webView!=null){webView.removeJavascriptInterface("BailAndroid");webView.destroy();}
  super.onDestroy();
 }

 public class DownloadsBridge {
  private Uri pending;
  private OutputStream stream;
  private long bytes;
  Uri lastSaved;
  @JavascriptInterface public synchronized boolean beginDownload(String filename,String mime) {
   if(stream!=null) return false;
   if(filename==null||mime==null)return false;
   if(!mime.startsWith("video/")&&!"application/json".equals(mime))return false;
   String safe=filename.replaceAll("[^\\p{L}\\p{N}._ -]","_");if(safe.length()>100)safe=safe.substring(0,100);if(safe.trim().isEmpty())safe="bail-export";
   try {
    ContentValues values=new ContentValues();values.put(MediaStore.MediaColumns.DISPLAY_NAME,safe);values.put(MediaStore.MediaColumns.MIME_TYPE,mime);values.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/Bail");values.put(MediaStore.MediaColumns.IS_PENDING,1);
    pending=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
    if(pending==null)return false;
    stream=getContentResolver().openOutputStream(pending);bytes=0;
    if(stream==null){abortDownload();return false;}return true;
   }catch(Exception e){abortDownload();return false;}
  }
  @JavascriptInterface public synchronized boolean appendDownload(String data) {
   if(stream==null||data==null||data.length()>200000)return false;
   try { byte[] chunk=Base64.decode(data,Base64.DEFAULT);bytes+=chunk.length;if(bytes>200L*1024*1024){abortDownload();return false;}stream.write(chunk);return true; }
   catch(Exception e){abortDownload();return false;}
  }
  @JavascriptInterface public synchronized boolean finishDownload() {
   if(stream==null)return false;
   try {stream.close();stream=null;ContentValues ready=new ContentValues();ready.put(MediaStore.MediaColumns.IS_PENDING,0);getContentResolver().update(pending,ready,null,null);lastSaved=pending;pending=null;toast("Saved to Downloads / Bail");return true;}
   catch(Exception e){abortDownload();return false;}
  }
  @JavascriptInterface public synchronized void abortDownload() {
   try {if(stream!=null)stream.close();}catch(Exception ignored){}stream=null;
   if(pending!=null){try{getContentResolver().delete(pending,null,null);}catch(Exception ignored){}pending=null;}
  }
 }
}
