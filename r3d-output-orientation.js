(()=>{'use strict';
const orig=window.R3DRenderer;
if(!orig)return;
function markCanvasUpright(){
  const c=document.getElementById('rc');
  if(!c||!c.width||!c.height)return false;
  c.dataset.r3dOrientation='upright';
  c.dataset.r3dOrientationFix='native-camera-basis';
  document.documentElement.dataset.r3dRenderOrientation='upright';
  return true;
}
/* The viewport picker and both renderer camera-ray generators use the same
   right/up basis. Do not rotate or mirror the finished canvas. Any extra
   display transform reverses a camera orientation that is already correct. */
const wrapped={...orig};
wrapped.render=async(...args)=>{const ok=await orig.render(...args);markCanvasUpright();return ok};
wrapped.markCanvasUpright=markCanvasUpright;
window.R3DRenderer=wrapped;
})();
