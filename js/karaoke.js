(function(){
'use strict';
if(!window.React||!window.htm||!window.ReactDOM)return;
const h=htm.bind(React.createElement),{useState}=React;
const AC=window.AudioContext||window.webkitAudioContext;
const KEY='tunex.karaoke';
let S;try{S=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){S={}}
S.on=S.on||{};if(S.vol==null)S.vol=.7;if(!S.bpm)S.bpm=120;
if(S.banner==null)S.banner='NOW SINGING';S.banner=String(S.banner).replace(/^[^A-Za-z0-9]+/,'');if(S.caption==null)S.caption='SING ALONG!';
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const rnd=Math.random;
/* ===== audio synth (no files needed) ===== */
const AX={c:null,m:null};let NB=null;
function ctx(){if(!AX.c){AX.c=new AC();AX.m=AX.c.createGain();AX.m.gain.value=S.vol;AX.m.connect(AX.c.destination)}if(AX.c.state==='suspended')AX.c.resume();return AX.c}
function nbuf(c){if(!NB){NB=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=rnd()*2-1}return NB}
function tone(f,type,d,v,to,at){const c=ctx(),o=c.createOscillator(),g=c.createGain(),t=c.currentTime+(at||0);o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AX.m);o.start(t);o.stop(t+d+.05)}
function nz(d,v,ft,f,q,at,atk){const c=ctx(),s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime+(at||0);s.buffer=nbuf(c);s.loop=true;fl.type=ft;fl.frequency.value=f;fl.Q.value=q||1;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+(atk||.005));g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(g);g.connect(AX.m);s.start(t,rnd());s.stop(t+d+.05)}
const kick=a=>tone(150,'sine',.3,.9,40,a),snare=a=>{nz(.2,.5,'highpass',1500,.7,a);tone(200,'triangle',.12,.4,120,a)},hat=a=>nz(.05,.3,'highpass',7000,1,a),tom=(f,a)=>tone(f,'sine',.35,.7,f*.5,a),crash=a=>nz(1.4,.4,'highpass',4000,.5,a);
const SF=[];const sf=(id,name,g,run)=>SF.push({id,name,g,type:'b',run});
/* Crowd */
sf('applause','Applause','Crowd',()=>{nz(3,.15,'bandpass',2500,.5,0,.3);for(let i=0;i<40;i++)nz(.12,.25,'bandpass',1500+rnd()*2500,.8,rnd()*3,.01)});
sf('cheer','Cheer','Crowd',()=>{nz(2,.35,'bandpass',900,2,0,.3);nz(2,.2,'bandpass',2200,3,0,.3);tone(500,'sawtooth',1.8,.05,700)});
sf('whistle','Whistle','Crowd',()=>{tone(1800,'sine',.5,.3,2800);tone(2800,'sine',.3,.25,2200,.5)});
sf('clap','Clap','Crowd',()=>{for(let i=0;i<3;i++)nz(.03,.6,'bandpass',1500,1.5,i*.012);nz(.15,.5,'bandpass',1500,1.5,.036)});
sf('camera','Camera flash','Crowd',()=>{nz(.04,.6,'highpass',3000,1);nz(.06,.5,'highpass',2000,1,.08)});
/* Drums */
sf('drumroll','Drum roll','Drums',()=>{for(let i=0;i<36;i++)nz(.07,.12+i*.008,'bandpass',250,1,i*.05,.002);crash(1.85);kick(1.85)});
sf('rimshot','Rimshot','Drums',()=>{kick(0);snare(.18);crash(.4)});
sf('crash','Cymbal crash','Drums',()=>crash(0));
sf('kick','Kick','Drums',()=>kick(0));
sf('snare','Snare','Drums',()=>snare(0));
sf('hat','Hi-hat','Drums',()=>hat(0));
sf('tom','Tom','Drums',()=>{tom(220,0);tom(160,.12);tom(110,.24)});
/* Fun */
sf('airhorn','Air horn','Fun',()=>{[440,554,659].forEach(f=>tone(f,'sawtooth',1.2,.15))});
sf('bell','Bell','Fun',()=>{tone(880,'sine',1.5,.4);tone(1760,'sine',1,.2);tone(2640,'sine',.6,.1)});
sf('ding','Ding','Fun',()=>tone(1320,'sine',.8,.4));
sf('buzzer','Wrong buzzer','Fun',()=>{tone(120,'sawtooth',.6,.3);tone(125,'square',.6,.2)});
sf('tada','Ta-da','Fun',()=>{tone(523,'triangle',.15,.35);tone(659,'triangle',.15,.35,0,.12);[523,659,784].forEach(f=>{tone(f,'triangle',.8,.3,0,.24);tone(f,'square',.8,.08,0,.24)})});
sf('fanfare','Fanfare','Fun',()=>{[[523,0,.12],[523,.15,.12],[523,.3,.12],[659,.5,.2],[523,.7,.12],[659,.85,.15],[784,1.05,.8]].forEach(n=>tone(n[0],'sawtooth',n[2]+.1,.2,0,n[1]))});
sf('coin','Coin','Fun',()=>{tone(988,'square',.08,.2);tone(1319,'square',.4,.2,0,.08)});
sf('laser','Laser','Fun',()=>tone(2000,'sawtooth',.25,.2,200));
sf('boom','Explosion','Fun',()=>{nz(1.5,.9,'lowpass',800,1,0,.005);tone(80,'sine',1,.8,25)});
sf('whoosh','Whoosh','Fun',()=>nz(1,.5,'bandpass',1000,1,0,.5));
sf('siren','Siren','Fun',()=>{tone(600,'sawtooth',.5,.2,1000);tone(1000,'sawtooth',.5,.2,600,.5)});
sf('trombone','Sad trombone','Fun',()=>{[[311,0],[294,.45],[277,.9]].forEach(n=>tone(n[0],'sawtooth',.4,.2,0,n[1]));tone(277,'sawtooth',1.2,.2,220,1.35)});
sf('scratch','Record scratch','Fun',()=>{nz(.3,.5,'bandpass',2000,4);tone(300,'sawtooth',.3,.15,1200)});
/* ===== particles canvas ===== */
const cv=document.createElement('canvas');cv.className='kxcv';document.body.appendChild(cv);
const X=cv.getContext('2d');let P=[],raf=0;
const sz=()=>{cv.width=innerWidth;cv.height=innerHeight};sz();addEventListener('resize',sz);
const CC=['#ff3d81','#3dc8ff','#ffe53d','#7cff3d','#b36bff','#ff9a3d'];
const PK={star:'stars',bub:'bubbles',heart:'hearts',snow:'snow'};
const prune=()=>{P=P.filter(p=>!PK[p.k]||S.on[PK[p.k]])};
function kickLoop(){if(!raf)raf=requestAnimationFrame(loop)}
function loop(){raf=0;const W=cv.width,H=cv.height,t=Date.now(),o=S.on;
if(o.bubbles&&rnd()<.12)P.push({k:'bub',x:rnd()*W,y:H+20,vx:0,vy:-(.6+rnd()*1.2),r:6+rnd()*16,l:1e4,w:rnd()*6});
if(o.hearts&&rnd()<.07)P.push({k:'heart',x:rnd()*W,y:H+20,vx:(rnd()-.5)*.6,vy:-(1+rnd()*1.5),r:16+rnd()*20,l:1e4,c:'hsl('+(320+rnd()*40|0)+',90%,62%)'});
if(o.snow&&rnd()<.5)P.push({k:'snow',x:rnd()*W,y:-10,vx:(rnd()-.5)*.8,vy:1+rnd()*1.5,r:1.5+rnd()*3,l:1e4});
if(o.stars){let n=0;for(const p of P)if(p.k==='star')n++;if(n<50)P.push({k:'star',x:rnd()*W,y:rnd()*H,vx:0,vy:0,r:1+rnd()*2,ph:rnd()*6,l:1e9})}
X.clearRect(0,0,W,H);
P=P.filter(p=>{p.x+=p.vx;p.y+=p.vy;if(p.g)p.vy+=p.g;if(p.d){p.vx*=p.d;p.vy*=p.d}p.l--;X.globalAlpha=1;
if(p.k==='conf'){p.a+=p.va;X.save();X.translate(p.x,p.y);X.rotate(p.a);X.fillStyle=p.c;X.fillRect(-p.r,-p.r/2,p.r*2,p.r);X.restore()}
else if(p.k==='spark'){X.globalAlpha=Math.max(0,Math.min(1,p.l/40));X.fillStyle=p.c;X.beginPath();X.arc(p.x,p.y,2.2,0,6.283);X.fill()}
else if(p.k==='bub'){const bx=p.x+Math.sin(t/400+p.w)*8;X.strokeStyle='rgba(255,255,255,.7)';X.lineWidth=1.5;X.fillStyle='rgba(255,255,255,.12)';X.beginPath();X.arc(bx,p.y,p.r,0,6.283);X.fill();X.stroke()}
else if(p.k==='heart'){X.fillStyle=p.c;{const s=p.r/2,x=p.x,y=p.y;X.beginPath();X.moveTo(x,y+s);X.bezierCurveTo(x-s*1.6,y-s*.2,x-s*.8,y-s*1.5,x,y-s*.5);X.bezierCurveTo(x+s*.8,y-s*1.5,x+s*1.6,y-s*.2,x,y+s);X.fill()}}
else if(p.k==='snow'){X.fillStyle='#fff';X.beginPath();X.arc(p.x,p.y,p.r,0,6.283);X.fill()}
else if(p.k==='star'){X.globalAlpha=.5+.5*Math.sin(t*.003+p.ph);X.fillStyle='#fff';X.beginPath();X.arc(p.x,p.y,p.r,0,6.283);X.fill()}
X.globalAlpha=1;return p.l>0&&p.y<H+40&&p.y>-60});
if(P.length||o.bubbles||o.hearts||o.snow||o.stars)raf=requestAnimationFrame(loop)}
function confetti(){const W=cv.width,H=cv.height;for(let i=0;i<140;i++){const L=i%2===0;P.push({k:'conf',x:L?0:W,y:H,vx:(L?1:-1)*(3+rnd()*9),vy:-(8+rnd()*12),g:.25,d:.992,l:170,r:4+rnd()*5,a:rnd()*6,va:(rnd()-.5)*.4,c:CC[rnd()*CC.length|0]})}kickLoop()}
function fireworks(){[0,250,500].forEach(dl=>setTimeout(()=>{const x=cv.width*(.15+rnd()*.7),y=cv.height*(.12+rnd()*.35),c=CC[rnd()*CC.length|0];for(let i=0;i<55;i++){const a=rnd()*6.283,s=1+rnd()*4;P.push({k:'spark',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:.04,d:.985,l:50+rnd()*30,c})}kickLoop()},dl));try{[0,250,500].forEach(d=>tone(900,'sawtooth',.4,.06,200,d/1000));[0,250,500].forEach(d=>nz(.4,.3,'lowpass',600,1,.4+d/1000))}catch(e){}}
function flash(){const d=document.createElement('div');d.className='kxflash';document.body.appendChild(d);setTimeout(()=>d.remove(),600)}
/* ===== 25 visuals ===== */
const VS=[];const vs=(id,name,g,type,run)=>VS.push({id,name,g,type,run});
vs('lights','Stage lights','Stage','t');vs('spot','Spotlight','Stage','t');vs('disco','Disco ball','Stage','t');vs('strobe','Strobe','Stage','t');
vs('laser','Laser beams','Stage','t');vs('beat','Beat flash','Stage','t');vs('curtains','Curtains','Stage','t');vs('glow','Edge glow','Stage','t');
vs('stars','Stars','Particles','t');vs('bubbles','Bubbles','Particles','t');vs('hearts','Hearts','Particles','t');vs('snow','Snow','Particles','t');
vs('confetti','Confetti','Particles','b',confetti);vs('fireworks','Fireworks','Particles','b',fireworks);vs('flash','Flash','Particles','b',flash);
vs('neon','Neon border','Mood','t');vs('vig','Vignette','Mood','t');vs('smoke','Smoke','Mood','t');vs('rainbow','Rainbow wash','Mood','t');vs('grid','Retro grid','Mood','t');
vs('eq','Equalizer','Mood','t');vs('banner','Banner','Mood','t');vs('caption','Big caption','Mood','t');vs('vinyl','Spinning disc','Mood','t');vs('crowd','Crowd','Mood','t');
const GS=['Crowd','Drums','Fun','Stage','Particles','Mood'],ALL=SF.concat(VS);
const PRE={Party:['lights','disco','laser','beat','crowd','stars'],Concert:['spot','vig','smoke','curtains','glow','banner'],Chill:['stars','smoke','vig','glow','bubbles'],Off:[]};
/* ===== styles ===== */
const css=`.kxfab{position:fixed;left:232px;bottom:12px;z-index:9998;border:0;border-radius:99px;padding:10px 16px;font:700 14px Inter,sans-serif;background:linear-gradient(135deg,#ec4899,#7c3aed);color:#fff;box-shadow:0 6px 20px #0004}
.kxsheet{position:fixed;top:0;bottom:0;right:0;width:min(440px,100vw);z-index:10002;box-sizing:border-box;background:var(--card,#fff);color:var(--ink,#14151f);overflow:auto;padding:12px 14px calc(16px + env(safe-area-inset-bottom));box-shadow:-8px 0 30px #0004;font:500 13px Inter,sans-serif}
.kxhd{display:flex;justify-content:space-between;align-items:center;font-size:16px;margin-bottom:8px}
.kxhd button,.kxrow button{border:1px solid var(--line,#e8eaf3);background:var(--bg,#f4f5fa);color:inherit;border-radius:99px;padding:6px 12px;margin:2px;font:600 12px Inter,sans-serif}
.kxrow{display:flex;flex-wrap:wrap;margin-bottom:6px}.kxrow button.act{background:var(--accent,#7c3aed);color:#fff}
.kxset{display:grid;grid-template-columns:70px 1fr 44px;gap:8px;align-items:center;padding:4px}.kxset input{width:100%;accent-color:var(--accent,#7c3aed)}.kxset em{font-style:normal;font-size:11px;color:var(--mute,#6b7085);text-align:right}
.kxgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
.kxb{border:1px solid var(--line,#e8eaf3);background:var(--bg,#f4f5fa);color:inherit;border-radius:12px;padding:12px 6px;font:600 12px Inter,sans-serif}.kxb:active{background:var(--accent,#7c3aed);color:#fff}.kxb.on{background:var(--accent,#7c3aed);color:#fff}
.kxtx{display:grid;grid-template-columns:70px 1fr;gap:8px;align-items:center;padding:4px;margin-top:6px}.kxtx input{padding:6px;border-radius:8px;border:1px solid var(--line,#e8eaf3);background:var(--bg,#f4f5fa);color:inherit}
.kxnote{color:var(--mute,#6b7085);font-size:11px;margin-top:10px}
.kxcv{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9991}
.kxl{position:fixed;inset:0;pointer-events:none;z-index:9990;overflow:hidden}.kxl>*{position:absolute}
.kxlights{inset:0;mix-blend-mode:screen}.kxlights i{top:-5%;width:22vw;height:115%;margin-left:-11vw;clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);opacity:.4;transform-origin:50% 0;animation:kxsw 3.2s ease-in-out infinite alternate}
@keyframes kxsw{from{transform:rotate(-22deg)}to{transform:rotate(22deg)}}
.kxspot{left:50%;top:55%;width:46vmin;height:46vmin;margin:-23vmin 0 0 -23vmin;border-radius:50%;box-shadow:0 0 0 200vmax rgba(0,0,0,.62);animation:kxsp 6s ease-in-out infinite alternate}
@keyframes kxsp{from{transform:translateX(-22vw)}to{transform:translateX(22vw)}}
.kxdisco{inset:0}.kxdisco::before{content:'';position:absolute;left:50%;top:0;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;background:repeating-conic-gradient(rgba(255,255,255,.14) 0 6deg,transparent 6deg 24deg);animation:kxrot 14s linear infinite;-webkit-mask-image:radial-gradient(circle,#000 0,transparent 30%);mask-image:radial-gradient(circle,#000 0,transparent 30%)}
.kxdisco b{position:absolute;left:50%;top:6px;transform:translateX(-50%);width:54px;height:54px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#9ab 40%,#234 100%);box-shadow:0 0 24px #fff9}
@keyframes kxrot{to{transform:rotate(360deg)}}@keyframes kxspin{to{transform:translateX(-50%) rotateY(360deg)}}
.kxstrobe{inset:0;background:#fff;opacity:0;animation:kxst .14s steps(1) infinite}@keyframes kxst{0%{opacity:.28}50%{opacity:0}}
.kxlaser i{left:50%;bottom:-2vh;width:2px;height:130vh;background:currentColor;transform-origin:50% 100%;box-shadow:0 0 8px 2px currentColor;animation:kxls 2.4s ease-in-out infinite alternate}
@keyframes kxls{from{transform:rotate(-65deg)}to{transform:rotate(65deg)}}
.kxbeat{inset:0;background:var(--accent,#7c3aed);opacity:0;animation:kxbt 1s ease-out infinite}@keyframes kxbt{0%{opacity:.3}100%{opacity:0}}
.kxcur{top:0;bottom:0;width:11vw;background:repeating-linear-gradient(90deg,#7a0010 0 14px,#b0132b 14px 28px);box-shadow:0 0 30px #000a;animation:kxop 1.6s ease-out both}.kxcur.l{left:0}.kxcur.r{right:0}
@keyframes kxop{from{width:50vw}to{width:11vw}}
.kxglow{inset:0;box-shadow:inset 0 0 90px 10px var(--accent,#7c3aed);animation:kxgl 1.2s ease-in-out infinite alternate}@keyframes kxgl{from{opacity:.35}to{opacity:1}}
.kxneon{inset:6px;border:3px solid #0ff;border-radius:18px;box-shadow:0 0 12px #0ff,inset 0 0 12px #0ff;animation:kxhue 6s linear infinite}@keyframes kxhue{to{filter:hue-rotate(360deg)}}
.kxvig{inset:0;background:radial-gradient(circle,transparent 45%,rgba(0,0,0,.75))}
.kxsmoke{inset:0}.kxsmoke i{position:absolute;bottom:-10vh;width:60vw;height:40vh;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.28),transparent 70%);filter:blur(18px);animation:kxsm 9s ease-in-out infinite alternate}
@keyframes kxsm{from{transform:translateX(-20vw)}to{transform:translateX(20vw) translateY(-6vh)}}
.kxrain{inset:0;mix-blend-mode:color;opacity:.35;background:linear-gradient(120deg,#f0f,#0ff,#ff0,#f0f);background-size:300% 300%;animation:kxrb 6s linear infinite}@keyframes kxrb{to{background-position:300% 0}}
.kxgrid2{left:-50%;right:-50%;bottom:0;height:42%;background:linear-gradient(transparent 94%,#f0f6 96%) 0 0/100% 40px,linear-gradient(90deg,transparent 94%,#0ff6 96%) 0 0/60px 100%;transform:perspective(300px) rotateX(55deg);transform-origin:bottom;animation:kxgd 1s linear infinite;opacity:.8}
@keyframes kxgd{to{background-position:0 40px,0 0}}
.kxeq{left:0;right:0;bottom:0;height:20vh;display:flex;align-items:flex-end;gap:3px;padding:0 6px}.kxeq i{flex:1;height:100%;background:linear-gradient(var(--accent,#7c3aed),#0ff);transform-origin:bottom;border-radius:3px 3px 0 0;opacity:.85;animation:kxeb .6s ease-in-out infinite alternate}
@keyframes kxeb{from{transform:scaleY(.08)}to{transform:scaleY(1)}}
.kxban{top:40px;left:50%;transform:translateX(-50%);padding:6px 18px;border-radius:99px;background:#000a;color:#fff;font:800 14px Inter,sans-serif;letter-spacing:.12em;box-shadow:0 0 20px var(--accent,#7c3aed);white-space:nowrap}
.kxcap{left:0;right:0;bottom:22vh;text-align:center;font:900 clamp(28px,8vw,72px) Inter,sans-serif;color:#fff;text-shadow:0 0 10px var(--accent,#7c3aed),0 0 30px var(--accent,#7c3aed),0 0 60px #fff;animation:kxpl 1.2s ease-in-out infinite alternate}
@keyframes kxpl{from{transform:scale(.96)}to{transform:scale(1.05)}}
.kxvin{right:14px;top:70px;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle,#eee 0 6%,var(--accent,#7c3aed) 7% 28%,transparent 29%),repeating-conic-gradient(#111 0 20deg,#2c2c2c 20deg 40deg);animation:kxrot 3s linear infinite}
.kxcrowd{left:0;right:0;bottom:0;display:flex;justify-content:space-around;font-size:34px;filter:drop-shadow(0 0 6px #000)}.kxcrowd i{position:relative;width:34px;height:40px;border-radius:17px 17px 0 0;background:#000d;animation:kxbob .7s ease-in-out infinite alternate}.kxcrowd i::before{content:'';position:absolute;left:7px;top:-18px;width:20px;height:20px;border-radius:50%;background:#000d}@keyframes kxbob{to{transform:translateY(-14px)}}
.kxflash{position:fixed;inset:0;background:#fff;z-index:10003;pointer-events:none;animation:kxfl .5s ease-out forwards}@keyframes kxfl{from{opacity:.9}to{opacity:0}}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
/* ===== React UI ===== */
const LC=['#f0f','#0ff','#0f0','#ff0','#f44','#48f'],BC=['ff3d81','3dc8ff','ffe53d','7cff3d'],CR=[0,1,2,3,4,5,6];
function App(){
const [open,setOpen]=useState(false),[g,setG]=useState('Crowd'),[,tick]=useState(0);
const re=()=>tick(x=>x+1),o=S.on;
const toggle=id=>{o[id]=!o[id];if(!o[id])prune();save();kickLoop()};
const preset=k=>{S.on={};PRE[k].forEach(i=>S.on[i]=true);prune();save();kickLoop();re()};
const item=it=>h`<button key=${it.id} className=${'kxb'+(it.type==='t'&&o[it.id]?' on':'')} onClick=${()=>{if(it.type==='t')toggle(it.id);else it.run();re()}}>${it.name}</button>`;
const txt=(k,label)=>h`<div className="kxtx" key=${k}><span>${label}</span><input type="text" key=${k+S[k]} defaultValue=${S[k]} onBlur=${e=>{S[k]=e.target.value;save();re()}}/></div>`;
return h`<div>
<div className="kxl">
${o.lights&&h`<div className="kxlights">${[0,1,2,3].map(i=>h`<i key=${i} style=${{left:(10+i*26)+'%',animationDelay:(-i*.8)+'s',background:'linear-gradient(#'+BC[i]+',transparent)'}}/>`)}</div>`}
${o.spot&&h`<div className="kxspot"/>`}
${o.disco&&h`<div className="kxdisco"><b></b></div>`}
${o.strobe&&h`<div className="kxstrobe"/>`}
${o.laser&&h`<div className="kxlaser">${LC.map((c,i)=>h`<i key=${i} style=${{color:c,animationDelay:(-i*.4)+'s',animationDuration:(2+i*.35)+'s'}}/>`)}</div>`}
${o.beat&&h`<div className="kxbeat" style=${{animationDuration:(60/S.bpm)+'s'}}/>`}
${o.neon&&h`<div className="kxneon"/>`}
${o.vig&&h`<div className="kxvig"/>`}
${o.smoke&&h`<div className="kxsmoke">${[0,1,2].map(i=>h`<i key=${i} style=${{left:(i*30-15)+'%',animationDelay:(-i*3)+'s'}}/>`)}</div>`}
${o.rainbow&&h`<div className="kxrain"/>`}
${o.grid&&h`<div className="kxgrid2"/>`}
${o.eq&&h`<div className="kxeq">${Array.from({length:28},(_,i)=>h`<i key=${i} style=${{animationDuration:(.35+((i*37)%10)/14)+'s',animationDelay:(-((i*13)%10)/10)+'s'}}/>`)}</div>`}
${o.glow&&h`<div className="kxglow"/>`}
${o.crowd&&h`<div className="kxcrowd">${CR.map((e,i)=>h`<i key=${i} style=${{animationDelay:(-i*.17)+'s'}}/>`)}</div>`}
${o.vinyl&&h`<div className="kxvin"/>`}
${o.caption&&h`<div className="kxcap">${S.caption}</div>`}
${o.banner&&h`<div className="kxban">${S.banner}</div>`}
${o.curtains&&h`<div><i className="kxcur l"/><i className="kxcur r"/></div>`}
</div>
<button className="kxfab" onClick=${()=>setOpen(!open)}>Karaoke</button>
${open&&h`<div className="kxsheet">
<div className="kxhd"><b>Karaoke · 50 effects</b><span><button onClick=${()=>preset('Off')}>Stop all</button><button onClick=${()=>setOpen(false)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span></div>
<div className="kxrow">${['Party','Concert','Chill'].map(k=>h`<button key=${k} onClick=${()=>preset(k)}>${k} mode</button>`)}</div>
<div className="kxset"><span>SFX vol</span><input type="range" min="0" max="1" step=".05" value=${S.vol} onInput=${e=>{S.vol=+e.target.value;if(AX.m)AX.m.gain.value=S.vol;save();re()}}/><em>${Math.round(S.vol*100)}%</em></div>
<div className="kxset"><span>BPM</span><input type="range" min="60" max="200" step="1" value=${S.bpm} onInput=${e=>{S.bpm=+e.target.value;save();re()}}/><em>${S.bpm}</em></div>
<div className="kxrow">${GS.map(x=>h`<button key=${x} className=${x===g?'act':''} onClick=${()=>setG(x)}>${x}</button>`)}</div>
<div className="kxgrid">${ALL.filter(i=>i.g===g).map(item)}</div>
${g==='Mood'&&h`<div>${txt('banner','Banner')}${txt('caption','Caption')}</div>`}
<p className="kxnote">Sounds are synthesized in the browser, so they are approximations. Strobe and Flash can trigger photosensitivity, so use with care.</p>
</div>`}
</div>`}
const root=document.createElement('div');document.body.appendChild(root);
ReactDOM.createRoot(root).render(h`<${App}/>`);
if(S.on.bubbles||S.on.hearts||S.on.snow||S.on.stars)kickLoop();
})();
