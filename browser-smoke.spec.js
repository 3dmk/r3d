const {test,expect}=require('@playwright/test');
test('R3D boots, all objects select, cameras are opt-in, and active camera renders',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await expect(page.locator('html')).toHaveAttribute('data-r3d-bootstrap','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-boot','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-cameras','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-input-priority','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-selection-owner','object');
  expect(await page.evaluate(()=>window.R3DCameras.cameras.length)).toBe(0);
  expect(await page.evaluate(()=>window.R3DCameras.activeCamera?.())).toBeNull();
  expect(await page.evaluate(()=>window.R3DCameras.selectedCamera?.())).toBeNull();
  await expect(page.locator('#r3dCameraList .item')).toHaveCount(0);
  await expect(page.locator('#status')).toContainText('Ready');
  await expect(page.locator('#r3dGizmoOverlay')).toHaveCount(1);

  const box=await page.locator('#gl').boundingBox();expect(box).toBeTruthy();
  const camBefore=await page.evaluate(()=>window.App3D.camera().e.slice());
  await page.keyboard.down('Alt');
  await page.mouse.move(box.x+box.width*.55,box.y+box.height*.5);
  await page.mouse.down({button:'left'});
  await page.mouse.move(box.x+box.width*.68,box.y+box.height*.58,{steps:6});
  await page.mouse.up({button:'left'});
  await page.keyboard.up('Alt');
  const camAfter=await page.evaluate(()=>window.App3D.camera().e.slice());
  expect(Math.hypot(camAfter[0]-camBefore[0],camAfter[1]-camBefore[1],camAfter[2]-camBefore[2])).toBeGreaterThan(.05);

  await page.click('#resetBtn');await page.click('#selectTool');
  const objectScreenPoint=async id=>page.evaluate(id=>{
    const o=window.App3D.objects.find(q=>q.id===id),C=window.App3D.camera(),cv=document.getElementById('gl'),r=cv.getBoundingClientRect();
    const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
    const f=norm(sub(C.c,C.e)),right=norm(cross(f,[0,1,0])),up=cross(right,f),v=sub(o.p,C.e),z=dot(v,f),tn=Math.tan(Math.PI/8),aspect=r.width/r.height,x=dot(v,right)/(z*tn*aspect),y=dot(v,up)/(z*tn);
    return{x:r.left+(x*.5+.5)*r.width,y:r.top+(.5-y*.5)*r.height};
  },id);
  for(const id of [1,2,3,4]){
    const p=await objectScreenPoint(id);await page.mouse.click(p.x,p.y);
    expect(await page.evaluate(()=>window.R3DEditor.selected()?.id)).toBe(id);
    expect(await page.evaluate(()=>window.R3DCameras.selectedCamera?.())).toBeNull();
    await expect(page.locator('html')).toHaveAttribute('data-r3d-selection-owner','object');
  }

  const before=await page.locator('#scene .item').count();
  await page.click('#addCube');await expect(page.locator('#scene .item')).toHaveCount(before+1);
  await page.click('#dupBtn');await expect(page.locator('#scene .item')).toHaveCount(before+2);
  await page.click('#delBtn');await expect(page.locator('#scene .item')).toHaveCount(before+1);
  await page.click('#undoBtn');await expect(page.locator('#scene .item')).toHaveCount(before+2);
  await page.click('#undoBtn');await expect(page.locator('#scene .item')).toHaveCount(before+1);
  await page.click('#undoBtn');await expect(page.locator('#scene .item')).toHaveCount(before);

  await page.click('#moveTool');await expect(page.locator('#moveTool')).toHaveClass(/active/);
  await page.click('#rotateTool');await expect(page.locator('#rotateTool')).toHaveClass(/active/);
  await page.click('#scaleTool');await expect(page.locator('#scaleTool')).toHaveClass(/active/);

  const cams0=await page.locator('#r3dCameraList .item').count();expect(cams0).toBe(0);
  await page.click('#addCamera');await expect(page.locator('#r3dCameraList .item')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-r3d-selection-owner','camera');
  expect(await page.evaluate(()=>window.R3DCameras.selectedCamera?.())).toBeTruthy();
  await page.click('#copyCamera');await expect(page.locator('#r3dCameraList .item')).toHaveCount(2);
  await page.click('#setActiveCamera');
  let active=await page.evaluate(()=>window.R3DRenderer.activeCamera?.());expect(active).toBeTruthy();
  await page.fill('#camX','1.25');await page.dispatchEvent('#camX','input');
  active=await page.evaluate(()=>window.R3DCameras.selectedCamera?.());expect(Math.abs(active.p[0]-1.25)).toBeLessThan(0.001);
  await page.click('#deleteCamera');await expect(page.locator('#r3dCameraList .item')).toHaveCount(1);

  await page.click('#selectTool');
  const p=await objectScreenPoint(2);await page.mouse.click(p.x,p.y);
  expect(await page.evaluate(()=>window.R3DEditor.selected()?.id)).toBe(2);
  expect(await page.evaluate(()=>window.R3DCameras.selectedCamera?.())).toBeNull();
  await expect(page.locator('html')).toHaveAttribute('data-r3d-selection-owner','object');
  await page.evaluate(()=>window.R3DCameras.select(window.R3DCameras.cameras[0].id));
  await expect(page.locator('html')).toHaveAttribute('data-r3d-selection-owner','camera');
  await page.click('#setActiveCamera');

  await page.selectOption('#rw','640');await page.selectOption('#rscale','0.5');await page.selectOption('#samples','1');await page.selectOption('#bounces','1');await page.selectOption('#adaptive','0');await page.selectOption('#denoise','0');
  await page.click('#renderBtn');
  await expect(page.locator('#pct')).toHaveText('100%',{timeout:90000});
  await expect(page.locator('#rc')).toHaveAttribute('data-r3d-orientation','upright');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-orientation','upright');
  const dims=await page.locator('#rc').evaluate(c=>[c.width,c.height]);expect(dims).toEqual([640,400]);
  const luma=await page.locator('#rc').evaluate(c=>{const x=c.getContext('2d',{willReadFrequently:true}),d=x.getImageData(0,0,c.width,c.height).data;let sum=0,n=0;const step=Math.max(4,Math.floor((c.width*c.height)/4096));for(let i=0;i<d.length;i+=4*step){sum+=(d[i]+d[i+1]+d[i+2])/3;n++}return n?sum/n:0;});
  expect(luma).toBeGreaterThan(2);
  expect(errors).toEqual([]);
});