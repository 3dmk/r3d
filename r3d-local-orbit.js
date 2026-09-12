(()=>{'use strict';
const canvas=document.getElementById('gl');
if(!canvas)return;
const FACTOR=2.0;
let active=false,lastX=0,lastY=0,injecting=false;
canvas.addEventListener('mousedown',e=>{
  if(e.altKey&&e.button===0){active=true;lastX=e.clientX;lastY=e.clientY;document.documentElement.dataset.r3dLocalOrbit='1';}
},true);
window.addEventListener('mouseup',e=>{if(e.button===0)active=false},true);
window.addEventListener('blur',()=>{active=false},true);
window.addEventListener('mousemove',e=>{
  if(!active||injecting||!e.isTrusted)return;
  const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
  if(!dx&&!dy)return;
  const extra=FACTOR-1;
  injecting=true;
  window.dispatchEvent(new MouseEvent('mousemove',{
    bubbles:false,cancelable:true,clientX:e.clientX+dx*extra,clientY:e.clientY+dy*extra,
    screenX:e.screenX,screenY:e.screenY,altKey:true,button:0,buttons:1
  }));
  injecting=false;
  e.stopImmediatePropagation();
  e.preventDefault();
},true);
window.R3DLocalOrbit={factor:FACTOR};
})();