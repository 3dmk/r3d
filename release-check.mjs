import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.dirname(new URL(import.meta.url).pathname);
const fail=m=>{console.error('R3D RELEASE GATE FAIL:',m);process.exitCode=1};
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const files=['index.html','r3d-editor.js','r3d-renderer.js','r3d-render-watchdog.js','r3d-input-priority-shim.js','r3d-local-orbit.js','r3d-camera-gizmos.js','r3d-render-window.js','r3d-bootstrap.js'];
for(const f of files)if(!fs.existsSync(path.join(root,f)))fail(`missing ${f}`);
for(const retired of ['r3d-output-orientation.js','r3d-progressive-pass.js'])if(fs.existsSync(path.join(root,retired)))fail(`retired render-window file still exists: ${retired}`);
const html=read('index.html');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]),seen=new Set();for(const id of ids){if(seen.has(id))fail(`duplicate id ${id}`);seen.add(id)}
for(const id of ['gl','scene','status','renderBtn','renderSide','selectTool','moveTool','rotateTool','scaleTool'])if(!seen.has(id))fail(`required static id ${id} missing`);
for(const forbidden of ['id="modal"','id="rc"','id="renderBackend"','id="renderInfo"','id="pct"','id="bar"','id="stats"'])if(html.includes(forbidden))fail(`legacy render-window markup returned: ${forbidden}`);
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/\bsrc=/.test(m[1]))fail('inline script body is forbidden');if(m[2].trim())fail('external script tag contains inline body')}
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g)].map(m=>m[1]);
const expected=['r3d-editor.js?v=rc7','r3d-renderer.js?v=rc7','r3d-render-watchdog.js?v=rc7-orientfix1','r3d-input-priority-shim.js?v=rc7','r3d-local-orbit.js?v=rc7','r3d-camera-gizmos.js?v=rc7','r3d-render-window.js?v=rc7','r3d-bootstrap.js?v=rc7'];
if(JSON.stringify(scripts)!==JSON.stringify(expected))fail('RC7 script load order/version changed');
if(!html.includes('v1.0 RC7'))fail('visible RC7 build marker missing');
for(const f of files.filter(f=>f.endsWith('.js'))){try{execFileSync(process.execPath,['--check',path.join(root,f)],{stdio:'pipe'})}catch(e){fail(`${f} syntax error\n${e.stderr?.toString()||e.message}`)}const s=read(f);for(const banned of ['LitePix','3DLite','ThreeDLite'])if(s.includes(banned))fail(`${f} contains cross-project term ${banned}`)}
const ed=read('r3d-editor.js'),ren=read('r3d-renderer.js'),watch=read('r3d-render-watchdog.js'),priority=read('r3d-input-priority-shim.js'),orbit=read('r3d-local-orbit.js'),cams=read('r3d-camera-gizmos.js'),rw=read('r3d-render-window.js'),boot=read('r3d-bootstrap.js');
for(const token of ['window.R3DEditor','checkpoint()','doUndo','doRedo','addObject','setTool','pan=[0,0,0]'])if(!ed.includes(token))fail(`editor contract missing ${token}`);
for(const token of ['window.R3DRenderer','buildSAH','GPUBufferUsage','temporal','denoise','reservoir','cross(f,vec3f(0.,1.,0.))','cross(r,f)'])if(!ren.includes(token))fail(`renderer contract missing ${token}`);
for(const token of ['canvasLuma','safeCPU','black-frame watchdog','cross(f,[0,1,0])','cross(rr,f)',"dataset.r3dWatchdogCameraBasis='canonical'"])if(!watch.includes(token))fail(`watchdog contract missing ${token}`);
if(watch.includes('norm([f[2],0,-f[0]])'))fail('watchdog uses reversed camera-right basis');
for(const token of ['viewportNav','r3dInputPriority'])if(!priority.includes(token))fail(`input routing contract missing ${token}`);
for(const token of ['R3DLocalOrbit','FACTOR=2.0'])if(!orbit.includes(token))fail(`orbit contract missing ${token}`);
for(const token of ['window.R3DCameras','cameraForRender','activeCameraId'])if(!cams.includes(token))fail(`camera contract missing ${token}`);
for(const token of ['window.R3DRenderWindow','Realtime Interaction','Final Render Result','Render Final','rayPass(','renderFrame(','interactiveCam','snapshotFinal','sourceCamera','dataset.r3dRenderWindow','createCoreTarget','releaseCoreTarget','r3dCoreRenderTarget','rcDisplay','r3dProgressivePassCount'])if(!rw.includes(token))fail(`new render-window contract missing ${token}`);
for(const forbidden of ['R3DOutputOrientation','rotateCanvas180','display-rotate180','glCanvas','startRealtimeInteraction','showFinalResult'])if(rw.includes(forbidden))fail(`legacy render-window behavior returned: ${forbidden}`);
if(!rw.includes("dataset.r3dRenderWindow='5'"))fail('render-window generation 5 marker missing');
for(const token of ["dataset.r3dBootstrap='1'","dataset.r3dBuild='1.0.0-rc7'",'window.R3DRenderWindow'])if(!boot.includes(token))fail(`bootstrap contract missing ${token}`);
if((ed.match(/requestAnimationFrame\(loop\)/g)||[]).length!==2)fail('editor animation loop structure changed');
if((ren.match(/beginComputePass/g)||[]).length<1)fail('WebGPU compute dispatch missing');
if(process.exitCode)process.exit(process.exitCode);
console.log('R3D RC7 release gate PASS');
console.log(`staticIDs=${ids.length} scripts=${scripts.length} renderWindow=${rw.length} watchdogBasis=canonical`);