const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__polygonRush?.boot===true);
 await page.selectOption('#track','freeroam');await page.click('#start');
 await page.waitForFunction(()=>window.__polygonRush?.version==='15.5.32'&&typeof window.__polygonRush.testObjectSurfaces==='function');
 const surface=await page.evaluate(()=>window.__polygonRush.testObjectSurfaces());
 const physics=await page.evaluate(()=>window.__polygonRush.testFreeRoamPhysics());
 if(!surface.ok)throw new Error('surface gate failed '+JSON.stringify(surface));
 if(!(physics.accel>6&&physics.reverse<-2&&physics.turnHeading>.15&&physics.collisionHit))throw new Error('physics gate failed '+JSON.stringify(physics));
 if(errors.length)throw new Error(errors.join(' | '));
 console.log('v15.5.32 browser gate PASS',JSON.stringify({surface,physics}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
