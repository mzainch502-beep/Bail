import {paintScene} from './scene-engine.js';
import {frameAt,RATIOS,FONTS} from './core.js';
const TAU=Math.PI*2;
const clamp=(x)=>Math.max(0,Math.min(1,x));
const ease=(x)=>1-Math.pow(1-clamp(x),3);
function circle(c,x,y,r,color){c.beginPath();c.fillStyle=color;c.arc(x,y,r,0,TAU);c.fill();}
function lines(c,text,width){
 const words=text.split(/\s+/u);const result=[];let line='';
 for(const word of words){
  if(c.measureText(word).width>width){
   if(line){result.push(line);line='';}
   for(const char of Array.from(word)){if(c.measureText(line+char).width>width&&line){result.push(line);line='';}line+=char;}
  }else if(c.measureText(line+(line?' ':'')+word).width>width&&line){result.push(line);line=word;}
  else line+=(line?' ':'')+word;
 }
 if(line)result.push(line);return result;
}
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.images=new Map();}
 setSize(ratio,size=720){const [a,b]=RATIOS[ratio];this.canvas.width=a>b?Math.round(size*a/b):size;this.canvas.height=a>b?size:Math.round(size*b/a);}
 async preload(scenes){
  const needed=new Set(scenes.map(s=>s.image).filter(Boolean));
  for(const key of this.images.keys())if(!needed.has(key))this.images.delete(key);
  await Promise.all([...needed].map(src=>{
   if(this.images.has(src))return Promise.resolve();
   return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{this.images.set(src,img);resolve();};img.onerror=()=>reject(new Error('Could not decode one of your images.'));img.src=src;});
  }));
 }
 draw(project,time){
  const {c,canvas}=this,w=canvas.width,h=canvas.height,s=Math.min(w,h)/720;
  const {scene,index,local}=frameAt(project.scenes,time);const progress=clamp(local/scene.duration),anim=ease((local+.3)/.9);
  c.save();c.fillStyle='#14211b';c.fillRect(0,0,w,h);
  const image=this.images.get(scene.image);
  if(image){
   const z=project.motion==='still'?1:1+progress*.12;const fit=Math.max(w/image.width,h/image.height)*z;
   const drift=project.motion==='drift'?Math.sin(progress*Math.PI)*w*.03:0;
   c.drawImage(image,(w-image.width*fit)/2+drift,(h-image.height*fit)/2,image.width*fit,image.height*fit);
   const overlay=c.createLinearGradient(0,0,0,h);overlay.addColorStop(0,'#0000001a');overlay.addColorStop(.5,'#00000045');overlay.addColorStop(1,'#000000aa');c.fillStyle=overlay;c.fillRect(0,0,w,h);
  }else if(project.visualMode==='illustrated')paintScene(c,w,h,scene.text,local,project.motion,project.seed||0,project.style,project.accent);
  else this.background(project,index,local,progress,w,h,s);
  if(project.visualMode==='illustrated'){c.restore();return;}
  const light=project.style==='editorial'&&!image;
  c.fillStyle=light?'#33402b':'#f8f6ee';c.textAlign='center';c.textBaseline='middle';
  c.globalAlpha=clamp(anim)*clamp((scene.duration-local)/.35);
  c.font=`500 ${11*s}px ${FONTS.sans}`;
  c.fillText(`STORY / ${String(index+1).padStart(2,'0')}`,w/2,h*.18);
  let fontSize=(project.textSize==='large'?68:project.textSize==='small'?43:56)*s;
  let wrapped;
  for(let i=0;i<7;i++){
   c.font=`${project.font==='serif'?'400':'550'} ${fontSize}px ${FONTS[project.font]}`;
   wrapped=lines(c,scene.text||'A moment, waiting to happen.',w*.78);
   if(wrapped.length*fontSize*1.2<h*.48)break;fontSize*=.85;
  }
  const lh=fontSize*1.2;const y=h*.5-(wrapped.length-1)*lh/2+(1-anim)*28*s;
  wrapped.forEach((line,i)=>c.fillText(line,w/2,y+i*lh,w*.85));
  c.fillStyle=project.accent;c.fillRect(w/2-18*s,h*.74,36*s*anim,2*s);
  c.fillStyle=light?'#7a836f':'#d1d9ca';c.font=`400 ${12*s}px ${FONTS.sans}`;
  c.fillText('A NEW PERSPECTIVE',w/2,h*.81);
  c.globalAlpha=1;
  // Subtle cinematic vignette, generated locally rather than AI footage.
  const vignette=c.createRadialGradient(w/2,h/2,w*.1,w/2,h/2,Math.max(w,h)*.7);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,light?'#454a3518':'#00000088');c.fillStyle=vignette;c.fillRect(0,0,w,h);
  c.restore();
 }
 background(p,index,t,progress,w,h,s){
  const c=this.c;const move=p.motion==='still'?0:t;
  if(p.style==='editorial'){
   c.fillStyle='#eceade';c.fillRect(0,0,w,h);c.strokeStyle='#c7cabc';c.lineWidth=s;
   for(let j=0;j<8;j++){const y=h*(j/8)+Math.sin(move*.3+j)*10*s;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y+60*s,w*.6,y-40*s,w,y+20*s);c.stroke();}
   c.save();c.translate(w*.75,h*.3);c.rotate(move*.05+.3);c.strokeStyle=p.accent;c.lineWidth=40*s;c.strokeRect(-60*s,-60*s,120*s,120*s);c.restore();
  }else if(p.style==='aurora'){
   c.fillStyle='#608f89';c.fillRect(0,0,w,h);
   const points=[[.25,.28,'#e4bfa8'],[.75,.7,'#b0cda5'],[.72,.22,'#d4a3b4']];
   points.forEach(([x,y,col],j)=>{const cx=w*(x+Math.sin(move*.35+j)*.15),cy=h*(y+Math.cos(move*.2+j)*.1);const g=c.createRadialGradient(cx,cy,0,cx,cy,w*.85);g.addColorStop(0,col);g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(0,0,w,h);});
  }else if(p.style==='orbit'){
   c.fillStyle='#171627';c.fillRect(0,0,w,h);
   const cx=w*.5+Math.sin(move*.2)*w*.08,cy=h*.47;
   const g=c.createRadialGradient(cx,cy,w*.12,cx,cy,w*.65);g.addColorStop(0,p.accent+'65');g.addColorStop(.5,'#73559955');g.addColorStop(1,'#17162700');c.fillStyle=g;c.fillRect(0,0,w,h);
   c.save();c.translate(cx,cy);c.rotate(-.4+move*.03);c.scale(1,.45);for(let j=0;j<4;j++){c.beginPath();c.strokeStyle=j===0?p.accent+'99':'#bdc2d82e';c.lineWidth=(j===0?2:.8)*s;c.arc(0,0,w*(.27+j*.08),0,TAU);c.stroke();}c.restore();
   for(let j=0;j<38;j++){const x=((Math.sin(j*412.4+index)*.5+.5)*w+move*3*s)%w,y=(Math.cos(j*64.2)*.5+.5)*h;circle(c,x,y,(j%3+1)*s*.5,'#e0dfdf66');}
  }else{
   c.fillStyle='#15221b';c.fillRect(0,0,w,h);
   const cx=w*(.6+Math.sin(move*.15)*.12),cy=h*.35;
   const g=c.createRadialGradient(cx,cy,0,cx,cy,w*.85);g.addColorStop(0,p.accent+'50');g.addColorStop(.35,'#4c614733');g.addColorStop(1,'#10211900');c.fillStyle=g;c.fillRect(0,0,w,h);
   c.save();c.translate(w*.5,h*.4);c.rotate(-.45+Math.sin(move*.1)*.1);
   const beam=c.createLinearGradient(-w*.24,0,w*.2,0);beam.addColorStop(0,p.accent+'00');beam.addColorStop(.5,p.accent+'24');beam.addColorStop(1,p.accent+'00');c.fillStyle=beam;c.fillRect(-w*.24,-h,w*.44,h*2);c.restore();
   for(let j=0;j<22;j++){const x=(Math.sin(j*98.6)*.5+.5)*w,y=((Math.cos(j*52.8)*.5+.5)*h-move*(4+j%5)*s+h*2)%h;circle(c,x,y,s*(.5+j%2),'#d9edac44');}
  }
 }
}
