(()=>{'use strict';
function rotateCanvas180(c=document.getElementById('rc')){
  if(!c||!c.width||!c.height)return false;
  const tmp=document.createElement('canvas');tmp.width=c.width;tmp.height=c.height;
  const t=tmp.getContext('2d');t.drawImage(c,0,0);
  const ctx=c.getContext('2d');ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.setTransform(-1,0,0,-1,c.width,c.height);ctx.drawImage(tmp,0,0);ctx.restore();
  c.dataset.r3dOrientation='upright';
  c.dataset.r3dOrientationFix='display-rotate180';
  document.documentElement.dataset.r3dRenderOrientation='upright';
  return true;
}
function drawOriented(ctx,src,w,h){
  if(!ctx||!src)return false;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.setTransform(-1,0,0,-1,w,h);ctx.drawImage(src,0,0,w,h);ctx.restore();
  return true;
}
function markCanvasUpright(){
  const c=document.getElementById('rc');if(!c)return false;
  c.dataset.r3dOrientation='upright';c.dataset.r3dOrientationFix='display-rotate180';
  document.documentElement.dataset.r3dRenderOrientation='upright';return true;
}
/* RC6: orientation is applied exactly once by the render presentation layer.
   Camera-ray math stays untouched. Progressive and final results call this
   same display transform, preventing wrapper-order races and double flips. */
window.R3DOutputOrientation={apply:rotateCanvas180,draw:drawOriented,mark:markCanvasUpright,mode:'display-rotate180'};
document.documentElement.dataset.r3dOrientationStage='display-rotate180';
})();
