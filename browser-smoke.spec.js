const {test,expect}=require('@playwright/test');

test('R3D RC6 realtime render updates after interaction and final orientation matches viewport',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await expect(page.locator('html')).toHaveAttribute('data-r3d-bootstrap','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-boot','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-cameras','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-input-priority','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-build','1.0.0-rc6');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-progressive-renderer','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-orientation-stage','display-rotate180');
  await expect(page.locator('#realtimeInteractionBtn')).toHaveCount(1);
  await expect(page.locator('#finalResultBtn')).toHaveCount(1);
  await expect(page.locator('#finalResultBtn')).toBeDisabled();

  await page.selectOption('#rw','640');
  await page.selectOption('#rscale','0.5');
  await page.selectOption('#samples','1');
  await page.selectOption('#bounces','1');
  await page.selectOption('#adaptive','0');
  await page.selectOption('#denoise','0');

  // Realtime interaction must be a real ray render that changes after camera input.
  await page.click('#realtimeInteractionBtn');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-realtime-interaction','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-view','realtime');
  await expect(page.locator('#renderBackend')).toHaveText('Realtime Ray Render',{timeout:10000});
  await page.waitForFunction(()=>+(document.documentElement.dataset.r3dRealtimeFrame||0)>=2,null,{timeout:15000});
  const rt0=await page.evaluate(()=>({cam:window.R3DRenderer.realtimeCamera(),frame:+document.documentElement.dataset.r3dRealtimeFrame,hash:(()=>{const c=document.getElementById('rc'),d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i+=997){h^=d[i];h=Math.imul(h,16777619);h^=d[i+1];h=Math.imul(h,16777619);h^=d[i+2];h=Math.imul(h,16777619)}return h>>>0})()}));
  const rb=await page.locator('#rc').boundingBox();expect(rb).toBeTruthy();
  await page.mouse.move(rb.x+rb.width*.5,rb.y+rb.height*.5);
  await page.mouse.down({button:'left'});
  await page.mouse.move(rb.x+rb.width*.68,rb.y+rb.height*.62,{steps:8});
  await page.mouse.up({button:'left'});
  await page.waitForFunction(f=>+(document.documentElement.dataset.r3dRealtimeCameraChanged||0)>0&&+(document.documentElement.dataset.r3dRealtimeFrame||0)>f,rt0.frame,{timeout:15000});
  const rt1=await page.evaluate(()=>({cam:window.R3DRenderer.realtimeCamera(),hash:(()=>{const c=document.getElementById('rc'),d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i+=997){h^=d[i];h=Math.imul(h,16777619);h^=d[i+1];h=Math.imul(h,16777619);h^=d[i+2];h=Math.imul(h,16777619)}return h>>>0})()}));
  expect(Math.hypot(rt1.cam.e[0]-rt0.cam.e[0],rt1.cam.e[1]-rt0.cam.e[1],rt1.cam.e[2]-rt0.cam.e[2])).toBeGreaterThan(.05);
  expect(rt1.hash).not.toBe(rt0.hash);

  // Build an asymmetric orientation target: red high/left, blue low/right.
  await page.click('#closeRender');
  await page.click('#resetBtn');
  const expected=await page.evaluate(()=>{
    const A=window.App3D;
    const red=A.objects.find(o=>o.id===1),blue=A.objects.find(o=>o.id===3),gold=A.objects.find(o=>o.id===2),cone=A.objects.find(o=>o.id===4);
    red.p=[-2.4,2.5,0];red.c=[1,.03,.03];red.mat='diffuse';red.s=1.05;
    blue.p=[2.4,.65,0];blue.c=[.03,.08,1];blue.mat='diffuse';blue.s=1.05;
    gold.p=[0,1,-3];cone.p=[0,1,4];A.touch('orientation regression scene');
    const C=A.camera(),cv=document.getElementById('gl'),r=cv.getBoundingClientRect();
    const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
    const proj=o=>{const f=norm(sub(C.c,C.e)),right=norm(cross(f,[0,1,0])),up=cross(right,f),v=sub(o.p,C.e),z=dot(v,f),tn=Math.tan(Math.PI/8),aspect=r.width/r.height,x=dot(v,right)/(z*tn*aspect),y=dot(v,up)/(z*tn);return{x:x*.5+.5,y:.5-y*.5}};
    return{r:proj(red),b:proj(blue)};
  });

  await page.click('#renderBtn');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-progressive-pass','1',{timeout:10000});
  await expect(page.locator('#renderBackend')).toHaveText('Progressive Ray Pass',{timeout:10000});
  await expect(page.locator('#pct')).toHaveText('100%',{timeout:90000});
  await expect(page.locator('html')).toHaveAttribute('data-r3d-final-render-complete','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-view','final');
  await expect(page.locator('#rc')).toHaveAttribute('data-r3d-orientation','upright');
  await expect(page.locator('#rc')).toHaveAttribute('data-r3d-orientation-fix','display-rotate180');
  await expect(page.locator('#finalResultBtn')).toBeEnabled();

  const observed=await page.locator('#rc').evaluate(c=>{
    const x=c.getContext('2d',{willReadFrequently:true}),d=x.getImageData(0,0,c.width,c.height).data;
    let rx=0,ry=0,rn=0,bx=0,by=0,bn=0;
    for(let y=0;y<c.height;y+=2)for(let q=0;q<c.width;q+=2){const i=(y*c.width+q)*4,R=d[i],G=d[i+1],B=d[i+2];if(R>45&&R>G*1.35&&R>B*1.35){rx+=q;ry+=y;rn++}if(B>45&&B>R*1.35&&B>G*1.15){bx+=q;by+=y;bn++}}
    return{r:{x:rx/Math.max(1,rn)/c.width,y:ry/Math.max(1,rn)/c.height,n:rn},b:{x:bx/Math.max(1,bn)/c.width,y:by/Math.max(1,bn)/c.height,n:bn}};
  });
  expect(observed.r.n).toBeGreaterThan(20);expect(observed.b.n).toBeGreaterThan(20);
  expect(Math.sign(observed.r.x-observed.b.x)).toBe(Math.sign(expected.r.x-expected.b.x));
  expect(Math.sign(observed.r.y-observed.b.y)).toBe(Math.sign(expected.r.y-expected.b.y));

  const luma=await page.locator('#rc').evaluate(c=>{const d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let s=0,n=0;for(let i=0;i<d.length;i+=1600){s+=(d[i]+d[i+1]+d[i+2])/3;n++}return s/n});
  expect(luma).toBeGreaterThan(2);
  expect(errors).toEqual([]);
});
