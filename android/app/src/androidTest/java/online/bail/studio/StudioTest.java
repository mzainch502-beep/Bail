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
  for(int i=0;i<60;i++){if("true".equals(js(scenario,"document.querySelectorAll('.scene-card').length===4")))return;Thread.sleep(500);}fail("Bundled studio did not load");
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
   js(scenario,"document.getElementById('prompt').value='A film.';document.getElementById('generate').click();true");
   Thread.sleep(1000);
   js(scenario,"document.getElementById('export').click();document.getElementById('quality').value='480';document.getElementById('export-start').click();true");
   boolean saved=false;
   for(int i=0;i<60;i++){Thread.sleep(500);if("true".equals(js(scenario,"document.getElementById('toast').textContent.includes('Saved to Downloads')"))){saved=true;break;}}
   assertTrue("Native export completes",saved);
   scenario.onActivity(a->{assertNotNull(a.downloads.lastSaved);try(android.content.res.AssetFileDescriptor f=a.getContentResolver().openAssetFileDescriptor(a.downloads.lastSaved,"r")){assertNotNull(f);assertTrue("Nonempty video",f.getLength()>1000);}catch(Exception e){throw new AssertionError(e);}a.getContentResolver().delete(a.downloads.lastSaved,null,null);});
  }
 }
}
