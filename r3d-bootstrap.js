(()=>{'use strict';
const $=id=>document.getElementById(id);
const required=['renderBtn','renderSide','cancel','closeRender','save','rc','modal','status','gl'];
for(const id of required){if(!$(id)){console.error('R3D bootstrap missing element',id);return}}
let busy=false;
async function runRender(){if(busy)return;busy=true;$('renderBtn').disabled=$('renderSide').disabled=true;try{if(!window.R3DRenderer)throw new Error('R3DRenderer unavailable');await window.R3DRenderer.render()}catch(e){console.error('R3D render failed',e);$('status').textContent='Render failed: '+(e?.message||e)}finally{busy=false;$('renderBtn').disabled=$('renderSide').disabled=false}}
function cancel(){window.R3DRenderer?.cancel?.();$('status').textContent='Render cancelled'}
$('renderBtn').addEventListener('click',runRender);$('renderSide').addEventListener('click',runRender);$('cancel').addEventListener('click',cancel);$('closeRender').addEventListener('click',()=>{cancel();$('modal').style.display='none'});$('save').addEventListener('click',()=>{const a=document.createElement('a');a.download='R3D_Render.png';a.href=$('rc').toDataURL('image/png');a.click()});
window.addEventListener('error',e=>{console.error('R3D runtime error',e.error||e.message);$('status').textContent='Runtime error • see console'});
window.addEventListener('unhandledrejection',e=>{console.error('R3D unhandled rejection',e.reason);$('status').textContent='Async error • see console'});
document.documentElement.dataset.r3dBootstrap='1';
$('backendLabel').textContent=navigator.gpu?'WebGL + WebGPU':'WebGL + CPU render fallback';
})();