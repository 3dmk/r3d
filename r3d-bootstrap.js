(()=>{'use strict';
const $=id=>document.getElementById(id);
const required=['renderBtn','renderSide','cancel','closeRender','save','rc','modal','status','gl'];
for(const id of required){if(!$(id)){console.error('R3D bootstrap missing element',id);return}}
let busy=false,previewActive=false,previewRAF=0;
const glCanvas=$('gl'),renderCanvas=$('rc'),modal=$('modal');
function outputSize(){const ow=+($('rw')?.value||960),oh=Math.round(ow*.625);return{ow,oh}}
function fitDraw(ctx,src,dw,dh){const sw=Math.max(1,src.width),sh=Math.max(1,src.height),sa=sw/sh,da=dw/dh;let w=dw,h=dh,x=0,y=0;if(sa>da){h=dw/sa;y=(dh-h)*.5}else{w=dh*sa;x=(dw-w)*.5}ctx.fillStyle='#111';ctx.fillRect(0,0,dw,dh);ctx.drawImage(src,0,0,sw,sh,x,y,w,h)}
function previewFrame(){if(!previewActive)return;const {ow,oh}=outputSize();if(renderCanvas.width!==ow||renderCanvas.height!==oh){renderCanvas.width=ow;renderCanvas.height=oh}const ctx=renderCanvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';fitDraw(ctx,glCanvas,ow,oh);if(!busy){$('renderBackend').textContent='WebGL Raster';$('renderInfo').textContent=`Realtime raster preview • ${ow}×${oh}`;$('pct').textContent='LIVE';$('bar').style.width='100%';$('stats').textContent='Viewport-synced raster preview'}else{renderCanvas.dataset.r3dRasterDuringFinal='1'}renderCanvas.dataset.r3dRasterPreview='live';document.documentElement.dataset.r3dRasterPreview='1';previewRAF=requestAnimationFrame(previewFrame)}
function startPreview(force=false){if(busy&&!force)return;modal.style.display='flex';previewActive=true;const head=document.querySelector('.renderHead b');if(head&&!busy)head.textContent='R3D Realtime Raster Preview';if(!busy)$('status').textContent='Realtime raster preview';cancelAnimationFrame(previewRAF);previewFrame()}
function stopPreview(){previewActive=false;cancelAnimationFrame(previewRAF);previewRAF=0;renderCanvas.dataset.r3dRasterPreview='off';renderCanvas.dataset.r3dRasterDuringFinal='0';document.documentElement.dataset.r3dRasterPreview='0'}
async function runRender(){if(busy)return;startPreview(true);busy=true;$('renderBtn').disabled=$('renderSide').disabled=true;const head=document.querySelector('.renderHead b');if(head)head.textContent='R3D Final Render';$('status').textContent='Final render computing • raster preview stays live';try{if(!window.R3DRenderer)throw new Error('R3DRenderer unavailable');await window.R3DRenderer.render()}catch(e){console.error('R3D render failed',e);$('status').textContent='Render failed: '+(e?.message||e)}finally{stopPreview();busy=false;$('renderBtn').disabled=$('renderSide').disabled=false}}
function cancel(){stopPreview();window.R3DRenderer?.cancel?.();busy=false;$('renderBtn').disabled=$('renderSide').disabled=false;$('status').textContent='Render cancelled'}
const previewBtn=document.createElement('button');previewBtn.id='rasterPreviewBtn';previewBtn.textContent='Realtime Raster Preview';previewBtn.style.width='100%';previewBtn.style.marginBottom='6px';$('renderSide').before(previewBtn);previewBtn.addEventListener('click',()=>startPreview());
const headPreview=document.createElement('button');headPreview.id='rasterPreviewHead';headPreview.textContent='Raster Live';const close=$('closeRender');close.parentNode.insertBefore(headPreview,close);headPreview.addEventListener('click',()=>{if(previewActive&&!busy)stopPreview();else if(!previewActive)startPreview()});
$('renderBtn').addEventListener('click',runRender);$('renderSide').addEventListener('click',runRender);$('cancel').addEventListener('click',cancel);$('closeRender').addEventListener('click',()=>{cancel();modal.style.display='none'});$('save').addEventListener('click',()=>{const a=document.createElement('a');a.download='R3D_Render.png';a.href=renderCanvas.toDataURL('image/png');a.click()});
window.addEventListener('error',e=>{console.error('R3D runtime error',e.error||e.message);$('status').textContent='Runtime error • see console'});
window.addEventListener('unhandledrejection',e=>{console.error('R3D unhandled rejection',e.reason);$('status').textContent='Async error • see console'});
window.R3DRasterPreview={start:startPreview,stop:stopPreview,get active(){return previewActive},get rendering(){return busy}};
document.documentElement.dataset.r3dBootstrap='1';
document.documentElement.dataset.r3dRasterPreview='0';
$('backendLabel').textContent=navigator.gpu?'WebGL + WebGPU':'WebGL + CPU render fallback';
})();
