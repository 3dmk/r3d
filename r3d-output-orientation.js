(()=>{'use strict';
const orig=window.R3DRenderer;
if(!orig)return;
function markCanvasUpright(){
  const c=document.getElementById('rc');
  if(!c||!c.width||!c.height)return false;
  c.dataset.r3dOrientation='upright';
  document.documentElement.dataset.r3dRenderOrientation='upright';
  return true;
}
/* Renderer and CPU recovery both generate top-origin rows already.
   Do not transform the finished canvas: a blanket flip makes the render
   disagree with the viewport/camera. Keep this final stage orientation-neutral. */
const wrapped={...orig};
wrapped.render=async(...args)=>{const ok=await orig.render(...args);markCanvasUpright();return ok};
wrapped.markCanvasUpright=markCanvasUpright;
window.R3DRenderer=wrapped;
})();
