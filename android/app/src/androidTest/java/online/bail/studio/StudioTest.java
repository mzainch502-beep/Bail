package online.bail.studio;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class StudioTest {
 private String js(ActivityScenario<MainActivity> scenario,String code)throws Exception{
  CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
  scenario.onActivity(a->a.webView.evaluateJavascript(code,result->{value.set(result);done.countDown();}));
  assertTrue("JavaScript response",done.await(10,TimeUnit.SECONDS));return value.get();
 }
 private void ready(ActivityScenario<MainActivity> scenario)throws Exception{
  for(int i=0;i<60;i++){if("true".equals(js(scenario,"document.querySelectorAll('.scene-card').length===2")))return;Thread.sleep(500);}fail("Bundled studio did not load");
 }
 @Test public void bundledEditorLoadsAndNativeSaveWorks()throws Exception{
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
   ready(scenario);assertEquals("true",js(scenario,"!!window.MediaRecorder && !!document.getElementById('canvas').captureStream && !!window.BailAndroid"));
   assertEquals("true",js(scenario,"BailAndroid.beginDownload('bail-smoke.json','application/json') && BailAndroid.appendDownload(btoa('{\"test\":true}')) && BailAndroid.finishDownload()"));
   scenario.onActivity(a->{assertNotNull(a.downloads.lastSaved);a.getContentResolver().delete(a.downloads.lastSaved,null,null);});
  }
 }
 @Test public void canvasExportSavesActualVideo()throws Exception{
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
   ready(scenario);
   js(scenario,"document.getElementById('prompt').value='A city at night.';document.getElementById('generate').click();true");

   boolean saved=false;
   for(int i=0;i<60;i++){Thread.sleep(500);if("true".equals(js(scenario,"document.getElementById('toast').textContent.includes('Saved to Downloads')"))){saved=true;break;}}
   assertTrue("Native export completes: "+js(scenario,"document.getElementById('export-status').textContent"),saved);
   scenario.onActivity(a->{assertNotNull(a.downloads.lastSaved);try(android.content.res.AssetFileDescriptor f=a.getContentResolver().openAssetFileDescriptor(a.downloads.lastSaved,"r")){assertNotNull(f);assertTrue("Nonempty video",f.getLength()>1000);}catch(Exception e){throw new AssertionError(e);}android.media.MediaMetadataRetriever metadata=new android.media.MediaMetadataRetriever();try{metadata.setDataSource(a,a.downloads.lastSaved);assertEquals("yes",metadata.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_HAS_VIDEO));assertTrue("Video duration",Long.parseLong(metadata.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION))>2000);android.graphics.Bitmap decoded=metadata.getFrameAtTime(500000);assertNotNull("MP4 frame decodes",decoded);decoded.recycle();}finally{metadata.release();}a.getContentResolver().delete(a.downloads.lastSaved,null,null);});
  }
 }
 @Test public void imagePromptSavesPng()throws Exception{
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
   ready(scenario);js(scenario,"document.getElementById('prompt').value='An ocean at sunset';document.getElementById('generate-image').click();true");
   boolean saved=false;for(int i=0;i<40;i++){Thread.sleep(500);if("true".equals(js(scenario,"document.getElementById('generation-status').textContent.includes('Image generated and saved')"))){saved=true;break;}}
   assertTrue("PNG saves from prompt",saved);scenario.onActivity(a->{assertNotNull(a.downloads.lastSaved);try(java.io.InputStream stream=a.getContentResolver().openInputStream(a.downloads.lastSaved)){byte[] signature=new byte[8];assertEquals(8,stream.read(signature));assertEquals(137,signature[0]&255);assertEquals(80,signature[1]&255);}catch(Exception e){throw new AssertionError(e);}a.getContentResolver().delete(a.downloads.lastSaved,null,null);});
  }
 }

}
