(()=>{'use strict';
const $=id=>document.getElementById(id);
const required=['renderBtn','renderSide','cancel','closeRender','save','rc','modal','status','gl'];
for(const id of required){if(!$(id)){console.error('R3D bootstrap missing element',id);return}}
let busy=false;
const renderCanvas=$('rc'),modal=$('modal');
async function runRender(){if(busy)return;window.R3DRenderer?.stopRealtimeInteraction?.();busy=true;document.documentElement.dataset.r3dFinalRenderComplete='0';$('renderBtn').disabled=$('renderSide').disabled=true;const head=document.querySelector('.renderHead b');if(head)head.textContent='R3D Final Render';$('status').textContent='Final render computing • progressive ray pass active';try{if(!window.R3DRenderer)throw new Error('R3DRenderer unavailable');await window.R3DRenderer.render();document.documentElement.dataset.r3dFinalRenderComplete='1';document.documentElement.dataset.r3dRenderView='final';$('status').textContent='Final render complete'}catch(e){console.error('R3D render failed',e);$('status').textContent='Render failed: '+(e?.message||e)}finally{busy=false;$('renderBtn').disabled=$('renderSide').disabled=false;updateModeButtons()}}
function cancel(){window.R3DRenderer?.cancel?.();busy=false;$('renderBtn').disabled=$('renderSide').disabled=false;$('status').textContent='Render cancelled';updateModeButtons()}
function realtimeMode(){if(busy)return;window.R3DRenderer?.startRealtimeInteraction?.();modal.style.display='flex';const head=document.querySelector('.renderHead b');if(head)head.textContent='R3D Realtime Interaction & Render';$('status').textContent='Realtime interaction ray render active';updateModeButtons()}
function finalMode(){if(busy)return;const ok=window.R3DRenderer?.showFinalResult?.();if(!ok){$('status').textContent='No final render result yet';return}modal.style.display='flex';const head=document.querySelector('.renderHead b');if(head)head.textContent='R3D Final Render Result';$('status').textContent='Showing final render result';updateModeButtons()}
const close=$('closeRender');
const realtimeBtn=document.createElement('button');realtimeBtn.id='realtimeInteractionBtn';realtimeBtn.textContent='Realtime Interaction & Render';
const finalBtn=document.createElement('button');finalBtn.id='finalResultBtn';finalBtn.textContent='Final Render Result';
close.parentNode.insertBefore(realtimeBtn,close);close.parentNode.insertBefore(finalBtn,close);
function updateModeButtons(){const view=document.documentElement.dataset.r3dRenderView||'';realtimeBtn.classList.toggle('active',view==='realtime');finalBtn.classList.toggle('active',view==='final');finalBtn.disabled=!window.R3DRenderer?.hasFinalResult?.()}
realtimeBtn.addEventListener('click',realtimeMode);finalBtn.addEventListener('click',finalMode);
$('renderBtn').addEventListener('click',runRender);$('renderSide').addEventListener('click',runRender);$('cancel').addEventListener('click',cancel);$('closeRender').addEventListener('click',()=>{window.R3DRenderer?.stopRealtimeInteraction?.();modal.style.display='none';updateModeButtons()});$('save').addEventListener('click',()=>{const a=document.createElement('a');a.download='R3D_Render.png';a.href=renderCanvas.toDataURL('image/png');a.click()});
window.addEventListener('error',e=>{console.error('R3D runtime error',e.error||e.message);$('status').textContent='Runtime error • see console'});
window.addEventListener('unhandledrejection',e=>{console.error('R3D unhandled rejection',e.reason);$('status').textContent='Async error • see console'});
document.documentElement.dataset.r3dBootstrap='1';
document.documentElement.dataset.r3dFinalRenderComplete='0';
document.documentElement.dataset.r3dRenderView='';
document.documentElement.dataset.r3dBuild='1.0.0-rc6';
$('backendLabel').textContent=navigator.gpu?'WebGL + WebGPU':'WebGL + CPU render fallback';
updateModeButtons();
})();
