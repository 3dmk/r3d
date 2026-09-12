import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.dirname(new URL(import.meta.url).pathname);
const fail=m=>{console.error('R3D RELEASE GATE FAIL:',m);process.exitCode=1};
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const files=['index.html','r3d-editor.js','r3d-renderer.js','r3d-render-watchdog.js','r3d-output-orientation.js','r3d-input-priority-shim.js','r3d-local-orbit.js','r3d-camera-gizmos.js','r3d-bootstrap.js'];
for(const f of files)if(!fs.existsSync(path.join(root,f)))fail(`missing ${f}`);
const html=read('index.html');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]),seen=new Set();
for(const id of ids){if(seen.has(id))fail(`duplicate id ${id}`);seen.add(id)}
for(const id of ['gl','scene','status','renderBtn','renderSide','rc','modal','selectTool','moveTool','rotateTool','scaleTool'])if(!seen.has(id))fail(`required id ${id} missing`);
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/\bsrc=/.test(m[1]))fail('inline script body is forbidden');if(m[2].trim())fail('external script tag contains inline body')}
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g)].map(m=>m[1]);
if(JSON.stringify(scripts)!==JSON.stringify(['r3d-editor.js','r3d-renderer.js','r3d-render-watchdog.js','r3d-output-orientation.js','r3d-input-priority-shim.js','r3d-local-orbit.js','r3d-camera-gizmos.js','r3d-bootstrap.js']))fail('script load order changed');
for(const f of files.filter(f=>f.endsWith('.js'))){try{execFileSync(process.execPath,['--check',path.join(root,f)],{stdio:'pipe'})}catch(e){fail(`${f} syntax error\n${e.stderr?.toString()||e.message}`)}const s=read(f);for(const banned of ['LitePix','3DLite','ThreeDLite'])if(s.includes(banned))fail(`${f} contains banned cross-project term ${banned}`)}
const ed=read('r3d-editor.js'),ren=read('r3d-renderer.js'),watch=read('r3d-render-watchdog.js'),orient=read('r3d-output-orientation.js'),priority=read('r3d-input-priority-shim.js'),orbit=read('r3d-local-orbit.js'),cams=read('r3d-camera-gizmos.js'),boot=read('r3d-bootstrap.js');
for(const token of ['window.R3DEditor','checkpoint()','doUndo','doRedo','addObject','setTool','pan=[0,0,0]','cross(right,f)'])if(!ed.includes(token))fail(`editor contract missing ${token}`);
for(const token of ['window.R3DRenderer','buildSAH','coneh','coneCPU','GPUBufferUsage','temporal','denoise','reservoir'])if(!ren.includes(token))fail(`renderer contract missing ${token}`);
for(const token of ['canvasLuma','safeCPU','black-frame watchdog'])if(!watch.includes(token))fail(`watchdog contract missing ${token}`);
for(const token of ['markCanvasUpright','r3dOrientation','r3dRenderOrientation','orientation-neutral'])if(!orient.includes(token))fail(`orientation contract missing ${token}`);
if(orient.includes('scale(1,-1)')||orient.includes('scale(1, -1)'))fail('blanket final vertical flip returned');
for(const token of ['viewportNav','r3dInputPriority'])if(!priority.includes(token))fail(`input-priority contract missing ${token}`);
for(const token of ['R3DLocalOrbit','FACTOR=2.0','r3dLocalOrbit'])if(!orbit.includes(token))fail(`local-orbit contract missing ${token}`);
for(const token of ['window.R3DCameras','cameraForRender','activeCameraId','drawMoveGizmo','drawRotateGizmo','drawScaleGizmo','copyCamera','deleteCamera','cameraFromView'])if(!cams.includes(token))fail(`camera/gizmo contract missing ${token}`);
if(!boot.includes("dataset.r3dBootstrap='1'"))fail('bootstrap completion marker missing');
if((ed.match(/requestAnimationFrame\(loop\)/g)||[]).length!==2)fail('editor animation loop structure changed');
if((ren.match(/beginComputePass/g)||[]).length<1)fail('WebGPU compute dispatch missing');
if(process.exitCode)process.exit(process.exitCode);
console.log('R3D release gate PASS');
console.log(`IDs=${ids.length} scripts=${scripts.length} editor=${ed.length} renderer=${ren.length} cameras=${cams.length} orbit=${orbit.length}`);
