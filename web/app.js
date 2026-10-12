import {describe} from './scene-engine.js';
import {compose,duration,frameAt,validateProject,workflowWithPrompt,videoOutputs,safeServer,MAX_SCENES} from './core.js';
import {Renderer} from './renderer.js';
import {saveProject,listProjects,deleteProject} from './storage.js';
const $=id=>document.getElementById(id);
let project={version:1,id:crypto.randomUUID(),name:'Your next chapter',prompt:$('prompt').value,style:'noir',ratio:'portrait',motion:'push',font:'sans',accent:'#d4ee9b',textSize:'regular',visualMode:'illustrated',seed:0,scenes:compose($('prompt').value),audio:null,audioName:'',updated:Date.now()};
let selected=0,time=0,playing=false,last=0,recording=false,recorder=null,renderCancelled=false,aiConfig=null,aiBusy=false,aiBlob=null,aiFilename=null,aiObjectURL=null,downloadURL=null;
const renderer=new Renderer($('canvas'));
const soundtrack=new Audio();soundtrack.loop=true;
let audioContext,audioSource,audioDest;
const timecode=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,5500);}
function error(e){console.error(e);toast(e.message||'Something went wrong. Please try again.');}
function guard(fn){return async(...args)=>{try{await fn(...args);}catch(e){error(e);}};}
function stop(){playing=false;$('play').textContent='▶';$('play').setAttribute('aria-label','Play preview');soundtrack.pause();}
function motionMode(){
 $('ai-video').hidden=true;$('canvas').hidden=false;$('mode-badge').textContent=project.visualMode==='illustrated'?'Illustrated scenes':'Animated text';$('scrub').disabled=false;$('play').disabled=false;$('back-motion').hidden=true;
}
function aiMode(){stop();$('ai-video').hidden=false;$('canvas').hidden=true;$('mode-badge').textContent='AI footage';$('scrub').disabled=true;$('play').disabled=true;$('back-motion').hidden=false;}
const back=document.createElement('button');back.id='back-motion';back.className='text-button';back.textContent='Back to motion';back.hidden=true;$('mode-badge').after(back);back.onclick=()=>{motionMode();draw();};
function draw(){if(recording||$('canvas').hidden)return;renderer.draw(project,time);$('scrub').value=time;$('time').textContent=timecode(time);}
function refreshTimeline(){
 $('timeline').replaceChildren();project.scenes.forEach((s,i)=>{
  const b=document.createElement('button');b.className='scene-card'+(i===selected?' active':'');b.setAttribute('aria-label',`Edit scene ${i+1}: ${s.text}`);b.setAttribute('aria-pressed',String(i===selected));
  const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');const t=document.createElement('b');t.textContent=s.text||'Untitled scene';const d=document.createElement('small');d.textContent=`${s.duration}s`;
  b.append(n,t,d);b.onclick=()=>{if(recording)return;stop();motionMode();selected=i;time=project.scenes.slice(0,i).reduce((s,x)=>s+x.duration,0);refresh();};$('timeline').append(b);
 });
}
function refresh(){
 selected=Math.min(selected,project.scenes.length-1);time=Math.min(time,duration(project.scenes));const scene=project.scenes[selected];
 $('prompt').value=project.prompt;$('char-count').textContent=`${project.prompt.length} / 1500`;$('ratio').value=project.ratio;$('motion').value=project.motion;$('font').value=project.font;$('accent').value=project.accent;$('text-size').value=project.textSize;$('visual-mode').value=project.visualMode||'typography';$('scene-seed').value=project.seed||0;
 $('scene-text').value=scene.text;$('scene-duration').value=scene.duration;$('duration-label').value=`${scene.duration}s`;$('scene-number').textContent=`${String(selected+1).padStart(2,'0')} / ${String(project.scenes.length).padStart(2,'0')}`;
 $('image-remove').hidden=!scene.image;$('image-info').textContent=scene.image?'Photo added · slow camera movement enabled':'Add your photo for a cinematic camera move.';
 $('audio-info').textContent=project.audio?project.audioName:'Optional · use music you have permission to use';$('audio-remove').hidden=!project.audio;
 $('total').textContent=timecode(duration(project.scenes));$('scrub').max=duration(project.scenes);$('project-name-display').textContent=project.name;$('project-name').value=project.name;
 $('scene-left').disabled=selected===0;$('scene-right').disabled=selected===project.scenes.length-1;$('delete-scene').disabled=project.scenes.length===1;$('add-scene').disabled=project.scenes.length>=MAX_SCENES;
 document.querySelectorAll('[data-style]').forEach(b=>{const active=b.dataset.style===project.style;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});refreshTimeline();renderer.setSize(project.ratio);draw();
}
function changed(){project.updated=Date.now();motionMode();draw();}
async function loadProject(p){stop();motionMode();await renderer.preload(p.scenes);project=p;selected=0;time=0;soundtrack.src=p.audio||'';refresh();switchView('studio');}
function tick(now){
 if(playing&&!recording){
  time+=(now-last)/1000;
  if(time>=duration(project.scenes)){time=duration(project.scenes);stop();}
  draw();const idx=frameAt(project.scenes,time).index;
  if(selected!==idx){selected=idx;refreshTimeline();$('scene-text').value=project.scenes[idx].text;$('scene-duration').value=project.scenes[idx].duration;$('duration-label').value=`${project.scenes[idx].duration}s`;$('scene-number').textContent=`${String(idx+1).padStart(2,'0')} / ${String(project.scenes.length).padStart(2,'0')}`;$('image-info').textContent=project.scenes[idx].image?'Photo added':'Add your photo for a cinematic camera move.';$('image-remove').hidden=!project.scenes[idx].image;$('scene-left').disabled=idx===0;$('scene-right').disabled=idx===project.scenes.length-1;}
 }
 last=now;requestAnimationFrame(tick);
}
$('play').onclick=guard(async()=>{
 if(playing){stop();return;}if(time>=duration(project.scenes))time=0;
 if(project.audio){soundtrack.currentTime=time%(soundtrack.duration||1);if(audioContext?.state==='suspended')await audioContext.resume();await soundtrack.play();}
 playing=true;last=performance.now();$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Pause preview');
});
$('scrub').oninput=()=>{stop();time=Number($('scrub').value);draw();};
$('prompt').oninput=()=>{project.prompt=$('prompt').value;$('char-count').textContent=`${project.prompt.length} / 1500`;project.updated=Date.now();};
async function preparePrompt(){
 if(recording)return false;const scenes=compose($('prompt').value);const seed=Number($('scene-seed').value);if(!Number.isInteger(seed)||seed<0||seed>999999)throw new Error('Variation must be a whole number from 0 to 999999.');
 stop();project.scenes=scenes;project.visualMode=$('visual-mode').value;project.seed=seed;project.prompt=$('prompt').value;project.name=project.prompt.slice(0,45)||'My film';selected=0;time=0;motionMode();await renderer.preload(scenes);refresh();
 const themes=[...new Set(scenes.map(s=>describe(s.text,seed).theme))];$('generation-status').textContent=project.visualMode==='illustrated'?`Scene engine: ${themes.join(' · ')}`:'Animated typography';return true;
}
$('compose-preview').onclick=guard(async()=>{if(await preparePrompt())toast('Preview ready. Edit a scene or generate your video.');});
$('generate').onclick=guard(async()=>{if(!await preparePrompt())return;$('export').click();$('quality').value=window.BailAndroid?'480':'720';$('export-start').click();});
$('generate-image').onclick=guard(async()=>{
 if(!await preparePrompt())return;stop();renderer.setSize(project.ratio,1080);renderer.draw(project,1);
 const blob=await new Promise(resolve=>$('canvas').toBlob(resolve,'image/png'));if(!blob)throw new Error('Image generation failed.');
 if(window.BailAndroid)await saveNative(blob,'bail-generated-image.png');else download(blob,'bail-generated-image.png');
 $('generation-status').textContent='Image generated and saved as PNG.';toast(window.BailAndroid?'Image saved to Downloads / Bail':'Image downloaded.');renderer.setSize(project.ratio);draw();
});
$('visual-mode').onchange=()=>{project.visualMode=$('visual-mode').value;changed();refresh();};
$('scene-seed').onchange=()=>{project.seed=Math.min(999999,Math.max(0,Number($('scene-seed').value)||0));changed();refresh();};
for(const b of document.querySelectorAll('[data-style]'))b.onclick=()=>{if(recording)return;project.style=b.dataset.style;changed();refresh();};
for(const [id,key] of [['ratio','ratio'],['motion','motion'],['font','font'],['accent','accent'],['text-size','textSize']])$(id).oninput=()=>{if(recording)return;project[key]=$(id).value;changed();refresh();};
$('scene-text').oninput=()=>{if(recording)return;stop();project.scenes[selected].text=$('scene-text').value;changed();refreshTimeline();};
$('scene-duration').oninput=()=>{if(recording)return;stop();project.scenes[selected].duration=Number($('scene-duration').value);changed();refresh();};
$('add-scene').onclick=()=>{if(recording||project.scenes.length>=MAX_SCENES)return;stop();project.scenes.push({id:crypto.randomUUID(),text:'A new possibility.',duration:4,image:null});selected=project.scenes.length-1;time=duration(project.scenes)-4;changed();refresh();};
$('delete-scene').onclick=guard(async()=>{if(recording||project.scenes.length<=1)return;stop();project.scenes.splice(selected,1);selected=Math.min(selected,project.scenes.length-1);time=project.scenes.slice(0,selected).reduce((s,x)=>s+x.duration,0);await renderer.preload(project.scenes);changed();refresh();});
for(const [id,offset] of [['scene-left',-1],['scene-right',1]])$(id).onclick=()=>{if(recording)return;stop();const next=selected+offset;if(next<0||next>=project.scenes.length)return;[project.scenes[selected],project.scenes[next]]=[project.scenes[next],project.scenes[selected]];selected=next;time=project.scenes.slice(0,next).reduce((s,x)=>s+x.duration,0);changed();refresh();};
function fileData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read the file.'));r.readAsDataURL(file);});}
$('image-add').onclick=()=>$('image-file').click();
$('image-file').onchange=guard(async()=>{
 const file=$('image-file').files[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP photo.');if(file.size>8*1024*1024)throw new Error('Choose a photo under 8 MB.');
 // Resize images before storing to prevent large camera photos exhausting phone memory.
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const c=document.createElement('canvas');c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();const data=c.toDataURL('image/jpeg',.9);
 const index=selected;const copy=project.scenes.map((s,i)=>i===index?{...s,image:data}:s);await renderer.preload(copy);project.scenes=copy;changed();refresh();$('image-file').value='';
});
$('image-remove').onclick=guard(async()=>{project.scenes[selected].image=null;await renderer.preload(project.scenes);changed();refresh();});
$('audio-add').onclick=()=>$('audio-file').click();
$('audio-file').onchange=guard(async()=>{const f=$('audio-file').files[0];if(!f)return;if(!f.type.startsWith('audio/'))throw new Error('Choose an audio file.');if(f.size>15*1024*1024)throw new Error('Choose music under 15 MB.');stop();const data=await fileData(f);const probe=new Audio(data);await new Promise((resolve,reject)=>{probe.onloadedmetadata=resolve;probe.onerror=()=>reject(new Error('Your browser cannot play this audio format.'));});project.audio=data;project.audioName=f.name;soundtrack.src=data;changed();refresh();$('audio-file').value='';});
$('audio-remove').onclick=()=>{stop();project.audio=null;project.audioName='';soundtrack.removeAttribute('src');soundtrack.load();changed();refresh();};
$('fullscreen').onclick=guard(async()=>{if(document.fullscreenElement)await document.exitFullscreen();else if($('stage').requestFullscreen)await $('stage').requestFullscreen();else throw new Error('Fullscreen is unavailable in this browser.');});
$('help').onclick=()=>$('help-dialog').showModal();$('privacy').onclick=()=>$('privacy-dialog').showModal();$('save').onclick=()=>{if(!recording)$('save-dialog').showModal();};
$('save-confirm').onclick=guard(async()=>{project.name=$('project-name').value.trim()||'Untitled story';project.updated=Date.now();await saveProject(structuredClone(project));$('save-dialog').close();refresh();toast('Project saved on this device.');});
async function saveNative(blob,name){
 if(blob.size>200*1024*1024)throw new Error('Export exceeds the 200 MB Android save limit.');
 const bridge=window.BailAndroid;
 if(!bridge.beginDownload(name,blob.type.split(';')[0]))throw new Error('Could not create a file in Downloads. Check free storage.');
 try{
  for(let i=0;i<blob.size;i+=96*1024){const bytes=new Uint8Array(await blob.slice(i,i+96*1024).arrayBuffer());let text='';for(let k=0;k<bytes.length;k++)text+=String.fromCharCode(bytes[k]);if(!bridge.appendDownload(btoa(text)))throw new Error('Could not save this file. Check free storage.');}
  if(!bridge.finishDownload())throw new Error('Could not finish saving this file.');
  toast('Saved to Downloads / Bail');
 }catch(e){bridge.abortDownload();throw e;}
}
function download(blob,name){if(window.BailAndroid){saveNative(blob,name).catch(error);return;}const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);}
$('backup').onclick=()=>{project.name=$('project-name').value.trim()||'Untitled story';download(new Blob([JSON.stringify(project)],{type:'application/json'}),`${project.name.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,50)||'bail'}-project.json`);toast('Backup downloaded. Keep it somewhere safe.');};
async function switchView(view){stop();for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('active',b.dataset.view===view);$('studio-view').hidden=view!=='studio';$('projects-view').hidden=view!=='projects';if(view==='projects')await renderProjects();}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=guard(()=>{if(!recording)return switchView(b.dataset.view);});
async function renderProjects(){
 const projects=(await listProjects()).sort((a,b)=>b.updated-a.updated);const grid=$('project-grid');grid.replaceChildren();
 if(!projects.length){const empty=document.createElement('div');empty.className='empty-state';const h=document.createElement('h2');h.textContent='Every story starts somewhere.';const p=document.createElement('p');p.textContent='Create a story in Studio and save it here.';const b=document.createElement('button');b.className='button primary';b.textContent='Open Studio ↗';b.onclick=()=>switchView('studio');empty.append(h,p,b);grid.append(empty);return;}
 for(const p of projects){const card=document.createElement('article');card.className='project-card';const badge=document.createElement('span');badge.className='eyebrow';badge.textContent=`${p.style} / ${p.ratio}`;const h=document.createElement('h2');h.textContent=p.name;const meta=document.createElement('p');meta.className='small';meta.textContent=`${p.scenes.length} scenes · ${duration(p.scenes)}s · ${new Date(p.updated).toLocaleDateString()}`;const open=document.createElement('button');open.className='button primary';open.textContent='Open story ↗';open.onclick=guard(()=>loadProject(validateProject(p)));const backup=document.createElement('button');backup.className='button secondary';backup.textContent='Backup';backup.onclick=()=>download(new Blob([JSON.stringify(p)],{type:'application/json'}),'bail-project.json');const del=document.createElement('button');del.className='text-button danger';del.textContent='Delete';del.onclick=guard(async()=>{if(!confirm(`Delete “${p.name}” from this device?`))return;await deleteProject(p.id);await renderProjects();});card.append(badge,h,meta,open,backup,del);grid.append(card);}
}
$('import-project').onclick=()=>$('project-file').click();$('project-file').onchange=guard(async()=>{const f=$('project-file').files[0];if(!f)return;if(f.size>40*1024*1024)throw new Error('Project backup is too large (40 MB maximum).');const p=validateProject(JSON.parse(await f.text()));p.id=crypto.randomUUID();await loadProject(p);await saveProject(p);$('project-file').value='';toast('Backup imported and saved.');});
const templates={brand:{prompt:'Something worth slowing down for. Warm mornings. Good company. A little more everyday magic.',name:'Slow mornings',style:'noir'},launch:{prompt:'A new chapter. A different kind of bold. Designed for what comes next. Make your first move.',name:'The next chapter',style:'editorial'},personal:{prompt:'Small moments. The light on the window. A familiar laugh. Beautifully told.',name:'Small moments',style:'aurora'}};
for(const b of document.querySelectorAll('[data-template]'))b.onclick=guard(async()=>{if(recording)return;const t=templates[b.dataset.template];await loadProject({...project,id:crypto.randomUUID(),name:t.name,prompt:t.prompt,style:t.style,scenes:compose(t.prompt),audio:null,audioName:''});window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
function setBusy(value){recording=value;window.__bailRendering=value;for(const el of document.querySelectorAll('main button,main input,main textarea,main select,header button'))el.disabled=value;if(!value)refresh();}
$('export').onclick=guard(async()=>{
 stop();if(!$('ai-video').hidden&&aiBlob){download(aiBlob,aiFilename||'bail-ai-film.mp4');return;}
 $('export-start').hidden=false;$('download-video').hidden=true;$('export-progress').hidden=true;$('export-status').textContent='';$('export-dialog').showModal();
});
$('download-video').onclick=guard(async e=>{if(window.BailAndroid){e.preventDefault();const blob=await (await fetch($('download-video').href)).blob();await saveNative(blob,$('download-video').download);}});
$('export-cancel').onclick=()=>{renderCancelled=true;if(recorder?.state==='recording')recorder.stop();};
$('export-dialog').addEventListener('cancel',e=>{if(recording){e.preventDefault();toast('Use Cancel render to stop safely.');}});
$('export-dialog').querySelector('.dialog-close').onclick=e=>{if(recording){e.preventDefault();toast('Use Cancel render to stop safely.');}};
async function renderNativeVideo(){
 const bridge=window.BailAndroid;stop();motionMode();await renderer.preload(project.scenes);renderer.setSize(project.ratio,Number($('quality').value));
 const fps=24,frames=Math.ceil(duration(project.scenes)*fps),name=`bail-${project.name.replace(/[^a-z0-9]/gi,'-').slice(0,40)}.mp4`;
 if(!bridge.beginVideo(name,$('canvas').width,$('canvas').height,fps))throw new Error(bridge.videoError()||'Android could not start the MP4 encoder.');
 renderCancelled=false;setBusy(true);$('export-start').hidden=true;$('export-cancel').hidden=false;$('export-progress').hidden=false;$('export-progress').value=0;$('download-video').hidden=true;
 try{
  for(let i=0;i<frames;i++){
   if(renderCancelled){bridge.abortVideo();$('export-status').textContent='Render cancelled.';$('export-start').hidden=false;return;}
   renderer.draw(project,i/fps);const frame=$('canvas').toDataURL('image/jpeg',.88).split(',')[1];
   if(!bridge.videoFrame(frame))throw new Error(bridge.videoError()||'Android could not encode a video frame.');
   $('export-progress').value=(i+1)/frames;$('export-status').textContent=`Rendering MP4 · frame ${i+1} / ${frames}`;await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(!bridge.finishVideo())throw new Error(bridge.videoError()||'Android could not finish the MP4 file.');
  $('export-status').textContent='Video saved to Downloads / Bail';$('generation-status').textContent='MP4 generated and saved.';toast('Saved to Downloads / Bail');
 }catch(e){bridge.abortVideo();$('export-status').textContent=e.message;$('export-start').hidden=false;throw e;}
 finally{setBusy(false);$('export-cancel').hidden=true;renderer.setSize(project.ratio);draw();}
}
$('export-start').onclick=guard(async()=>{
 if(recording)return;
 if(window.BailAndroid?.beginVideo){await renderNativeVideo();return;}
 if(!window.MediaRecorder||!$('canvas').captureStream)throw new Error('Video export is unavailable in this browser. Try current Chrome or Safari.');
 if(document.hidden)throw new Error('Keep Bail visible while exporting.');
 let stream=null,renderFrame=null;
 try{
  stop();motionMode();await renderer.preload(project.scenes);await document.fonts.ready;
  const mime=['video/webm;codecs=vp8,opus','video/webm','video/mp4','video/webm;codecs=vp9,opus'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error('Your browser has no supported video recording format.');
  renderer.setSize(project.ratio,Number($('quality').value));renderer.draw(project,0);stream=$('canvas').captureStream(30);
  if(project.audio){
   if(!audioContext){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Audio export is unavailable in this browser.');audioContext=new AC();audioSource=audioContext.createMediaElementSource(soundtrack);audioDest=audioContext.createMediaStreamDestination();audioSource.connect(audioDest);audioSource.connect(audioContext.destination);}
   await audioContext.resume();for(const track of audioDest.stream.getAudioTracks())stream.addTrack(track.clone());soundtrack.currentTime=0;
  }
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Number($('quality').value)>=1080?8_000_000:4_000_000});
  const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};renderCancelled=false;
  const done=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('Recording failed.'));});
  setBusy(true);$('export-start').hidden=true;$('export-cancel').hidden=false;$('export-progress').hidden=false;$('export-progress').value=0;$('export-status').textContent='Rendering… keep this tab visible.';
  recorder.start(300);
  if(project.audio)await soundtrack.play();
  const start=performance.now(),length=duration(project.scenes);
  const render=now=>{if(recorder?.state!=='recording')return;const t=Math.min(length,(now-start)/1000);renderer.draw(project,t);$('export-progress').value=t/length;if(t>=length){recorder.stop();return;}renderFrame=requestAnimationFrame(render);};renderFrame=requestAnimationFrame(render);
  await done;
  if(renderCancelled){$('export-status').textContent='Render cancelled. You can try again.';$('export-start').hidden=false;return;}
  const blob=new Blob(chunks,{type:recorder.mimeType});if(blob.size<100)throw new Error('The browser returned an empty recording.');
  if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(blob);$('download-video').href=downloadURL;$('download-video').download=`bail-${project.name.replace(/[^a-z0-9]/gi,'-').slice(0,40)}.${mime.includes('mp4')?'mp4':'webm'}`;$('download-video').hidden=false;$('export-status').textContent=`Your video is ready · ${(blob.size/1024/1024).toFixed(1)} MB`;if(window.BailAndroid){await saveNative(blob,$('download-video').download);$('export-status').textContent='Video saved to Downloads / Bail';}else $('download-video').click();$('generation-status').textContent='Video generated. Use Download video to save another copy.';
 }catch(e){$('export-status').textContent=e.message;$('export-start').hidden=false;throw e;}
 finally{if(renderFrame)cancelAnimationFrame(renderFrame);if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());soundtrack.pause();recorder=null;setBusy(false);$('export-cancel').hidden=true;renderer.setSize(project.ratio);draw();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();if(recording){renderCancelled=true;if(recorder?.state==='recording')recorder.stop();$('export-status').textContent='Render interrupted because Bail moved into the background.';}}});
window.addEventListener('beforeunload',e=>{if(recording){e.preventDefault();e.returnValue='';}});
if(!window.BailAndroid && 'serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
refresh();requestAnimationFrame(tick);
