(()=>{'use strict';
const $=id=>document.getElementById(id);
if(!$('gl')||!$('status')||!window.R3DRenderer||!window.R3DRenderWindow){console.error('R3D RC7 bootstrap dependency missing');return;}
window.addEventListener('error',e=>{console.error('R3D runtime error',e.error||e.message);$('status').textContent='Runtime error • see console'});
window.addEventListener('unhandledrejection',e=>{console.error('R3D unhandled rejection',e.reason);$('status').textContent='Async error • see console'});
document.documentElement.dataset.r3dBootstrap='1';
document.documentElement.dataset.r3dBuild='1.0.0-rc7';
document.documentElement.dataset.r3dFinalRenderComplete='0';
$('backendLabel').textContent=navigator.gpu?'WebGL + WebGPU':'WebGL + CPU render fallback';
})();