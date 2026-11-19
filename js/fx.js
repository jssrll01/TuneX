(function(){
'use strict';
var AC=window.AudioContext||window.webkitAudioContext;
if(!AC||!window.React||!window.htm||!window.ReactDOM)return;
var h=htm.bind(React.createElement),useState=React.useState;
var G=function(c,v){var g=c.createGain();g.gain.value=v==null?1:v;return g};
var BQ=function(c,t,f,q,g){var n=c.createBiquadFilter();n.type=t;n.frequency.value=f;if(q)n.Q.value=q;if(g)n.gain.value=g;return n};
var OSC=function(c,t,f){var o=c.createOscillator();o.type=t;o.frequency.value=f;o.start();return o};
var curve=function(fn){var n=2048,a=new Float32Array(n);for(var i=0;i<n;i++)a[i]=fn(i/(n-1)*2-1);return a};
var chain=function(){var a=arguments;for(var i=0;i<a.length-1;i++)a[i].connect(a[i+1]);return a[a.length-1]};
/* filters */
function F(parts){return function(c){var ns=parts.map(function(p){return BQ(c,p[0],1000,p[2])});for(var k=0;k<ns.length-1;k++)ns[k].connect(ns[k+1]);return{in:ns[0],out:ns[ns.length-1],set:function(v){parts.forEach(function(p,k){ns[k].frequency.value=p[1](v);if(p[3])ns[k].gain.value=p[3](v)})}}}}
function SER(){var ms=[].slice.call(arguments);return function(c){var es=ms.map(function(m){return m(c)});for(var k=0;k<es.length-1;k++)es[k].out.connect(es[k+1].in);return{in:es[0].in,out:es[es.length-1].out,set:function(v){es.forEach(function(e){e.set(v)})}}}}
function MIX(c,build,sc){var i=G(c),o=G(c),w=G(c,0);i.connect(o);build(c,i).connect(w);w.connect(o);return{in:i,out:o,mix:function(v){w.gain.value=v*(sc||1)}}}
/* distortion */
var DR={od:function(x){return Math.tanh(1.6*x)},dist:function(x){return Math.max(-1,Math.min(1,x*3))},fuzz:function(x){return x>0?Math.tanh(5*x):Math.tanh(2*x)*.7}};
function SH(kind,scale){return function(c){var pre=G(c),s=c.createWaveShaper(),post=G(c);s.curve=curve(DR[kind]);s.oversample='4x';chain(pre,s,post);return{in:pre,out:post,set:function(v){var d=Math.min(1,v/(scale||1));pre.gain.value=1+d*8;post.gain.value=.9/(1+d*1.2)}}}}
function CR(c){var s=c.createWaveShaper();return{in:s,out:s,set:function(b){var L=Math.pow(2,b-1);s.curve=curve(function(x){return Math.round(x*L)/L})}}}
function EX(c){var m=MIX(c,function(c,i){var hp=BQ(c,'highpass',3000),s=c.createWaveShaper();s.curve=curve(function(x){return Math.tanh(4*x)});i.connect(hp);hp.connect(s);return s});return{in:m.in,out:m.out,set:function(v){m.mix(v*.6)}}}
/* modulation */
function MD(build){return function(c){var m=MIX(c,build);return{in:m.in,out:m.out,set:m.mix}}}
var CH=MD(function(c,i){var d=c.createDelay(.1);d.delayTime.value=.025;var l=OSC(c,'sine',.9),g=G(c,.004);l.connect(g);g.connect(d.delayTime);i.connect(d);return d});
var FL=MD(function(c,i){var d=c.createDelay(.1),f=G(c,.55);d.delayTime.value=.004;var l=OSC(c,'sine',.25),g=G(c,.0025);l.connect(g);g.connect(d.delayTime);i.connect(d);d.connect(f);f.connect(d);return d});
var PH=MD(function(c,i){var l=OSC(c,'sine',.4),g=G(c,500),p=i;for(var k=0;k<4;k++){var a=BQ(c,'allpass',800+k*400,.7);g.connect(a.frequency);p.connect(a);p=a}l.connect(g);return p});
function VB(rate,depth){return function(c){var d=c.createDelay(.1);d.delayTime.value=.01;var l=OSC(c,'sine',rate),g=G(c,0);l.connect(g);g.connect(d.delayTime);return{in:d,out:d,set:function(v){g.gain.value=Math.min(1,v)*depth}}}}
function TR(type,rate){return function(c){var g=G(c),l=OSC(c,type,rate),lg=G(c,0);l.connect(lg);lg.connect(g.gain);return{in:g,out:g,set:function(v){g.gain.value=1-v/2;lg.gain.value=v/2}}}}
function AW(c){var p=BQ(c,'peaking',1200,6,0),l=OSC(c,'sine',1.6),g=G(c,0);l.connect(g);g.connect(p.frequency);return{in:p,out:p,set:function(v){p.gain.value=v*16;g.gain.value=300+v*900}}}
function RING(c){var g=G(c,0),o=OSC(c,'sine',50);o.connect(g.gain);return{in:g,out:g,set:function(v){o.frequency.value=v}}}
function AP(c){var p=c.createStereoPanner(),l=OSC(c,'sine',.7),g=G(c,0);l.connect(g);g.connect(p.pan);return{in:p,out:p,set:function(v){g.gain.value=v}}}
/* time */
function DL(time,fb,lp){return MD2(function(c,i){var d=c.createDelay(2),f=G(c,fb);d.delayTime.value=time;i.connect(d);if(lp){var t=BQ(c,'lowpass',lp);d.connect(t);t.connect(f)}else d.connect(f);f.connect(d);return d})}
function MD2(b){return MD(b)}
var PONG=MD(function(c,i){var a=c.createDelay(2),b=c.createDelay(2),f=G(c,.5),m=c.createChannelMerger(2);a.delayTime.value=.28;b.delayTime.value=.28;i.connect(a);a.connect(b);b.connect(f);f.connect(a);a.connect(m,0,0);b.connect(m,0,1);return m});
function WD(c){var i=G(c),o=c.createChannelMerger(2),d=c.createDelay(.1);i.connect(o,0,0);i.connect(d);d.connect(o,0,1);return{in:i,out:o,set:function(v){d.delayTime.value=v/1000}}}
function IR(c,sec,dec,lp){var r=c.sampleRate,n=Math.floor(r*sec),b=c.createBuffer(2,n,r);for(var ch=0;ch<2;ch++){var d=b.getChannelData(ch),y=0;for(var i=0;i<n;i++){y+=((Math.random()*2-1)*Math.pow(1-i/n,dec)-y)*lp;d[i]=y}}return b}
function REV(sec,dec,lp,sc){return function(c){var m=MIX(c,function(c,i){var cv=c.createConvolver();cv.buffer=IR(c,sec,dec,lp);i.connect(cv);return cv},sc||1);return{in:m.in,out:m.out,set:m.mix}}}
/* pitch (granular delay-line shifter) */
function PS(c){var sp=c.createScriptProcessor(2048,1,1),N=16384,M=N-1,buf=new Float32Array(N),w=0,ph=0,W=1536,r=1;
function rd(x){var f=Math.floor(x),a=x-f;return buf[f&M]*(1-a)+buf[(f+1)&M]*a}
sp.onaudioprocess=function(e){var a=e.inputBuffer.getChannelData(0),o=e.outputBuffer.getChannelData(0),inc=(1-r)/W;for(var i=0;i<a.length;i++){buf[w&M]=a[i];var p2=ph+.5;if(p2>=1)p2-=1;o[i]=rd(w-ph*W-1)*Math.sin(Math.PI*ph)+rd(w-p2*W-1)*Math.sin(Math.PI*p2);w++;ph+=inc;if(ph>=1)ph-=1;else if(ph<0)ph+=1}};
return{node:sp,rate:function(x){r=x}}}
function PI(sign){return function(c){var p=PS(c);return{in:p.node,out:p.node,set:function(v){p.rate(Math.pow(2,sign*v/12))}}}}
function HM(c){var p,m=MIX(c,function(c,i){p=PS(c);i.connect(p.node);return p.node});m.mix(.8);return{in:m.in,out:m.out,set:function(v){p.rate(Math.pow(2,v/12))}}}
/* dynamics */
function CP(c){var k=c.createDynamicsCompressor(),m=G(c);k.knee.value=20;k.attack.value=.005;k.release.value=.2;k.connect(m);return{in:k,out:m,set:function(v){k.threshold.value=-12-v*36;k.ratio.value=2+v*10;m.gain.value=1+v*1.2}}}
function LM(c){var k=c.createDynamicsCompressor();k.ratio.value=20;k.knee.value=0;k.attack.value=.001;k.release.value=.08;return{in:k,out:k,set:function(v){k.threshold.value=v}}}
function NG(c){var sp=c.createScriptProcessor(1024,1,1),th=.003,env=0,gn=0;sp.onaudioprocess=function(e){var a=e.inputBuffer.getChannelData(0),o=e.outputBuffer.getChannelData(0);for(var i=0;i<a.length;i++){var x=Math.abs(a[i]);env=x>env?x:env*.9995;var t=env>th?1:0;gn+=(t-gn)*(t>gn?.01:.0008);o[i]=a[i]*gn}};return{in:sp,out:sp,set:function(v){th=Math.pow(10,v/20)}}}
function BO(c){var g=G(c);return{in:g,out:g,set:function(v){g.gain.value=Math.pow(10,v/20)}}}
/* the 50 effects */
function E(id,name,g,min,max,step,def,unit,make){return{id:id,name:name,g:g,min:min,max:max,step:step,def:def,unit:unit,make:make}}
var T='Tone',C='Character',P='Pitch',M='Modulation',D='Drive',S_='Space',Y='Dynamics';
var FX=[
E('lowcut','Low cut',T,20,400,1,100,' Hz',F([['highpass',function(v){return v}]])),
E('highcut','High cut',T,3000,16000,100,12000,' Hz',F([['lowpass',function(v){return v}]])),
E('bass','Bass boost',T,0,1,.01,.5,'',F([['lowshelf',function(){return 150},0,function(v){return v*12}]])),
E('treble','Treble boost',T,0,1,.01,.5,'',F([['highshelf',function(){return 5000},0,function(v){return v*12}]])),
E('presence','Presence',T,0,1,.01,.5,'',F([['peaking',function(){return 3200},1,function(v){return v*10}]])),
E('warmth','Warmth',T,0,1,.01,.5,'',F([['peaking',function(){return 220},.9,function(v){return v*8}]])),
E('demud','De-mud',T,0,1,.01,.5,'',F([['peaking',function(){return 350},1.2,function(v){return -v*12}]])),
E('air','Air',T,0,1,.01,.5,'',F([['highshelf',function(){return 12000},0,function(v){return v*10}]])),
E('nasal','Nasal',T,0,1,.01,.5,'',F([['peaking',function(){return 1100},1.5,function(v){return v*12}]])),
E('deess','De-esser',T,0,1,.01,.5,'',F([['peaking',function(){return 6500},3,function(v){return -v*14}]])),
E('phone','Telephone',C,0,1,.01,.5,'',F([['highpass',function(v){return 300+v*500},.7],['lowpass',function(v){return 4200-v*1800},.7]])),
E('radio','Radio',C,0,1,.01,.5,'',SER(F([['highpass',function(v){return 300+v*300},.7],['lowpass',function(v){return 4000-v*1000},.7]]),SH('od'))),
E('mega','Megaphone',C,0,1,.01,.6,'',SER(F([['highpass',function(v){return 500+v*200},.7],['peaking',function(){return 2000},2,function(){return 8}],['lowpass',function(){return 3500},.7]]),SH('dist'))),
E('under','Underwater',C,0,1,.01,.6,'',SER(F([['lowpass',function(v){return 1400-v*1000},.9]]),VB(2.5,.003))),
E('muffle','Muffled',C,0,1,.01,.5,'',F([['lowpass',function(v){return 3000-v*2600},.7]])),
E('whisper','Whisper',C,0,1,.01,.5,'',SER(F([['highpass',function(v){return 1500+v*1500},.7]]),SH('fuzz'))),
E('pitch','Pitch shift',P,-12,12,1,3,' st',PI(1)),
E('deep','Deep voice',P,0,12,1,5,' st',PI(-1)),
E('chip','Chipmunk',P,0,12,1,5,' st',PI(1)),
E('harm','Harmonizer',P,3,12,1,7,' st',HM),
E('monster','Monster',P,0,12,1,7,' st',SER(PI(-1),F([['lowpass',function(v){return 3200-v*140},.8]]),SH('od',12))),
E('chorus','Chorus',M,0,1,.01,.5,'',CH),
E('flanger','Flanger',M,0,1,.01,.5,'',FL),
E('phaser','Phaser',M,0,1,.01,.5,'',PH),
E('vib','Vibrato',M,0,1,.01,.5,'',VB(5.5,.004)),
E('trem','Tremolo',M,0,1,.01,.5,'',TR('sine',5)),
E('wah','Auto-wah',M,0,1,.01,.6,'',AW),
E('robot','Robot (ring mod)',M,20,1000,1,60,' Hz',RING),
E('alien','Alien',M,200,1200,10,450,' Hz',SER(VB(8,.002),RING)),
E('pan','Auto-pan',M,0,1,.01,.8,'',AP),
E('od','Overdrive',D,0,1,.01,.4,'',SH('od')),
E('dist','Distortion',D,0,1,.01,.5,'',SH('dist')),
E('fuzz','Fuzz',D,0,1,.01,.5,'',SH('fuzz')),
E('crush','Bitcrusher',D,2,12,1,6,' bit',CR),
E('exciter','Exciter',D,0,1,.01,.5,'',EX),
E('stutter','Stutter',D,0,1,.01,1,'',TR('square',8)),
E('slap','Slapback',S_,0,1,.01,.4,'',DL(.09,.12)),
E('echo','Echo',S_,0,1,.01,.4,'',DL(.35,.4)),
E('pong','Ping-pong delay',S_,0,1,.01,.4,'',PONG),
E('tape','Tape delay',S_,0,1,.01,.4,'',DL(.4,.5,2200)),
E('wide','Stereo widener',S_,5,30,1,15,' ms',WD),
E('room','Room reverb',S_,0,1,.01,.3,'',REV(.7,3,.5)),
E('hall','Hall reverb',S_,0,1,.01,.3,'',REV(2.4,2.5,.7)),
E('cathedral','Cathedral reverb',S_,0,1,.01,.3,'',REV(4.8,2,.6)),
E('plate','Plate reverb',S_,0,1,.01,.3,'',REV(1.5,3.5,1)),
E('cave','Cave reverb',S_,0,1,.01,.3,'',REV(3.2,2.2,.25)),
E('comp','Compressor',Y,0,1,.01,.5,'',CP),
E('limit','Limiter',Y,-12,0,1,-3,' dB',LM),
E('gate','Noise gate',Y,-70,-20,1,-50,' dB',NG),
E('boost','Mic boost',Y,-12,18,1,6,' dB',BO)
];
var GR=[T,C,P,M,D,S_,Y];
var PRE={'Studio':{lowcut:90,demud:.4,presence:.5,air:.4,deess:.4,comp:.5,room:.25},'Stage':{lowcut:100,warmth:.4,presence:.4,comp:.6,chorus:.3,hall:.4,echo:.2},'Radio DJ':{bass:.5,presence:.5,comp:.8,limit:-3},'Robot':{robot:60,room:.15},'Monster':{monster:7,cave:.4},'Chipmunk':{chip:7},'Phone':{phone:.5},'Alien':{alien:450,pong:.3},'Choir':{cathedral:.5,chorus:.4,harm:7}};
/* state */
var S;try{S=JSON.parse(localStorage.getItem('tunex.fx'))||{}}catch(e){S={}}
S.on=S.on||{};S.val=S.val||{};
function save(){try{localStorage.setItem('tunex.fx',JSON.stringify(S))}catch(e){}}
function val(f){var v=S.val[f.id];return v==null?f.def:v}
var live=null;
function apply(){if(!live)return;FX.forEach(function(f,k){live.st[k].set(!!S.on[f.id],val(f))})}
function stage(c,f){var i=G(c),o=G(c),e=f.make(c),act=false;i.connect(o);return{in:i,out:o,set:function(on,v){e.set(v);if(on&&!act){i.disconnect(o);i.connect(e.in);e.out.connect(o);act=true}else if(!on&&act){i.disconnect(e.in);try{e.out.disconnect(o)}catch(x){}i.connect(o);act=false}}}}
function build(c){var i=G(c),o=G(c),st=FX.map(function(f){return stage(c,f)}),p=i;st.forEach(function(s){p.connect(s.in);p=s.out});p.connect(o);return{in:i,out:o,st:st}}
/* hook: route the mic source through the FX chain */
var orig=AC.prototype.createMediaStreamSource;
AC.prototype.createMediaStreamSource=function(){var c=this,src=orig.apply(c,arguments),ch=build(c),nc=src.connect.bind(src),nd=src.disconnect.bind(src);nc(ch.in);
src.connect=function(){return ch.out.connect.apply(ch.out,arguments)};
src.disconnect=function(){try{ch.out.disconnect()}catch(e){}try{nd()}catch(e){}};
live=ch;apply();return src};
/* UI */
var css='.fxfab{position:fixed;left:12px;bottom:12px;z-index:9998;border:0;border-radius:99px;padding:10px 16px;font:700 14px Inter,sans-serif;background:var(--accent,#7c3aed);color:#fff;box-shadow:0 6px 20px #0004}.fxsheet{position:fixed;top:0;bottom:0;right:0;width:min(440px,100vw);z-index:9999;background:var(--card,#fff);color:var(--ink,#14151f);overflow:auto;padding:12px 14px calc(16px + env(safe-area-inset-bottom));box-shadow:-8px 0 30px #0004;font:500 13px Inter,sans-serif}.fxhd{display:flex;justify-content:space-between;align-items:center;font-size:16px;margin-bottom:8px}.fxhd button,.fxrow button{border:1px solid var(--line,#e8eaf3);background:var(--bg,#f4f5fa);color:inherit;border-radius:99px;padding:6px 12px;margin:2px;font:600 12px Inter,sans-serif}.fxrow{display:flex;flex-wrap:wrap;margin-bottom:6px}.fxrow button.act{background:var(--accent,#7c3aed);color:#fff}.fxit{display:grid;grid-template-columns:1fr 1.2fr 56px;gap:8px;align-items:center;padding:8px 6px;border-bottom:1px solid var(--line,#e8eaf3)}.fxit.on{background:color-mix(in srgb,var(--accent,#7c3aed) 10%,transparent);border-radius:10px}.fxit label{display:flex;gap:8px;align-items:center;font-weight:600}.fxit input[type=range]{width:100%;accent-color:var(--accent,#7c3aed)}.fxit em{font-style:normal;color:var(--mute,#6b7085);font-size:11px;text-align:right}.fxnote{color:var(--mute,#6b7085);font-size:11px;margin-top:10px}';
function App(){
var a=useState(false),open=a[0],setOpen=a[1],b=useState(GR[0]),tab=b[0],setTab=b[1],t=useState(0);
var re=function(){t[1](function(x){return x+1})};
var n=FX.filter(function(f){return S.on[f.id]}).length;
function reset(){S.on={};S.val={};save();apply();re()}
function preset(k){S.on={};S.val={};var p=PRE[k];for(var id in p){S.on[id]=true;S.val[id]=p[id]}save();apply();re()}
return h`<div>
<button className="fxfab" onClick=${function(){setOpen(!open)}}>🎛 FX${n?' · '+n:''}</button>
${open&&h`<div className="fxsheet">
<div className="fxhd"><b>Voice FX · 50 effects</b><span><button onClick=${reset}>Reset</button><button onClick=${function(){setOpen(false)}}>✕</button></span></div>
<div className="fxrow">${Object.keys(PRE).map(function(k){return h`<button key=${k} onClick=${function(){preset(k)}}>${k}</button>`})}</div>
<div className="fxrow">${GR.map(function(g){return h`<button key=${g} className=${g===tab?'act':''} onClick=${function(){setTab(g)}}>${g}</button>`})}</div>
${FX.filter(function(f){return f.g===tab}).map(function(f){return h`<div key=${f.id} className=${'fxit'+(S.on[f.id]?' on':'')}>
<label><input type="checkbox" checked=${!!S.on[f.id]} onChange=${function(e){S.on[f.id]=e.target.checked;save();apply();re()}}/><span>${f.name}</span></label>
<input type="range" min=${f.min} max=${f.max} step=${f.step} value=${val(f)} onInput=${function(e){S.val[f.id]=+e.target.value;S.on[f.id]=true;save();apply();re()}}/>
<em>${val(f)}${f.unit}</em></div>`})}
<p className="fxnote">Start the mic first, then toggle effects live. Use headphones to avoid feedback.</p>
</div>`}
</div>`}
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var root=document.createElement('div');document.body.appendChild(root);
ReactDOM.createRoot(root).render(h`<${App}/>`);
})();
