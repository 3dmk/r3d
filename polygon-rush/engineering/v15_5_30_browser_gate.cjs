const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  async function openMode(mode){
    const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__polygonRush?.boot===true,null,{timeout:15000});
    const opts=await page.locator('#track option').evaluateAll(os=>os.map(o=>o.value));
    if(!opts.includes('test')||!opts.includes('freeroam'))throw new Error('Missing course options: '+opts.join(','));
    await page.selectOption('#track',mode);
    await page.click('#start');
    await page.waitForFunction(()=>typeof window.__polygonRush?.modeState==='function',null,{timeout:5000});
    const st=await page.evaluate(()=>window.__polygonRush.modeState());
    if(st.aiCount!==0)throw new Error(mode+' AI not removed: '+JSON.stringify(st));
    if(mode==='test'&&!st.testMode)throw new Error('Test mode inactive: '+JSON.stringify(st));
    if(mode==='freeroam'&&!st.freeRoamMode)throw new Error('Free roam inactive: '+JSON.stringify(st));
    const label=mode==='test'?'TEST TRACK':'FREE ROAM';
    if(!st.banner.includes(label))throw new Error('Wrong banner: '+JSON.stringify(st));
    if(errors.length)throw new Error(mode+' runtime errors: '+errors.join(' | '));
    await page.close();
    return st;
  }
  const test=await openMode('test');
  const free=await openMode('freeroam');
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.selectOption('#track','coast');
  await page.click('#start');
  await page.waitForFunction(()=>typeof window.__polygonRush?.testSteerUnderPower==='function',null,{timeout:5000});
  const steer=await page.evaluate(()=>window.__polygonRush.testSteerUnderPower());
  if(!(steer.power.heading>.20&&steer.power.rack>.18&&steer.power.yaw>.12))throw new Error('Steering regression: '+JSON.stringify(steer));
  console.log('V15.5.30 MODES GATE PASS',JSON.stringify({test,free,steer}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
