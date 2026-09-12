(()=>{'use strict';
const $=id=>document.getElementById(id),orig=window.R3DRenderer;
if(!orig)return;
function luma(){const c=$('rc');if(!c||!c.width||!c.height)return 0;const x=c.getContext('2d',{willReadFrequently:true});if(!x)return 0;const sx=Math.max(1,Math.floor(c.width/20)),sy=Math.max(1,Math.floor(c.height/12));let s=0,n=0;for(let y=Math.floor(sy/2);y<c.height;y+=sy)for(let q=Math.floor(sx/2);q<c.width;q+=sx){const p=x.getImageData(q,y,1,1).data;s+=(p[0]+p[1]+p[2])/3;n++}return n?s/n:0}
async function render(){const first=await orig.render();await new Promise(requestAnimationFrame);let L=luma();document.documentElement.dataset.r3dCoreFirstLuma=String(L.toFixed(3));document.documentElement.dataset.r3dCoreRetry='0';if(first!==false&&Number.isFinite(L)&&L>=2)return first;
if(!navigator.gpu)return first;
const ids=['adaptive','temporal','denoise'],old={};for(const id of ids){const e=$(id);if(e){old[id]=e.value;e.value='0'}}
try{document.documentElement.dataset.r3dCoreRetry='1';if($('renderBackend'))$('renderBackend').textContent='WebGPU Clean Retry';if($('renderInfo'))$('renderInfo').textContent='Retrying clean WebGPU path • adaptive/temporal/denoise off';const second=await orig.render();await new Promise(requestAnimationFrame);L=luma();document.documentElement.dataset.r3dCoreRetryLuma=String(L.toFixed(3));if(second!==false&&Number.isFinite(L)&&L>=2){document.documentElement.dataset.r3dCoreValidated='clean-webgpu';if($('renderBackend'))$('renderBackend').textContent='WebGPU Clean';return second}document.documentElement.dataset.r3dCoreValidated='failed';return second}finally{for(const id of ids){const e=$(id);if(e&&id in old)e.value=old[id]}}
}
const wrapped={...orig,render,luma};window.R3DRenderer=wrapped;document.documentElement.dataset.r3dCoreValidation='1';
})();