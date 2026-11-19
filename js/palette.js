(function(){
var CMDS=[['Play / Pause',' ','Ctrl+Space'],['Next song','n','Ctrl+.'],['Previous song','p','Ctrl+,'],['Restart song','r',''],['Seek forward 10s','ArrowRight','Ctrl+Right'],['Seek back 10s','ArrowLeft','Ctrl+Left'],['Volume up','ArrowUp','Ctrl+Up'],['Volume down','ArrowDown','Ctrl+Down'],['Mute / unmute','m','Ctrl+M'],['A-B loop','l',''],['Fullscreen','f','']];
var HK={' ':' ','.':'n',',':'p','ArrowRight':'ArrowRight','ArrowLeft':'ArrowLeft','ArrowUp':'ArrowUp','ArrowDown':'ArrowDown','m':'m','M':'m'};
function key(k){window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}))}
function tab(name){var b=[].slice.call(document.querySelectorAll('.tab')).filter(function(x){return x.textContent.trim().toLowerCase().indexOf(name.toLowerCase())>=0})[0];if(b)b.click();return b}
function focusSearch(){tab('Search');setTimeout(function(){var i=document.querySelector('input.field');if(i){i.focus();i.select&&i.select()}},60)}
var box,inp,list,sel=0,rows=[];
function build(){
box=document.createElement('div');
box.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:none;align-items:flex-start;justify-content:center;padding-top:12vh';
var card=document.createElement('div');
card.style.cssText='width:min(480px,92vw);background:#16161d;color:#fff;border:1px solid #333;border-radius:14px;overflow:hidden;font:14px system-ui,sans-serif';
inp=document.createElement('input');inp.placeholder='Type a command...';
inp.style.cssText='width:100%;box-sizing:border-box;padding:14px;background:#0f0f14;color:#fff;border:0;border-bottom:1px solid #333;font-size:15px;outline:none';
list=document.createElement('div');list.style.cssText='max-height:50vh;overflow:auto';
card.appendChild(inp);card.appendChild(list);box.appendChild(card);document.body.appendChild(box);
box.addEventListener('click',function(e){if(e.target===box)close()});
inp.addEventListener('input',function(){sel=0;render()});
inp.addEventListener('keydown',function(e){
if(e.key==='Escape'){e.preventDefault();close()}
else if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(rows.length-1,sel+1);render()}
else if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,sel-1);render()}
else if(e.key==='Enter'){e.preventDefault();run(rows[sel])}
e.stopPropagation()},true)}
function all(){
var c=CMDS.map(function(x){return{n:x[0],h:x[2],f:function(){key(x[1])}}});
c.push({n:'Search for a song',h:'Ctrl+/',f:focusSearch});
[].slice.call(document.querySelectorAll('.tab')).forEach(function(b){var t=b.textContent.trim();if(t)c.push({n:'Go to '+t,h:'',f:function(){b.click()}})});
return c}
function render(){
var q=inp.value.toLowerCase();
rows=all().filter(function(c){return c.n.toLowerCase().indexOf(q)>=0});
if(sel>=rows.length)sel=0;
list.innerHTML='';
rows.forEach(function(c,i){
var r=document.createElement('div');
r.style.cssText='display:flex;justify-content:space-between;padding:12px 14px;cursor:pointer;'+(i===sel?'background:#2a2a38':'');
r.innerHTML='<span></span><small style="opacity:.6"></small>';
r.firstChild.textContent=c.n;r.lastChild.textContent=c.h;
r.addEventListener('click',function(){run(c)});
list.appendChild(r)})}
function open(){if(!box)build();box.style.display='flex';inp.value='';sel=0;render();inp.focus()}
function close(){if(box)box.style.display='none'}
function run(c){if(!c)return;close();setTimeout(c.f,30)}
function isOpen(){return box&&box.style.display!=='none'}
addEventListener('keydown',function(e){
if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
if(e.key==='k'||e.key==='K'){e.preventDefault();e.stopPropagation();isOpen()?close():open();return}
if(isOpen())return;
var t=e.target,inField=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA');
if(e.key==='/'){e.preventDefault();focusSearch();return}
var k=HK[e.key];if(!k)return;
if(inField&&k!==' ')return;
e.preventDefault();e.stopPropagation();key(k)},true);
})();
