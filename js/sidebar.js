(function(){
'use strict';
var SV='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
var TABS=[
{id:'fx',label:'FX',fab:'.fxfab',sheet:'.fxsheet',icon:SV+'<path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2"/></svg>'},
];
var NAMES=['Search','Queue','Saved','Mic','Look','More'];
var css='body.sbx-ok .fxfab,body.sbx-ok .stfab,body.sbx-ok .kxfab{display:none!important}'
+'body .fxsheet,body .stsheet,body .kxsheet{position:fixed!important;top:var(--sbT,0px)!important;left:var(--sbL,auto)!important;right:auto!important;bottom:auto!important;width:var(--sbW,440px)!important;height:var(--sbH,100vh)!important;max-width:100vw;border-radius:0 0 var(--r,16px) var(--r,16px)!important;box-shadow:none!important;z-index:9999!important}'
+'.sbx{cursor:pointer;flex:1 0 64px}'
+'.sbx.sbx-act{color:var(--accent,#7c3aed)!important;box-shadow:inset 0 -2px 0 var(--accent,#7c3aed)}'
+'.sbx-off{color:var(--mute,#6b7085)!important;box-shadow:none!important;border-color:transparent!important}'
+'.sbx-off::after,.sbx-off::before{display:none!important}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var bar=null,ours={},origs=[],tm=0;
function txt(e){return (e.textContent||'').replace(/\s+/g,' ').trim()}
function findBar(){var els=document.querySelectorAll('#root *');for(var i=0;i<els.length;i++){var c=els[i].children;if(c.length<6)continue;var ok=true;for(var k=0;k<6;k++){if(txt(c[k]).indexOf(NAMES[k])!==0){ok=false;break}}if(ok)return els[i]}return null}
function isOpen(t){return !!document.querySelector(t.sheet)}
function clickFab(t){var f=document.querySelector(t.fab);if(f)f.click()}
function closeAll(except){TABS.forEach(function(x){if(x!==except&&isOpen(x))clickFab(x)})}
function toggle(t){closeAll(t);clickFab(t);setTimeout(sync,60)}
function place(){if(!bar)return;var r=bar.getBoundingClientRect(),card=bar.parentElement;
while(card&&card!==document.body&&card.getBoundingClientRect().height<r.height+200)card=card.parentElement;
var bottom=Math.min(card?card.getBoundingClientRect().bottom:innerHeight,innerHeight),s=document.documentElement.style;
s.setProperty('--sbL',r.left+'px');s.setProperty('--sbT',r.bottom+'px');s.setProperty('--sbW',r.width+'px');s.setProperty('--sbH',Math.max(120,bottom-r.bottom)+'px')}
function sync(){var any=false;TABS.forEach(function(t){var o=isOpen(t);if(o)any=true;if(ours[t.id])ours[t.id].classList.toggle('sbx-act',o)});
origs.forEach(function(el){el.classList.toggle('sbx-off',any)});place()}
function inject(){
origs=[].slice.call(bar.children).filter(function(c){return !c.classList.contains('sbx')}).slice(0,6);
var cnt={};origs.forEach(function(c){cnt[c.className]=(cnt[c.className]||0)+1});
var tpl=origs[1],best=0;origs.forEach(function(c){if(cnt[c.className]>best){best=cnt[c.className];tpl=c}});
var tn=txt(tpl);
TABS.forEach(function(t){
if(ours[t.id]&&ours[t.id].parentNode)ours[t.id].parentNode.removeChild(ours[t.id]);
var el=tpl.cloneNode(true);el.removeAttribute('id');el.classList.add('sbx');el.setAttribute('type','button');el.setAttribute('aria-label',t.label);
var tmp=document.createElement('div');tmp.innerHTML=t.icon;var ni=tmp.firstChild,sv=el.querySelector('svg');
if(sv){['width','height','class','style'].forEach(function(a){if(sv.hasAttribute(a))ni.setAttribute(a,sv.getAttribute(a))});sv.parentNode.replaceChild(ni,sv)}else el.insertBefore(ni,el.firstChild);
var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),n,list=[];while(n=w.nextNode())list.push(n);
list.forEach(function(n){if(n.nodeValue.trim()===tn)n.nodeValue=t.label});
el.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggle(t)});
bar.appendChild(el);ours[t.id]=el});
if(!bar.__sbx){bar.__sbx=1;bar.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.sbx'))return;closeAll();setTimeout(sync,60)},true)}
bar.classList.add('sbx-bar');bar.style.overflowX='auto';bar.style.scrollbarWidth='none';
document.body.classList.add('sbx-ok')}
function ensure(){
var ok=bar&&bar.isConnected&&TABS.every(function(t){return ours[t.id]&&ours[t.id].isConnected});
if(!ok){bar=findBar();if(!bar){document.body.classList.remove('sbx-ok');return}inject()}
sync()}
new MutationObserver(function(){clearTimeout(tm);tm=setTimeout(ensure,80)}).observe(document.body,{childList:true,subtree:true});
addEventListener('resize',place);setInterval(function(){if(bar)place()},500);
setTimeout(ensure,300);
})();
