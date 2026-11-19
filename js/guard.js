(function(){
'use strict';
var SEL='.fxsheet,.stsheet,.kxsheet',EVS=['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','click'],done=new WeakSet();
function shield(sheet){
var r=sheet;while(r&&r.parentElement!==document.body)r=r.parentElement;
if(!r||done.has(r))return;done.add(r);
EVS.forEach(function(e){r.addEventListener(e,function(ev){ev.stopPropagation()},false)})}
new MutationObserver(function(){document.querySelectorAll(SEL).forEach(shield)}).observe(document.body,{childList:true,subtree:true});
if(/[?&]dbg=1/.test(location.search)){
var d=document.createElement('div');d.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483647;background:#000c;color:#0f0;font:11px monospace;padding:4px 8px;pointer-events:none;white-space:pre-wrap';document.body.appendChild(d);
function show(ev,t){var p=ev.touches&&ev.touches[0]||ev,x=p.clientX,y=p.clientY,el=document.elementFromPoint(x,y);
d.textContent=t+' @'+Math.round(x)+','+Math.round(y)+'\nhit: '+(el?el.tagName+'.'+String(el.className).slice(0,50):'none')+'\ntarget: '+(ev.target&&ev.target.tagName)+'.'+String(ev.target&&ev.target.className).slice(0,40)+'\nprevented: '+ev.defaultPrevented}
addEventListener('pointerdown',function(e){show(e,'down')},true);
addEventListener('click',function(e){show(e,'click')},true)}
})();
