const {test,expect}=require('@playwright/test');

test('R3D RC7 clean render window owns realtime interaction and final result',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await expect(page.locator('html')).toHaveAttribute('data-r3d-bootstrap','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-build','1.0.0-rc7');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-window','2');
  await expect(page.locator('#r3dRenderWindow')).toHaveCount(1);
  await expect(page.locator('#rwRealtime')).toHaveCount(1);
  await expect(page.locator('#rwFinalRender')).toHaveCount(1);
  await expect(page.locator('#rwFinalView')).toBeDisabled();
  await expect(page.locator('script[src*="r3d-progressive-pass"]')).toHaveCount(0);
  await expect(page.locator('script[src*="r3d-output-orientation"]')).toHaveCount(0);

  await page.selectOption('#rw','640');await page.selectOption('#rscale','0.5');await page.selectOption('#samples','1');await page.selectOption('#bounces','1');await page.selectOption('#adaptive','0');await page.selectOption('#denoise','0');

  // Realtime mode must be ray-rendered, persistent, and change after direct render-window interaction.
  await page.click('#rwRealtime');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-window-mode','realtime');
  await expect(page.locator('#renderBackend')).toHaveText('Realtime Ray',{timeout:10000});
  await page.waitForFunction(()=>+(document.documentElement.dataset.r3dRenderFrame||0)>=2,null,{timeout:15000});
  const before=await page.evaluate(()=>({cam:window.R3DRenderWindow.realtimeCamera,frame:+document.documentElement.dataset.r3dRenderFrame,hash:(()=>{const c=document.getElementById('rc'),d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i+=997){h^=d[i];h=Math.imul(h,16777619);h^=d[i+1];h=Math.imul(h,16777619);h^=d[i+2];h=Math.imul(h,16777619)}return h>>>0})()}));
  const box=await page.locator('#rc').boundingBox();expect(box).toBeTruthy();
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down({button:'left'});await page.mouse.move(box.x+box.width*.68,box.y+box.height*.6,{steps:8});await page.mouse.up({button:'left'});
  await page.waitForFunction(f=>+(document.documentElement.dataset.r3dRealtimeCameraChanges||0)>0&&+(document.documentElement.dataset.r3dRenderFrame||0)>f,before.frame,{timeout:15000});
  const after=await page.evaluate(()=>({cam:window.R3DRenderWindow.realtimeCamera,hash:(()=>{const c=document.getElementById('rc'),d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i+=997){h^=d[i];h=Math.imul(h,16777619);h^=d[i+1];h=Math.imul(h,16777619);h^=d[i+2];h=Math.imul(h,16777619)}return h>>>0})()}));
  expect(Math.hypot(after.cam.e[0]-before.cam.e[0],after.cam.e[1]-before.cam.e[1],after.cam.e[2]-before.cam.e[2])).toBeGreaterThan(.05);
  expect(after.hash).not.toBe(before.hash);

  // Final render should replace the live pass, save a stable result, and use native camera orientation (no display flips).
  await page.click('#rwFinalRender');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-window-mode','rendering',{timeout:10000});
  await expect(page.locator('html')).toHaveAttribute('data-r3d-final-render-complete','1',{timeout:90000});
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-window-mode','final');
  await expect(page.locator('#rc')).toHaveAttribute('data-r3d-orientation','native-camera-basis');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-orientation','native');
  await expect(page.locator('#rwFinalView')).toBeEnabled();
  const finalHash=await page.evaluate(()=>{const c=document.getElementById('rc'),d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i+=997){h^=d[i];h=Math.imul(h,16777619);h^=d[i+1];h=Math.imul(h,16777619);h^=d[i+2];h=Math.imul(h,16777619)}return h>>>0});

  await page.click('#rwRealtime');await page.waitForFunction(()=>+(document.documentElement.dataset.r3dRenderFrame||0)>=3,null,{timeout:15000});
  await page.click('#rwFinalView');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-window-mode','final');
  const restoredHash=await page.evaluate(()=>{const c=document.getElementById('rc'),d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i+=997){h^=d[i];h=Math.imul(h,16777619);h^=d[i+1];h=Math.imul(h,16777619);h^=d[i+2];h=Math.imul(h,16777619)}return h>>>0});
  expect(restoredHash).toBe(finalHash);
  expect(errors).toEqual([]);
});