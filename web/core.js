export const MAX_SCENES = 12;
export const STYLES = ['noir','aurora','editorial','orbit'];
export const RATIOS = {portrait:[9,16],landscape:[16,9],square:[1,1]};
export const FONTS = {sans:'system-ui, sans-serif',serif:'Georgia, serif',mono:'ui-monospace, monospace'};
export function compose(text, style='noir') {
 const parts = String(text).trim().split(/(?:\n+|(?<=[.!?。！？])\s+)/u).map(s=>s.trim()).filter(Boolean);
 if (!parts.length) throw new Error('Write a thought first.');
 const chunks = [];
 for (const part of parts) {
  const words=part.split(/\s+/u); let line='';
  for(const word of words){ if((line+' '+word).length>170 && line){chunks.push(line);line='';} line+=(line?' ':'')+word; }
  if(line) chunks.push(line.slice(0,240));
 }
 if(chunks.length>MAX_SCENES) throw new Error('Keep your story to 12 scenes or fewer. Try shorter text.');
 return chunks.map(text=>({id:crypto.randomUUID(),text,duration:Math.min(8,Math.max(3,Math.round(text.length/18))),image:null}));
}
export function duration(scenes){return scenes.reduce((sum,s)=>sum+s.duration,0);}
export function frameAt(scenes,time){
 let start=0;
 for(let i=0;i<scenes.length;i++){
  const scene=scenes[i];
  if(time<start+scene.duration || i===scenes.length-1) return {scene,index:i,local:Math.max(0,Math.min(scene.duration,time-start)),start};
  start+=scene.duration;
 }
 throw new Error('Project has no scenes.');
}
export function validateProject(value){
 if(!value || typeof value!=='object' || value.version!==1) throw new Error('This is not a Bail project backup.');
 if(!Array.isArray(value.scenes)||!value.scenes.length||value.scenes.length>MAX_SCENES) throw new Error('Projects need 1–12 scenes.');
 const dataURL=(x,type)=>x===null||x===undefined||(typeof x==='string'&&x.length<25_000_000&&new RegExp('^data:'+type+'/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$').test(x));
 const scenes=value.scenes.map(s=>{
  if(typeof s.text!=='string'||s.text.length>240||!Number.isFinite(s.duration)||s.duration<2||s.duration>10||!dataURL(s.image,'image')) throw new Error('Invalid scene in project backup.');
  return {id:crypto.randomUUID(),text:s.text,duration:s.duration,image:s.image||null};
 });
 if(!dataURL(value.audio,'audio')) throw new Error('Invalid soundtrack in project backup.');
 return {version:1,id:typeof value.id==='string'?value.id:crypto.randomUUID(),name:String(value.name||'Untitled story').slice(0,60),prompt:String(value.prompt||'').slice(0,1500),style:STYLES.includes(value.style)?value.style:'noir',ratio:Object.hasOwn(RATIOS,value.ratio)?value.ratio:'portrait',motion:['push','drift','still'].includes(value.motion)?value.motion:'push',font:Object.hasOwn(FONTS,value.font)?value.font:'sans',accent:/^#[a-fA-F0-9]{6}$/.test(value.accent)?value.accent:'#d4ee9b',textSize:['small','large','regular'].includes(value.textSize)?value.textSize:'regular',scenes,audio:value.audio||null,audioName:String(value.audioName||'Soundtrack').slice(0,100),updated:Date.now()};
}
export function workflowWithPrompt(workflow,prompt,negative,seed){
 if(!workflow||typeof workflow!=='object'||Array.isArray(workflow)||'nodes' in workflow)throw new Error('Use ComfyUI API-format JSON, not the normal UI workflow export.');
 const entries=Object.values(workflow);
 if(!entries.length||!entries.every(n=>n&&typeof n.class_type==='string'&&typeof n.inputs==='object'))throw new Error('Invalid ComfyUI API workflow.');
 let found=false;
 function visit(v){
  if(typeof v==='string'){
   if(v.includes('{{prompt}}')) found=true;
   if(v==='{{seed}}')return seed;
   return v.replaceAll('{{prompt}}',prompt).replaceAll('{{negative}}',negative).replaceAll('{{seed}}',String(seed));
  }
  if(Array.isArray(v))return v.map(visit);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)]));
  return v;
 }
 const result=visit(workflow);
 if(!found)throw new Error('Add {{prompt}} inside your positive text prompt node before connecting.');
 return result;
}
export function videoOutputs(outputs){
 const result=[];
 for(const output of Object.values(outputs||{})) for(const list of Object.values(output||{})) if(Array.isArray(list)) for(const file of list) if(file&&typeof file.filename==='string'&&/\.(mp4|webm|mov)$/i.test(file.filename)) result.push(file);
 return result;
}
export function safeServer(raw,locationProtocol){
 const url=new URL(raw);
 if(url.username||url.password||url.search||url.hash)throw new Error('Use a server address without credentials, query parameters or fragments.');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.protocol!=='https:' && !(url.protocol==='http:'&&local&&locationProtocol==='http:'))throw new Error('Use HTTPS for a remote ComfyUI server. Local HTTP is available only from a local HTTP Bail page.');
 return url.href.replace(/\/$/,'');
}
