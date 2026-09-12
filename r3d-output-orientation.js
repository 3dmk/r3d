(()=>{'use strict';
const orig=window.R3DRenderer;
if(!orig)return;
function rotateCanvas180(){
  const c=document.getElementById('rc');
  if(!c||!c.width||!c.height)return false;
  const tmp=document.createElement('canvas');
  tmp.width=c.width;tmp.height=c.height;
  const t=tmp.getContext('2d');
  t.drawImage(c,0,0);
  const ctx=c.getContext('2d');
  ctx.save();
  ctx.setTransform(-1,0,0,-1,c.width,c.height);
  ctx.clearRect(0,0,c.width,c.height);
  ctx.drawImage(tmp,0,0);
  ctx.restore();
  c.dataset.r3dOrientation='upright';
  c.dataset.r3dOrientationFix='rotate180';
  document.documentElement.dataset.r3dRenderOrientation='upright';
  return true;
}
function markCanvasUpright(){
  const c=document.getElementById('rc');
  if(!c||!c.width||!c.height)return false;
  c.dataset.r3dOrientation='upright';
  document.documentElement.dataset.r3dRenderOrientation='upright';
  return true;
}
/* The renderer output currently arrives inverted on both axes relative to the
   viewport (equivalent to a 180-degree rotation). Correct the finished pixel
   buffer once, after rendering, without changing viewport/camera controls. */
const wrapped={...orig};
wrapped.render=async(...args)=>{const ok=await orig.render(...args);rotateCanvas180();return ok};
wrapped.rotateCanvas180=rotateCanvas180;
wrapped.markCanvasUpright=markCanvasUpright;
window.R3DRenderer=wrapped;
})();
