(()=>{'use strict';
const native=EventTarget.prototype.addEventListener;
let armed=true;
document.documentElement.dataset.r3dInputPriority='1';
EventTarget.prototype.addEventListener=function(type,listener,options){
  const capture=options===true||!!(options&&typeof options==='object'&&options.capture);
  if(armed&&this instanceof HTMLCanvasElement&&this.id==='gl'&&type==='mousedown'&&capture){
    armed=false;
    EventTarget.prototype.addEventListener=native;
    const wrapped=function(e){
      const viewportNav=(e.altKey&&e.button===0)||e.button===1;
      if(viewportNav)return;
      return listener.call(this,e);
    };
    document.documentElement.dataset.r3dInputPriorityIntercept='1';
    return native.call(this,type,wrapped,options);
  }
  return native.call(this,type,listener,options);
};
setTimeout(()=>{
  if(armed){EventTarget.prototype.addEventListener=native;document.documentElement.dataset.r3dInputPriorityIntercept='0';console.warn('R3D input-priority shim did not intercept camera gizmo listener');}
},0);
})();
