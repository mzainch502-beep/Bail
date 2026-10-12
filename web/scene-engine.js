// A deterministic, on-device procedural illustrator. No model, fetch or image service.
export const THEMES=['city','mountains','forest','ocean','space','desert','coffee','product','abstract'];
const lexicon={city:/city|street|neon|building|skyline|urban|seoul|busan|도시|شہر/i,mountains:/mountain|alpine|peak|valley|산|پہاڑ/i,forest:/forest|tree|woodland|jungle|garden|숲|جنگل/i,ocean:/ocean|beach|sea\b|wave|island|coast|바다|سمندر/i,space:/space|planet|galaxy|cosmos|star|moon|우주|چاند/i,desert:/desert|dune|sand|사막|صحرا/i,coffee:/coffee|cafe|café|cup|tea|커피|چائے/i,product:/product|bottle|perfume|skincare|cosmetic|제품/i};
export function hash(text){let n=2166136261;for(const c of text){n^=c.codePointAt(0);n=Math.imul(n,16777619);}return n>>>0;}
function rng(seed){let x=seed||123456;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
export function describe(prompt,seed=0){
 const text=String(prompt);let theme='abstract';for(const [name,rx] of Object.entries(lexicon))if(rx.test(text)){theme=name;break;}
 return {theme,seed:hash(text)+Number(seed)>>>0,night:/night|dark|midnight|moon|neon|밤|رات/i.test(text),sunset:/sunset|sunrise|golden|dusk|warm|노을/i.test(text),rain:/rain|storm|비|بارش/i.test(text),snow:/snow|winter|눈/i.test(text),color:/pink|rose|분홍/i.test(text)?'#ed91bb':/blue|azure|파랑/i.test(text)?'#69bbef':/red|crimson|빨강/i.test(text)?'#f58b73':/purple|violet/i.test(text)?'#c3a0ff':'#a9ddbd'};
}
const disk=(c,x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function gradient(c,x,y,r,col){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
export function paintScene(c,w,h,prompt,t=0,motion='push',seed=0,style='noir',accent='#d4ee9b'){
 const d=describe(prompt,seed),random=rng(d.seed),at=motion==='still'?0:t;if(accent!=='#d4ee9b'&&/^#[a-f0-9]{6}$/i.test(accent))d.color=accent;
 c.save();const zoom=motion==='push'?1+at*.012:1.04;
 c.translate(w/2+(motion==='drift'?Math.sin(at*.25)*w*.025:0),h/2);c.scale(zoom,zoom);c.translate(-w/2,-h/2);
 const sky=c.createLinearGradient(0,0,0,h);
 const palette=d.night?['#071125','#263358','#142331']:d.sunset?['#463768','#ed9b88','#f4d8ae']:['#79a7b7','#bdd5cd','#e5e1be'];
 sky.addColorStop(0,palette[0]);sky.addColorStop(.65,palette[1]);sky.addColorStop(1,palette[2]);c.fillStyle=sky;c.fillRect(-w,-h,w*3,h*3);
 if(d.night){for(let i=0;i<75;i++){const x=random()*w,y=random()*h*.6;disk(c,x,y,(random()*1.4+.4)*w/720,'#fff5d599');}disk(c,w*.72,h*.22,w*.07,'#efe6c6');gradient(c,w*.72,h*.22,w*.2,'#ddd7bc24');}
 else{const sx=w*.7+Math.sin(at*.05)*w*.03,sy=h*.28;gradient(c,sx,sy,w*.35,'#ffe1a45c');disk(c,sx,sy,w*.10,d.sunset?'#ffd9ab':'#f8f0d7');}
 // Clouds are independently layered so drifting motion isn't a static zoom.
 if(d.theme!=='space')for(let i=0;i<7;i++){const x=((random()*w+at*(3+i)*w/720)%(w*1.4))-w*.2,y=h*(.10+random()*.33);c.save();c.globalAlpha=d.night?.08:.15;c.fillStyle='#fff9e6';c.beginPath();c.ellipse(x,y,w*(.1+random()*.12),h*.016,0,0,Math.PI*2);c.fill();c.restore();}
 const horizon=h*.58;
 if(['mountains','forest','desert'].includes(d.theme)){
  for(let layer=0;layer<4;layer++){
   const pts=[[-w*.1,h]];const base=h*(.46+layer*.12);for(let i=0;i<14;i++)pts.push([w*(i/12-.04),base-(random()*.20+.03)*h+Math.sin(i+at*.06)*h*.007]);pts.push([w*1.1,h]);poly(c,pts,d.theme==='desert'?['#836575','#ad7b70','#cb9782','#e5b697'][layer]:d.night?['#293a54','#233449','#1d303b','#172c30'][layer]:['#91a8ad','#759495','#597d7d','#335c5d'][layer]);
   if(d.theme==='mountains'&&d.snow)for(let i=2;i<pts.length-2;i+=3){const [x,y]=pts[i];poly(c,[[x-w*.04,y+h*.035],[x,y],[x+w*.04,y+h*.035]],'#e5ece8');}
  }
  if(d.theme==='forest')for(let i=0;i<36;i++){const x=random()*w,y=h*(.52+random()*.5),size=w*(.035+random()*.09);c.fillStyle='#1b3934';c.fillRect(x-size*.08,y-size*.2,size*.16,size*.5);for(let k=0;k<3;k++)poly(c,[[x-size*(.65-k*.15),y-k*size*.35],[x,y-size*(1.3+k*.3)],[x+size*(.65-k*.15),y-k*size*.35]],i%2?'#284c3e':'#385c49');}
 }
 if(d.theme==='ocean'){
  const sea=c.createLinearGradient(0,horizon,0,h);sea.addColorStop(0,d.night?'#273d65':'#80b9b4');sea.addColorStop(1,d.night?'#132132':'#295f73');c.fillStyle=sea;c.fillRect(0,horizon,w,h);
  for(let i=0;i<65;i++){let y=horizon+(h-horizon)*i/65;const amplitude=(y-horizon)*.018;c.beginPath();for(let x=0;x<=w;x+=w/35){const yy=y+Math.sin(x/w*12+at*1.4+i*.6)*amplitude;x?c.lineTo(x,yy):c.moveTo(x,yy);}c.strokeStyle=i%3===0?'#d8eee183':'#9acec742';c.lineWidth=w/720*(1+i/35);c.stroke();}
  poly(c,[[0,h*.87],[w*.25,h*.84],[w*.6,h*.92],[w,h*.97],[w,h],[0,h]],d.night?'#283642':'#ddc7a5');
 }
 if(d.theme==='city'){
  for(let layer=0;layer<3;layer++)for(let i=0;i<12;i++){
   const bw=w/10,bh=h*(.1+random()*.35),x=(i-1)*bw+w*.015*Math.sin(at*.1)*(layer+1),y=h*(.65+layer*.1)-bh;
   c.fillStyle=['#415066','#28374a','#172637'][layer];c.fillRect(x,y,bw*.95,h-y);
   for(let k=0;k<7;k++)for(let j=0;j<3;j++)if(random()>.42){c.fillStyle=d.night?(j%2?d.color:'#ead5a4'):'#879fa2';c.fillRect(x+bw*(.15+j*.23),y+(k+.6)*bh/7,bw*.08,bh*.045);}
  }
  c.fillStyle='#162633';c.fillRect(0,h*.86,w,h*.14);c.strokeStyle=d.color+'77';c.lineWidth=2*w/720;for(let j=0;j<16;j++){const x=random()*w;c.beginPath();c.moveTo(x,h*.87);c.lineTo(x+(x-w*.5)*.3,h);c.stroke();}
  for(let i=0;i<4;i++){const x=(w*(i/4)+at*w*.10)%w;gradient(c,x,h*.9,w*.09,d.color+'65');}
 }
 if(d.theme==='space'){
  c.fillStyle='#080e24';c.fillRect(-w,-h,w*3,h*3);gradient(c,w*.5,h*.4,w*.8,d.color+'33');for(let i=0;i<160;i++){const x=random()*w,y=random()*h;disk(c,x,y,(random()*1.5+.4)*w/720,'#f6eed5bb');}
  const x=w*.52+Math.sin(at*.15)*w*.03,y=h*.42,r=w*.30;
  const planet=c.createRadialGradient(x-r*.4,y-r*.4,r*.05,x,y,r);planet.addColorStop(0,d.color);planet.addColorStop(.45,'#698495');planet.addColorStop(1,'#111a35');disk(c,x,y,r,planet);
  c.save();c.translate(x,y);c.rotate(-.3);c.scale(1,.3);for(let i=0;i<8;i++){c.strokeStyle=d.color+(i%2?'68':'28');c.lineWidth=3*w/720;c.beginPath();c.arc(0,0,r*(1.25+i*.025),0,Math.PI*2);c.stroke();}c.restore();
  disk(c,w*.18,h*.2,w*.06,'#88949d');
 }
 if(['coffee','product'].includes(d.theme)){
  gradient(c,w*.5,h*.48,w*.65,d.sunset?'#ffca8566':d.color+'66');
  c.fillStyle=d.night?'#142527':'#8d8c7b';c.fillRect(0,h*.73,w,h*.27);
  c.save();c.translate(w*.5,h*.59);c.rotate(Math.sin(at*.25)*.025);
  c.save();c.scale(1,.23);disk(c,0,h*.55,w*.32,'#00000035');c.restore();
  if(d.theme==='coffee'){
   c.strokeStyle='#eee6d5';c.lineWidth=w*.04;c.beginPath();c.arc(w*.18,-h*.015,w*.11,-1.5,1.5);c.stroke();
   c.fillStyle='#efe7d4';c.beginPath();c.roundRect(-w*.22,-h*.12,w*.44,h*.25,[8*w/720,8*w/720,w*.1,w*.1]);c.fill();
   c.fillStyle='#704f39';c.beginPath();c.ellipse(0,-h*.11,w*.21,h*.03,0,0,Math.PI*2);c.fill();
   for(let i=0;i<3;i++){c.beginPath();const sx=(i-1)*w*.08;c.moveTo(sx,-h*.16);c.bezierCurveTo(sx+w*.07*Math.sin(at+i),-h*.24,sx-w*.05,-h*.30,sx+w*.04*Math.cos(at+i),-h*.36);c.strokeStyle='#f5eedd66';c.lineWidth=w*.007;c.stroke();}
  }else{
   const g=c.createLinearGradient(-w*.19,0,w*.19,0);g.addColorStop(0,'#496866');g.addColorStop(.35,d.color);g.addColorStop(1,'#50666c');c.fillStyle=g;c.beginPath();c.roundRect(-w*.2,-h*.17,w*.4,h*.35,w*.04);c.fill();c.fillStyle='#d8ceaf';c.fillRect(-w*.12,-h*.22,w*.24,h*.05);c.fillStyle='#f4efe2';c.fillRect(-w*.14,-h*.04,w*.28,h*.11);c.fillStyle='#47675d';c.textAlign='center';c.font=`${w*.035}px Georgia`;c.fillText('BAIL',0,h*.018);
  }
  c.restore();
 }
 if(d.theme==='abstract'){
  for(let i=0;i<7;i++){const x=random()*w,y=random()*h,r=w*(.05+random()*.18);gradient(c,x,y,r*1.5,d.color+'44');c.save();c.translate(x+Math.sin(at*.25+i)*w*.025,y);c.rotate(at*.1+i);c.strokeStyle=d.color+'99';c.lineWidth=w*.005;c.strokeRect(-r/2,-r/2,r,r);c.restore();}
 }
 if(d.rain)for(let i=0;i<120;i++){const x=random()*w,y=(random()*h+at*h*.6)%h;c.strokeStyle='#e7f2f744';c.lineWidth=w/720;c.beginPath();c.moveTo(x,y);c.lineTo(x-w*.015,y+h*.028);c.stroke();}
 if(d.snow)for(let i=0;i<90;i++){const x=(random()*w+Math.sin(at*.3+i)*w*.02+w)%w,y=(random()*h+at*h*.04)%h;disk(c,x,y,(random()*2+1)*w/720,'#f7fcf3aa');}
 const shade=c.createRadialGradient(w/2,h/2,w*.2,w/2,h/2,Math.max(w,h)*.65);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#06102065');c.fillStyle=shade;c.fillRect(0,0,w,h);c.fillStyle=style==='editorial'?'#fff3d532':style==='aurora'?'#6dc9bf20':style==='orbit'?'#816be62b':'#10281f18';c.fillRect(0,0,w,h);c.restore();return d;
}
