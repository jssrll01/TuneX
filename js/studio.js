(function(){
'use strict';
if(!window.React||!window.htm||!window.ReactDOM)return;
const h=htm.bind(React.createElement),{useState,useEffect}=React;
const KEY='tunex.studio',ORIG=document.title;
let S;try{S=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){S={}}
S.t=S.t||{};S.v=S.v||{};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
/* control the YouTube player through its iframe (no patching) */
let PL=null;
const IFR=()=>document.querySelector('iframe[src*="youtube"]');
const YI={};
const ytc=(f,a)=>{const i=IFR();if(i&&i.contentWindow)i.contentWindow.postMessage(JSON.stringify({event:'command',func:f,args:a||[]}),'*')};
addEventListener('message',e=>{if(String(e.origin).indexOf('youtube')<0)return;let d=e.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(x){return}}if(!d)return;if(d.event==='infoDelivery'&&d.info)Object.assign(YI,d.info);else if(d.event==='onStateChange')YI.playerState=d.info});
const SHIM={getPlayerState:()=>YI.playerState==null?-1:YI.playerState,getCurrentTime:()=>YI.currentTime||0,getDuration:()=>YI.duration||0,getVolume:()=>YI.volume==null?100:YI.volume,getPlaybackRate:()=>YI.playbackRate||1,isMuted:()=>!!YI.muted};
['playVideo','pauseVideo','mute','unMute'].forEach(n=>{SHIM[n]=()=>ytc(n)});
SHIM.seekTo=(t,b)=>ytc('seekTo',[t,b]);SHIM.setVolume=v=>ytc('setVolume',[v]);SHIM.setPlaybackRate=r=>ytc('setPlaybackRate',[r]);
setInterval(()=>{const i=IFR();if(i&&i.contentWindow){PL=SHIM;i.contentWindow.postMessage(JSON.stringify({event:'listening',id:1,channel:'widget'}),'*')}else PL=null},1000);
/* helpers */
const bus=new Set();let msg='';
const toast=m=>{msg=m;bus.forEach(f=>f());setTimeout(()=>{if(msg===m){msg='';bus.forEach(f=>f())}},2200)};
const K=key=>{const code=key===' '?'Space':key.length===1?'Key'+key.toUpperCase():key;document.body.dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true,cancelable:true}))};
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const st=()=>{try{return PL.getPlayerState()}catch(e){return -1}};
const cur=()=>{try{return PL.getCurrentTime()||0}catch(e){return 0}};
const dur=()=>{try{return PL.getDuration()||0}catch(e){return 0}};
const gvol=()=>{try{return PL.getVolume()}catch(e){return 100}};
const grate=()=>{try{return PL.getPlaybackRate()}catch(e){return 1}};
const seek=t=>{if(PL)PL.seekTo(Math.max(0,Math.min(dur()||1e9,t)),true)};
const rel=d=>seek(cur()+d);
const vol=v=>{if(PL){PL.unMute();PL.setVolume(Math.max(0,Math.min(100,Math.round(v))))}};
const rate=r=>{if(PL)PL.setPlaybackRate(Math.max(.25,Math.min(2,r)))};
let fadeT=null;
function fade(to,sec,from){clearInterval(fadeT);from=from==null?gvol():from;const n=Math.max(1,sec*20);let i=0;fadeT=setInterval(()=>{i++;vol(from+(to-from)*i/n);if(i>=n)clearInterval(fadeT)},50)}
let sleepT=null,sleepEnd=0,A=null,B=null,wl=null;
function sleep(min){clearTimeout(sleepT);sleepEnd=Date.now()+min*6e4;sleepT=setTimeout(()=>{fade(0,5);setTimeout(()=>{try{PL.pauseVideo()}catch(e){}vol(100);sleepEnd=0},5200)},min*6e4-5000>0?min*6e4-5000:0)}
async function wake(on){try{if(on){wl=await navigator.wakeLock.request('screen')}else if(wl){await wl.release();wl=null}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(S.t.wake&&document.visibilityState==='visible')wake(true)});
document.addEventListener('click',e=>{if(S.t.haptic&&navigator.vibrate&&e.target.closest&&e.target.closest('button'))navigator.vibrate(12)},true);
setInterval(()=>{if(!PL)return;const c=cur(),d=dur();if(S.t.abloop&&A!=null&&B!=null&&B>A&&c>=B)seek(A);else if(S.t.rep&&d>3&&d-c<.7&&st()===1)seek(0)},250);
/* ===== 50 CONTROLS ===== */
const CT=[];const add=(id,name,g,type,o)=>CT.push(Object.assign({id,name,g,type},o));
const T1='Transport',T2='Seek',T3='Speed',T4='Volume',T5='Loop & More';
add('pp','Play / Pause',T1,'b',{run:()=>st()===1?PL.pauseVideo():PL.playVideo(),key:' '});
add('play','Play',T1,'b',{run:()=>PL.playVideo()});
add('pause','Pause',T1,'b',{run:()=>PL.pauseVideo()});
add('stop','Stop',T1,'b',{run:()=>{PL.pauseVideo();seek(0)}});
add('restart','Restart',T1,'b',{run:()=>{seek(0);PL.playVideo()},key:'r'});
add('next','Next song',T1,'b',{key:'n'});
add('prev','Previous song',T1,'b',{key:'p'});
add('b5','Back 5s',T1,'b',{run:()=>rel(-5)});
add('b10','Back 10s',T1,'b',{run:()=>rel(-10),key:'ArrowLeft'});
add('f10','Forward 10s',T1,'b',{run:()=>rel(10),key:'ArrowRight'});
add('f30','Forward 30s',T2,'b',{run:()=>rel(30)});
add('b30','Back 30s',T2,'b',{run:()=>rel(-30)});
add('pos','Position',T2,'s',{min:0,max:100,step:1,get:()=>dur()?cur()/dur()*100:0,run:v=>seek(dur()*v/100),fmt:v=>Math.round(v)+'%'});
add('j25','Jump to 25%',T2,'b',{run:()=>seek(dur()*.25)});
add('j50','Jump to 50%',T2,'b',{run:()=>seek(dur()*.5)});
add('j75','Jump to 75%',T2,'b',{run:()=>seek(dur()*.75)});
add('end','Near the end',T2,'b',{run:()=>seek(dur()-5)});
add('rand','Random spot',T2,'b',{run:()=>seek(Math.random()*dur()*.9)});
add('intro','Skip intro (15s)',T2,'b',{run:()=>seek(15)});
add('f1','Nudge +1s',T2,'b',{run:()=>rel(1)});
add('spd','Speed',T3,'s',{min:.25,max:2,step:.25,get:grate,run:rate,fmt:v=>v+'x'});
add('spu','Speed up',T3,'b',{run:()=>rate(grate()+.25)});
add('spd2','Speed down',T3,'b',{run:()=>rate(grate()-.25)});
add('sp1','Normal 1x',T3,'b',{run:()=>rate(1)});
add('sp05','0.5x',T3,'b',{run:()=>rate(.5)});
add('sp075','0.75x',T3,'b',{run:()=>rate(.75)});
add('sp125','1.25x',T3,'b',{run:()=>rate(1.25)});
add('sp15','1.5x',T3,'b',{run:()=>rate(1.5)});
add('vol','Volume',T4,'s',{min:0,max:100,step:1,get:gvol,run:vol,fmt:v=>Math.round(v)+'%'});
add('vu','Volume +10',T4,'b',{run:()=>vol(gvol()+10),key:'ArrowUp'});
add('vd','Volume −10',T4,'b',{run:()=>vol(gvol()-10),key:'ArrowDown'});
add('mute','Mute / Unmute',T4,'b',{run:()=>PL.isMuted()?PL.unMute():PL.mute(),key:'m'});
add('vmax','Max volume',T4,'b',{run:()=>vol(100)});
add('v25','Volume 25%',T4,'b',{run:()=>vol(25)});
add('v50','Volume 50%',T4,'b',{run:()=>vol(50)});
add('v75','Volume 75%',T4,'b',{run:()=>vol(75)});
add('fout','Fade out (3s)',T4,'b',{run:()=>fade(0,3)});
add('fin','Fade in (3s)',T4,'b',{run:()=>{vol(0);fade(100,3,0)}});
add('seta','Set loop A',T5,'b',{run:()=>{A=cur()}});
add('setb','Set loop B',T5,'b',{run:()=>{B=cur()}});
add('clr','Clear loop points',T5,'b',{free:1,run:()=>{A=null;B=null}});
add('abloop','Loop A–B',T5,'t',{});
add('rep','Repeat song',T5,'t',{});
add('sl15','Sleep 15 min',T5,'b',{free:1,run:()=>sleep(15)});
add('sl30','Sleep 30 min',T5,'b',{free:1,run:()=>sleep(30)});
add('sl60','Sleep 60 min',T5,'b',{free:1,run:()=>sleep(60)});
add('slc','Cancel sleep',T5,'b',{free:1,run:()=>{clearTimeout(sleepT);sleepEnd=0}});
add('fs','Fullscreen',T5,'b',{free:1,run:()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{})}});
add('wake','Keep screen awake',T5,'t',{on:wake});
add('haptic','Haptic taps',T5,'t',{});
function exec(it,arg){try{if(it.free||(PL&&it.run))it.run(arg);else if(it.key)K(it.key);else toast('Player not detected yet - start a song first')}catch(e){toast('Failed: '+it.name)}}
CT.forEach(it=>{if(it.type==='t'&&S.t[it.id]&&it.on)it.on(true)});
/* ===== 50 CUSTOMIZATIONS ===== */
const R=':root,body,#root,.app,.screen';
const imp=o=>Object.keys(o).map(k=>k+':'+o[k]+'!important').join(';');
const TH={Dark:{'--bg':'#12131a','--card':'#1c1d28','--ink':'#f1f2f8','--mute':'#9a9eb5','--line':'#2b2d3d'},AMOLED:{'--bg':'#000','--card':'#0b0b0b','--ink':'#f5f5f5','--mute':'#8a8a8a','--line':'#222'},Sepia:{'--bg':'#f4ecd8','--card':'#fbf5e6','--ink':'#433422','--mute':'#8a7a62','--line':'#e2d6b8'},Ocean:{'--bg':'#0b1f33','--card':'#12304d','--ink':'#e6f3ff','--mute':'#8fb3d1','--line':'#1d4568'}};
const AC={Violet:'#7c3aed',Pink:'#ec4899',Blue:'#2563eb',Teal:'#0d9488',Orange:'#f97316',Red:'#ef4444',Green:'#16a34a',Gold:'#d4a017'};
const GR={Sunset:'linear-gradient(135deg,#ff9a76,#ff5e8a,#7c3aed)',Aurora:'linear-gradient(135deg,#0f2027,#2c5364,#00c9a7)',Midnight:'linear-gradient(160deg,#0f0c29,#302b63,#24243e)',Candy:'linear-gradient(135deg,#fbc2eb,#a6c1ee)'};
const FONTS={Inter:'Inter,sans-serif',System:'system-ui,sans-serif',Serif:'Georgia,serif',Mono:'ui-monospace,Menlo,monospace',Rounded:'ui-rounded,"Segoe UI",sans-serif'};
const SHD={None:'none',Soft:'0 4px 14px #0002',Strong:'0 12px 36px #0006',Glow:'0 0 24px var(--accent)'};
const vr=n=>v=>v?R+'{'+n+':'+v+'!important}':'';
const pos=(sel,v,off)=>{const top=/Top/.test(v),left=/left/.test(v);return sel+'{left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;'+(top?'top':'bottom')+':12px!important;'+(left?'left':'right')+':'+off+'px!important}'};
const CU=[];const u=(id,name,g,t,def,o)=>CU.push(Object.assign({id,name,g,t,def},o));
const U1='Colors',U2='Text',U3='Layout',U4='Effects',U5='Panels';
u('theme','Theme mode',U1,'select','Default',{opts:['Default','Dark','AMOLED','Sepia','Ocean'],css:v=>TH[v]?R+'{'+imp(TH[v])+'}':''});
u('preset','Accent preset',U1,'select','Default',{opts:['Default'].concat(Object.keys(AC)),css:v=>AC[v]?R+'{--accent:'+AC[v]+'!important}':''});
u('accent','Accent color',U1,'color','',{fb:'#7c3aed',css:vr('--accent')});
u('bg','Background color',U1,'color','',{fb:'#f4f5fa',css:vr('--bg')});
u('card','Card color',U1,'color','',{fb:'#ffffff',css:vr('--card')});
u('ink','Text color',U1,'color','',{fb:'#14151f',css:vr('--ink')});
u('mute','Muted text color',U1,'color','',{fb:'#6b7085',css:vr('--mute')});
u('line','Border color',U1,'color','',{fb:'#e8eaf3',css:vr('--line')});
u('grad','Gradient background',U1,'select','None',{opts:['None'].concat(Object.keys(GR)),css:v=>GR[v]?'html,body{background:'+GR[v]+'!important;background-attachment:fixed!important}.app,.screen{background:transparent!important}':''});
u('bgimg','Background image URL',U1,'text','',{ph:'https://...',css:v=>v?'html,body{background:url("'+v.replace(/["()\s]/g,'')+'") center/cover fixed!important}.app,.screen{background:transparent!important}':''});
u('font','Font family',U2,'select','Inter',{opts:Object.keys(FONTS),css:v=>v==='Inter'?'':'body,button,input,select,textarea,.fxsheet,.stsheet,.fxfab,.stfab{font-family:'+FONTS[v]+'!important}'});
u('fsize','Base font size (0 = auto)',U2,'range',0,{min:0,max:22,step:1,unit:'px',css:v=>v?'body{font-size:'+v+'px!important}':''});
u('fw','Font weight',U2,'select','Default',{opts:['Default','400','500','600','700','800'],css:v=>v!=='Default'?'body,button,input{font-weight:'+v+'!important}':''});
u('ls','Letter spacing',U2,'range',0,{min:-1,max:3,step:.1,unit:'px',css:v=>v?'body{letter-spacing:'+v+'px!important}':''});
u('lh','Line height (0 = auto)',U2,'range',0,{min:0,max:2,step:.05,css:v=>v?'body{line-height:'+v+'!important}':''});
u('upper','Uppercase headings',U2,'toggle',false,{css:v=>v?'.h,h1,h2,h3,h4,label{text-transform:uppercase!important}':''});
u('tshadow','Text shadow',U2,'toggle',false,{css:v=>v?'#root{text-shadow:0 1px 3px #0005}':''});
u('ulink','Underline links',U2,'toggle',false,{css:v=>v?'a{text-decoration:underline!important}':''});
u('scale','UI scale',U3,'range',100,{min:60,max:140,step:5,unit:'%',css:v=>v!==100?'#root{zoom:'+v/100+'}':''});
u('radius','Corner radius',U3,'range',16,{min:0,max:32,step:1,unit:'px',css:v=>v!==16?R+'{--r:'+v+'px!important}':''});
u('bw','Border width',U3,'range',0,{min:0,max:4,step:1,unit:'px',css:v=>v?'#root button,#root input,#root select{border-width:'+v+'px!important;border-style:solid;border-color:var(--line)}':''});
u('bs','Border style',U3,'select','Solid',{opts:['Solid','Dashed','Dotted','Double'],css:v=>v!=='Solid'?'#root button,#root input,#root select{border-style:'+v.toLowerCase()+'!important}':''});
u('btnh','Button min height (0 = auto)',U3,'range',0,{min:0,max:72,step:2,unit:'px',css:v=>v?'#root button{min-height:'+v+'px!important}':''});
u('shadow','Shadow style',U3,'select','Default',{opts:['Default'].concat(Object.keys(SHD)),css:v=>SHD[v]?R+'{--shadow:'+SHD[v]+'!important}':''});
u('thumb','Thumbnail shape',U3,'select','Default',{opts:['Default','Square','Rounded','Circle'],css:v=>({Square:'0',Rounded:'14px',Circle:'50%'})[v]?'#root img{border-radius:'+({Square:'0',Rounded:'14px',Circle:'50%'})[v]+'!important}':''});
u('nothumb','Hide thumbnails',U3,'toggle',false,{css:v=>v?'#root img{display:none!important}':''});
u('maxw','Max content width (0 = off)',U3,'range',0,{min:0,max:1400,step:20,unit:'px',css:v=>v?'#root{max-width:'+v+'px;margin:0 auto}':''});
u('pad','Page padding',U3,'range',0,{min:0,max:40,step:2,unit:'px',css:v=>v?'#root{padding:'+v+'px!important}':''});
u('bright','Brightness',U4,'range',100,{min:50,max:150,step:5,unit:'%',flt:v=>'brightness('+v+'%)'});
u('contrast','Contrast',U4,'range',100,{min:50,max:150,step:5,unit:'%',flt:v=>'contrast('+v+'%)'});
u('sat','Saturation',U4,'range',100,{min:0,max:200,step:5,unit:'%',flt:v=>'saturate('+v+'%)'});
u('hue','Hue rotate',U4,'range',0,{min:0,max:360,step:5,unit:'°',flt:v=>'hue-rotate('+v+'deg)'});
u('gray','Grayscale',U4,'range',0,{min:0,max:100,step:5,unit:'%',flt:v=>'grayscale('+v+'%)'});
u('sepia','Sepia',U4,'range',0,{min:0,max:100,step:5,unit:'%',flt:v=>'sepia('+v+'%)'});
u('blur','Blur',U4,'range',0,{min:0,max:6,step:.5,unit:'px',flt:v=>'blur('+v+'px)'});
u('invert','Invert colors',U4,'toggle',false,{flt:v=>v?'invert(1) hue-rotate(180deg)':''});
u('trans','Transition time (0 = auto)',U4,'range',0,{min:0,max:800,step:50,unit:'ms',css:v=>v?'#root *{transition-duration:'+v+'ms!important}':''});
u('noanim','Disable animations',U4,'toggle',false,{css:v=>v?'*,*::before,*::after{animation:none!important;transition:none!important}':''});
u('fxpos','FX button position',U5,'select','Bottom left',{opts:['Bottom left','Bottom right','Top left','Top right'],css:v=>v==='Bottom left'?'':pos('.fxfab',v,12)});
u('fxsize','FX button size',U5,'range',100,{min:70,max:150,step:5,unit:'%',css:v=>v!==100?'.fxfab,.stfab{zoom:'+v/100+'}':''});
u('fxhide','Hide FX button',U5,'toggle',false,{css:v=>v?'.fxfab{display:none!important}':''});
u('side','Panel side',U5,'select','Right',{opts:['Right','Left'],css:v=>v==='Left'?'.fxsheet,.stsheet{right:auto!important;left:0!important}':''});
u('pw','Panel width',U5,'range',440,{min:280,max:700,step:10,unit:'px',css:v=>v!==440?'.fxsheet,.stsheet{width:min('+v+'px,100vw)!important}':''});
u('po','Panel opacity',U5,'range',100,{min:40,max:100,step:5,unit:'%',css:v=>v!==100?'.fxsheet,.stsheet{opacity:'+v/100+'}':''});
u('stpos','Studio button position',U5,'select','Next to FX',{opts:['Next to FX','Bottom right','Top left','Top right'],css:v=>v==='Next to FX'?'':pos('.stfab',v,120)});
u('stfade','Fade Studio button',U5,'toggle',false,{css:v=>v?'.stfab{opacity:.2}':''});
u('title','Page title',U5,'text','',{ph:ORIG,ap:v=>{document.title=v||ORIG}});
u('tcolor','Browser theme color',U5,'color','',{fb:'#ffffff',ap:v=>{const m=document.querySelector('meta[name=theme-color]');if(m)m.content=v||'#ffffff'}});
u('clock','Show clock overlay',U5,'toggle',false,{});
u('orient','Lock orientation',U5,'select','Free',{opts:['Free','Landscape','Portrait'],ap:v=>{try{if(v==='Free')screen.orientation.unlock();else screen.orientation.lock(v.toLowerCase()).catch(()=>{})}catch(e){}}});
const cv=f=>S.v[f.id]==null?f.def:S.v[f.id];
const sty=document.createElement('style');document.head.appendChild(sty);
function build(){const o=[];CU.forEach(f=>{if(f.css){const s=f.css(cv(f));if(s)o.push(s)}});
const fl=CU.filter(f=>f.flt).map(f=>{const v=cv(f);return v===f.def?'':f.flt(v)}).filter(Boolean).join(' ');
if(fl)o.push('#root{filter:'+fl+'}');sty.textContent=o.join('\n')}
const applyOne=f=>{try{f.ap&&f.ap(cv(f))}catch(e){}};
build();CU.forEach(f=>{if(f.ap&&cv(f)!==f.def)applyOne(f)});
/* UI */
const base=`.stfab{position:fixed;left:120px;bottom:12px;z-index:9998;border:0;border-radius:99px;padding:10px 16px;font:700 14px Inter,sans-serif;background:var(--ink,#14151f);color:var(--card,#fff);box-shadow:0 6px 20px #0004}
.stsheet{position:fixed;top:0;bottom:0;right:0;width:min(440px,100vw);z-index:10000;box-sizing:border-box;background:var(--card,#fff);color:var(--ink,#14151f);overflow:auto;padding:12px 14px calc(16px + env(safe-area-inset-bottom));box-shadow:-8px 0 30px #0004;font:500 13px Inter,sans-serif}
.sthd{display:flex;justify-content:space-between;align-items:center;font-size:16px;margin-bottom:8px}
.sthd button,.strow button{border:1px solid var(--line,#e8eaf3);background:var(--bg,#f4f5fa);color:inherit;border-radius:99px;padding:6px 12px;margin:2px;font:600 12px Inter,sans-serif}
.strow{display:flex;flex-wrap:wrap;margin-bottom:6px}.strow button.act{background:var(--accent,#7c3aed);color:#fff}
.ststat{font-size:11px;color:var(--mute,#6b7085);margin:4px 0 8px}
.stgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.stbtn{border:1px solid var(--line,#e8eaf3);background:var(--bg,#f4f5fa);color:inherit;border-radius:12px;padding:11px 6px;font:600 12px Inter,sans-serif}.stbtn:active{background:var(--accent,#7c3aed);color:#fff}
.stsl{grid-column:1/-1;display:grid;grid-template-columns:80px 1fr 46px;gap:8px;align-items:center;padding:6px 4px}
.stsl input,.stcu input[type=range]{width:100%;accent-color:var(--accent,#7c3aed)}.stsl em{font-style:normal;font-size:11px;color:var(--mute,#6b7085);text-align:right}
.sttg{grid-column:1/-1;display:flex;gap:8px;align-items:center;padding:9px 6px;border-radius:10px;font-weight:600}.sttg.on{background:color-mix(in srgb,var(--accent,#7c3aed) 12%,transparent)}
.stcu{display:grid;grid-template-columns:1fr 1.2fr 30px;gap:8px;align-items:center;padding:7px 4px;border-bottom:1px solid var(--line,#e8eaf3)}
.stcu small{color:var(--mute,#6b7085);margin-left:4px}.stcu select,.stcu input[type=text]{width:100%;box-sizing:border-box;padding:5px;border-radius:8px;border:1px solid var(--line,#e8eaf3);background:var(--bg,#f4f5fa);color:inherit}
.stcu input[type=color]{width:100%;height:30px;border:0;background:none;padding:0}.strs{border:0;background:none;color:var(--mute,#6b7085);font-size:16px}
.stclock{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9997;font:700 16px Inter,sans-serif;color:var(--ink,#14151f);background:var(--card,#fff);padding:4px 12px;border-radius:99px;box-shadow:0 4px 14px #0003;pointer-events:none}
.sttoast{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:10001;background:#111;color:#fff;padding:8px 14px;border-radius:99px;font:600 12px Inter,sans-serif}`;
const bs=document.createElement('style');bs.textContent=base;document.head.appendChild(bs);
const CG=[T1,T2,T3,T4,T5],UG=[U1,U2,U3,U4,U5];
function App(){
const [open,setOpen]=useState(false),[mode,setMode]=useState('c'),[gc,setGc]=useState(CG[0]),[gu,setGu]=useState(UG[0]),[,tick]=useState(0);
const re=()=>tick(x=>x+1);
useEffect(()=>{bus.add(re);return()=>bus.delete(re)},[]);
useEffect(()=>{if(!open&&!S.v.clock)return;const i=setInterval(re,500);return()=>clearInterval(i)},[open,S.v.clock]);
const stat=()=>PL?fmt(cur())+' / '+fmt(dur())+' · vol '+Math.round(gvol())+'% · '+grate()+'x'+(A!=null?' · A '+fmt(A):'')+(B!=null?' B '+fmt(B):'')+(sleepEnd?' · sleep '+Math.ceil((sleepEnd-Date.now())/6e4)+'m':''):'Player not detected - start a song (key shortcuts still work)';
const ctl=it=>{
if(it.type==='s')return h`<div key=${it.id} className="stsl"><span>${it.name}</span><input type="range" min=${it.min} max=${it.max} step=${it.step} value=${it.get()} onChange=${e=>{exec(it,+e.target.value);re()}}/><em>${it.fmt(it.get())}</em></div>`;
if(it.type==='t')return h`<label key=${it.id} className=${'sttg'+(S.t[it.id]?' on':'')}><input type="checkbox" checked=${!!S.t[it.id]} onChange=${e=>{S.t[it.id]=e.target.checked;save();it.on&&it.on(e.target.checked);re()}}/><span>${it.name}</span></label>`;
return h`<button key=${it.id} className="stbtn" onClick=${()=>{exec(it);re()}}>${it.name}</button>`};
const cus=it=>{const v=cv(it),set=x=>{S.v[it.id]=x;save();build();applyOne(it);re()};let inp;
if(it.t==='color')inp=h`<input type="color" value=${v||it.fb} onChange=${e=>set(e.target.value)}/>`;
else if(it.t==='range')inp=h`<input type="range" min=${it.min} max=${it.max} step=${it.step||1} value=${v} onChange=${e=>set(+e.target.value)}/>`;
else if(it.t==='select')inp=h`<select value=${v} onChange=${e=>set(e.target.value)}>${it.opts.map(o=>h`<option key=${o} value=${o}>${o}</option>`)}</select>`;
else if(it.t==='toggle')inp=h`<input type="checkbox" checked=${!!v} onChange=${e=>set(e.target.checked)}/>`;
else inp=h`<input type="text" key=${it.id+':'+v} defaultValue=${v} placeholder=${it.ph||''} onBlur=${e=>set(e.target.value)}/>`;
return h`<div key=${it.id} className="stcu"><span>${it.name}<small>${it.t==='range'?v+(it.unit||''):''}</small></span>${inp}<button className="strs" onClick=${()=>{delete S.v[it.id];save();build();applyOne(it);re()}}>↺</button></div>`};
const resetAll=()=>{if(mode==='c'){rate(1);vol(100);A=B=null;clearTimeout(sleepT);sleepEnd=0;wake(false);S.t={};save()}else{S.v={};save();build();CU.forEach(applyOne)}re()};
const groups=mode==='c'?CG:UG,g=mode==='c'?gc:gu,setG=mode==='c'?setGc:setGu;
return h`<div>
<button className="stfab" onClick=${()=>setOpen(!open)}>Studio</button>
${S.v.clock&&h`<div className="stclock">${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>`}
${msg&&h`<div className="sttoast">${msg}</div>`}
${open&&h`<div className="stsheet">
<div className="sthd"><b>Studio</b><span><button onClick=${resetAll}>Reset</button><button onClick=${()=>setOpen(false)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span></div>
<div className="strow"><button className=${mode==='c'?'act':''} onClick=${()=>setMode('c')}>Controls · 50</button><button className=${mode==='u'?'act':''} onClick=${()=>setMode('u')}>Customize · 50</button></div>
<div className="strow">${groups.map(x=>h`<button key=${x} className=${x===g?'act':''} onClick=${()=>setG(x)}>${x}</button>`)}</div>
${mode==='c'&&h`<div className="ststat">${stat()}</div><div className="stgrid">${CT.filter(i=>i.g===g).map(ctl)}</div>`}
${mode==='u'&&h`<div>${CU.filter(i=>i.g===g).map(cus)}</div>`}
</div>`}
</div>`}
const root=document.createElement('div');document.body.appendChild(root);
ReactDOM.createRoot(root).render(h`<${App}/>`);
})();
