package online.bail.studio;
import android.content.Context;
import android.content.ContentValues;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.Image;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.net.Uri;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.util.Base64;
import java.nio.ByteBuffer;

// CPU-rendered canvas frames -> flexible YUV input -> H.264 MP4.
// Fixed presentation timestamps make export independent of screen visibility and wall-clock speed.
final class NativeVideoEncoder {
 private final Context context;
 private MediaCodec codec;
 private MediaMuxer muxer;
 private ParcelFileDescriptor fd;
 private Uri uri;
 private boolean muxing=false,finished=false;
 private int track=-1,width,height,fps,frames;
 private int[] pixels;
 private final MediaCodec.BufferInfo info=new MediaCodec.BufferInfo();
 NativeVideoEncoder(Context context){this.context=context;}
 Uri uri(){return uri;}
 void begin(String name,int w,int h,int rate)throws Exception{
  if(w<16||h<16||w>1920||h>1920||w%2!=0||h%2!=0||rate<15||rate>30)throw new IllegalArgumentException("Unsupported video size or frame rate");
  width=w;height=h;fps=rate;pixels=new int[w*h];
  ContentValues v=new ContentValues();v.put(MediaStore.MediaColumns.DISPLAY_NAME,name.replaceAll("[^\\p{L}\\p{N}._ -]","_"));v.put(MediaStore.MediaColumns.MIME_TYPE,"video/mp4");v.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/Bail");v.put(MediaStore.MediaColumns.IS_PENDING,1);
  uri=context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);if(uri==null)throw new IllegalStateException("Could not create video file");
  fd=context.getContentResolver().openFileDescriptor(uri,"rw");if(fd==null)throw new IllegalStateException("Could not open video file");muxer=new MediaMuxer(fd.getFileDescriptor(),MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
  MediaFormat format=MediaFormat.createVideoFormat("video/avc",w,h);format.setInteger(MediaFormat.KEY_COLOR_FORMAT,MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible);format.setInteger(MediaFormat.KEY_BIT_RATE,w*h>1000000?6000000:2500000);format.setInteger(MediaFormat.KEY_FRAME_RATE,rate);format.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL,1);
  codec=MediaCodec.createEncoderByType("video/avc");codec.configure(format,null,null,MediaCodec.CONFIGURE_FLAG_ENCODE);codec.start();
 }
 private int input()throws Exception{for(int i=0;i<60;i++){int n=codec.dequeueInputBuffer(10000);if(n>=0)return n;drain(false);}throw new IllegalStateException("Video encoder input timeout");}
 void frame(String encoded)throws Exception{
  if(frames>=3600||encoded.length()>12*1024*1024)throw new IllegalStateException("Video limit exceeded");
  byte[] data=Base64.decode(encoded,Base64.DEFAULT);Bitmap bitmap=BitmapFactory.decodeByteArray(data,0,data.length);if(bitmap==null)throw new IllegalArgumentException("Invalid frame");
  try{if(bitmap.getWidth()!=width||bitmap.getHeight()!=height)throw new IllegalArgumentException("Frame dimensions changed");bitmap.getPixels(pixels,0,width,0,0,width,height);}finally{bitmap.recycle();}
  int index=input();ByteBuffer buffer=codec.getInputBuffer(index);if(buffer==null)throw new IllegalStateException("No frame buffer");int capacity=buffer.capacity();Image image=codec.getInputImage(index);if(image==null)throw new IllegalStateException("Encoder does not support CPU image input");
  Image.Plane[] planes=image.getPlanes();
  for(int y=0;y<height;y++)for(int x=0;x<width;x++){
   int color=pixels[y*width+x],r=(color>>16)&255,g=(color>>8)&255,b=color&255;
   put(planes[0],x,y,((66*r+129*g+25*b+128)>>8)+16);
   if((x&1)==0&&(y&1)==0){put(planes[1],x/2,y/2,((-38*r-74*g+112*b+128)>>8)+128);put(planes[2],x/2,y/2,((112*r-94*g-18*b+128)>>8)+128);}
  }
  codec.queueInputBuffer(index,0,capacity,(long)frames*1000000/fps,0);frames++;drain(false);
 }
 private void put(Image.Plane plane,int x,int y,int value){plane.getBuffer().put(y*plane.getRowStride()+x*plane.getPixelStride(),(byte)Math.max(0,Math.min(255,value)));}
 private boolean drain(boolean wait)throws Exception{
  for(int i=0;i<(wait?200:30);i++){
   int index=codec.dequeueOutputBuffer(info,wait?100000:0);
   if(index==MediaCodec.INFO_TRY_AGAIN_LATER){if(!wait)return false;continue;}
   if(index==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){if(muxing)throw new IllegalStateException("Encoder format changed twice");track=muxer.addTrack(codec.getOutputFormat());muxer.start();muxing=true;continue;}
   if(index>=0){ByteBuffer output=codec.getOutputBuffer(index);if((info.flags&MediaCodec.BUFFER_FLAG_CODEC_CONFIG)!=0)info.size=0;
    if(info.size>0){if(!muxing||output==null)throw new IllegalStateException("No video output format");output.position(info.offset);output.limit(info.offset+info.size);muxer.writeSampleData(track,output,info);}
    boolean eos=(info.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;codec.releaseOutputBuffer(index,false);if(eos)return true;
   }
  }
  if(wait)throw new IllegalStateException("Video encoder output timeout");return false;
 }
 void finish()throws Exception{
  if(frames==0)throw new IllegalStateException("No video frames");int index=input();codec.queueInputBuffer(index,0,0,(long)frames*1000000/fps,MediaCodec.BUFFER_FLAG_END_OF_STREAM);drain(true);codec.stop();codec.release();codec=null;if(!muxing)throw new IllegalStateException("No encoded video");muxer.stop();muxer.release();muxer=null;fd.close();fd=null;
  ContentValues done=new ContentValues();done.put(MediaStore.MediaColumns.IS_PENDING,0);context.getContentResolver().update(uri,done,null,null);finished=true;pixels=null;
 }
 void abort(){try{if(codec!=null){codec.stop();codec.release();}}catch(Exception ignored){}codec=null;try{if(muxer!=null)muxer.release();}catch(Exception ignored){}muxer=null;try{if(fd!=null)fd.close();}catch(Exception ignored){}fd=null;pixels=null;if(!finished&&uri!=null)try{context.getContentResolver().delete(uri,null,null);}catch(Exception ignored){} }
}
