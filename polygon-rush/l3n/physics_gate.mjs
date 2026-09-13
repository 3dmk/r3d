import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const runtimePath = path.resolve(process.argv[2] || 'polygon-rush/l3n/runtime/box3d_bridge.js');
const runtimeDir = path.dirname(runtimePath);
const reportPath = path.resolve(process.argv[3] || 'polygon-rush/l3n/out/PHYSICS_GATE_REPORT.json');

function assert(cond, message){ if(!cond) throw new Error(message); }
function finiteArray(a){ return a.every(Number.isFinite); }

async function loadFactory(){
  const require = createRequire(import.meta.url);
  try {
    const mod = require(runtimePath);
    return mod?.default || mod;
  } catch {
    const mod = await import(pathToFileURL(runtimePath).href);
    return mod?.default || mod;
  }
}

const factory = await loadFactory();
assert(typeof factory === 'function', 'Box3D runtime did not export a module factory');
const m = await factory({ locateFile: f => path.join(runtimeDir, f) });

const required = [
  '_pr_b3_create_world','_pr_b3_create_vehicle','_pr_b3_create_static_box',
  '_pr_b3_destroy_body','_pr_b3_step','_pr_b3_apply_vehicle_control',
  '_pr_b3_get_body_state','_pr_b3_get_contacts','_pr_b3_free_state',
  '_pr_b3_free_contacts'
];
for(const fn of required) assert(typeof m[fn] === 'function', `Missing Box3D export ${fn}`);
assert(m.HEAP32 && m.HEAPF32, 'Missing Emscripten heap views');

const world = m._pr_b3_create_world();
assert(world > 0, 'Box3D world creation failed');
const floor = m._pr_b3_create_static_box(world, 0, -0.5, 0, 80, 0.5, 120, 0, 100);
const wall = m._pr_b3_create_static_box(world, 0, 1.1, 24, 8, 1.1, 0.6, 0, 101);
assert(floor > 0 && wall > 0, 'Static collision world creation failed');

const starts = [-6,-3,0,3,6];
const bodies = starts.map((x,i)=>m._pr_b3_create_vehicle(world, x, 2.4, -i*6, 0));
assert(bodies.length === 5 && bodies.every(h=>h>0), 'Failed to create five racer bodies');
assert(new Set(bodies).size === 5, 'Racer body handles are not unique');

function state(h){
  const p=m._pr_b3_get_body_state(world,h);
  assert(p>0, `No state pointer for body ${h}`);
  const base=p>>2;
  const out=Array.from(m.HEAPF32.subarray(base,base+7));
  m._pr_b3_free_state(p);
  assert(finiteArray(out), `Non-finite body state for ${h}: ${out}`);
  return out;
}
function contacts(){
  const p=m._pr_b3_get_contacts(world);
  assert(p>0,'No contact-event buffer');
  const count=m.HEAP32[p>>2];
  m._pr_b3_free_contacts(p);
  assert(Number.isInteger(count) && count>=0 && count<=128, `Invalid contact count ${count}`);
  return count;
}

const initial=bodies.map(state);
let hitEvents=0, maxSpeed=0, minY=Infinity, maxY=-Infinity;
const dt=1/60, subSteps=4;
for(let frame=0; frame<420; frame++){
  for(let i=0;i<bodies.length;i++){
    const s=state(bodies[i]);
    const vx=s[3], vz=s[5];
    const speed=Math.hypot(vx,vz);
    const throttle=frame>55 ? (i===0?1.0:0.55+0.08*i) : 0;
    const steer=i===1 && frame>120 && frame<240 ? 0.35 : 0;
    const brake=i===2 && frame>260 && frame<330 ? 0.7 : 0;
    m._pr_b3_apply_vehicle_control(world,bodies[i],throttle,brake,steer,0,0,1,speed);
  }
  m._pr_b3_step(world,dt,subSteps);
  hitEvents += contacts();
  if(frame%15===0){
    for(const h of bodies){
      const s=state(h);
      const speed=Math.hypot(s[3],s[4],s[5]);
      maxSpeed=Math.max(maxSpeed,speed);
      minY=Math.min(minY,s[1]); maxY=Math.max(maxY,s[1]);
    }
  }
}

const final=bodies.map(state);
const leadDistance=Math.hypot(final[0][0]-initial[0][0], final[0][2]-initial[0][2]);
const settled=final.filter(s=>s[1]>0.45 && s[1]<1.2).length;

assert(hitEvents>0, 'No Box3D hit/contact events were observed');
assert(leadDistance>4, `Throttle did not move lead vehicle enough: ${leadDistance.toFixed(3)} m`);
assert(maxSpeed>2, `Vehicle forces did not produce meaningful velocity: ${maxSpeed.toFixed(3)} m/s`);
assert(settled>=4, `Too many racer bodies failed road contact/settling: ${settled}/5`);
assert(minY>-5 && maxY<25, `Physics state escaped sane vertical bounds: ${minY}..${maxY}`);

for(const h of bodies) m._pr_b3_destroy_body(world,h);

const report={
  gate:'Polygon Rush Box3D Runtime Physics Gate',
  passed:true,
  fixedDt:dt,
  subSteps,
  requiredExports:required,
  worldHandle:world,
  staticBodies:{floor,wall},
  racerBodies:5,
  uniqueRacerHandles:new Set(bodies).size,
  hitEvents,
  leadDistance,
  maxSpeed,
  settledRacers:settled,
  verticalBounds:[minY,maxY],
  checks:[
    'runtime module initialized',
    'required native exports present',
    'WASM heaps exposed',
    'Box3D world created',
    'static floor and obstacle created',
    'exactly five unique racer bodies created',
    'all sampled body states remained finite',
    'gravity produced road contacts',
    'contact/hit event bridge produced events',
    'vehicle control forces produced movement',
    'most racers settled on physical ground',
    '1/60 fixed step with 4 substeps remained stable'
  ]
};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
