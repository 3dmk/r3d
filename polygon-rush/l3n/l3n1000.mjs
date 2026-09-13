import fs from 'node:fs';

const ITERATIONS = 1000;
const BASE = {
  engineForce: 9300,
  brakeForce: 14000,
  lateralGain: 5.2,
  lateralMassScale: 1750,
  yawTorque: 5000,
  handbrakeLateral: 0.95,
  linearDamping: 0.10,
  angularDamping: 2.2,
  friction: 0.42,
  restitution: 0.06,
  hullHalfY: 0.62,
  spawnLift: 0.72,
  fixedDt: 1/60,
  subSteps: 4
};

function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function seeded(seed){ let s=seed>>>0; return ()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296); }
const rnd=seeded(1462);

function simulate(p){
  const dt=1/120;
  let speed=0, yaw=0, lateral=0, maxLat=0, brakeStop=0, t=0;
  // 0-100-ish acceleration surrogate
  for(let i=0;i<600;i++){
    const accel=(p.engineForce/1150) - p.linearDamping*speed*0.8;
    speed += accel*dt;
    speed=Math.max(0,speed);
    t+=dt;
    if(speed>=27.78) break;
  }
  const accelTime=t;
  // steady corner surrogate at ~25 m/s
  speed=25;
  for(let i=0;i<360;i++){
    const steer=0.62;
    const steerScale=Math.min(Math.abs(speed)/8,1);
    yaw += (p.yawTorque/5000)*steer*steerScale*dt*0.72;
    lateral += (yaw*speed*0.14 - lateral*(p.lateralGain*p.friction))*dt;
    maxLat=Math.max(maxLat,Math.abs(lateral));
  }
  // braking surrogate
  speed=30;t=0;
  while(speed>0.2 && t<8){
    const decel=(p.brakeForce/1450)+p.linearDamping*speed*0.25;
    speed=Math.max(0,speed-decel*dt);
    brakeStop += speed*dt;
    t+=dt;
  }
  // landing/collision stability proxy
  const penetrationRisk = Math.max(0,(p.hullHalfY+0.06)-p.spawnLift);
  const bounceRisk = p.restitution*1.6 + Math.max(0,0.35-p.friction)*0.5;
  const timestepRisk = Math.max(0,p.fixedDt-1/60)*10 + Math.max(0,3-p.subSteps)*0.2;
  const spinRisk = Math.max(0,(p.yawTorque/5000)-1.35)*0.5 + Math.max(0,1.4-p.angularDamping)*0.35;

  return {accelTime,maxLat,brakeStop,penetrationRisk,bounceRisk,timestepRisk,spinRisk};
}

function score(p){
  const s=simulate(p);
  let value=100;
  value -= Math.abs(s.accelTime-3.7)*5.5;
  value -= Math.max(0,s.maxLat-4.0)*4.5;
  value -= Math.abs(s.brakeStop-42)*0.22;
  value -= s.penetrationRisk*120;
  value -= s.bounceRisk*18;
  value -= s.timestepRisk*25;
  value -= s.spinRisk*30;
  // protected sane ranges
  if(p.engineForce<7000||p.engineForce>12500) value-=25;
  if(p.brakeForce<10000||p.brakeForce>19000) value-=20;
  if(p.lateralGain<2.5||p.lateralGain>8.0) value-=20;
  if(p.friction<0.35||p.friction>0.75) value-=20;
  if(p.spawnLift < p.hullHalfY+0.08) value-=60;
  return {value,s};
}

function mutate(p,scale){
  const q={...p};
  const n=()=> (rnd()*2-1);
  q.engineForce=clamp(p.engineForce+n()*1800*scale,7000,12500);
  q.brakeForce=clamp(p.brakeForce+n()*2500*scale,10000,19000);
  q.lateralGain=clamp(p.lateralGain+n()*1.5*scale,2.5,8);
  q.yawTorque=clamp(p.yawTorque+n()*1400*scale,3200,7200);
  q.linearDamping=clamp(p.linearDamping+n()*0.08*scale,0.04,0.32);
  q.angularDamping=clamp(p.angularDamping+n()*0.5*scale,1.4,3.4);
  q.friction=clamp(p.friction+n()*0.12*scale,0.35,0.75);
  q.restitution=clamp(p.restitution+n()*0.04*scale,0.0,0.12);
  q.spawnLift=clamp(p.spawnLift+n()*0.12*scale,0.70,1.05);
  return q;
}

let best={...BASE};
let bestEval=score(best);
const history=[];
for(let i=1;i<=ITERATIONS;i++){
  const scale=Math.max(0.08,1-i/ITERATIONS);
  const candidate=mutate(best,scale);
  const ev=score(candidate);
  const accepted=ev.value>bestEval.value;
  if(accepted){ best=candidate; bestEval=ev; }
  history.push({iteration:i,accepted,score:+ev.value.toFixed(4),best:+bestEval.value.toFixed(4)});
}

const sourceChecks={};
for(const f of ['polygon-rush/v14.6/source/part03.txt','polygon-rush/v14.6/source/part04.txt','polygon-rush/v14.6/source/part05.txt','polygon-rush/v14.6/source/part06.txt','polygon-rush/box3d/box3d_bridge.c']){
  const txt=fs.readFileSync(f,'utf8');
  sourceChecks[f]={
    exists:true,
    hasFiveRacerLogic:/for\(let i=0;i<4;i\+\+\)|ais\.length!==4|\/5/.test(txt),
    hasBox3D:/BOX3D|pr_b3_/.test(txt),
    hasRaceStart:/function start\(|raceStarted/.test(txt),
    hasRecovery:/recover|respawn/i.test(txt)
  };
}

const report={
  method:'Polygon Rush Adaptive L3N-1000',
  iterations:ITERATIONS,
  baseline:BASE,
  baselineEvaluation:score(BASE),
  bestParameters:best,
  bestEvaluation:bestEval,
  acceptedIterations:history.filter(x=>x.accepted).length,
  sourceChecks,
  protectedRules:[
    'player controls must remain functional',
    'exactly four AI opponents must spawn',
    'five racer physics bodies required when Box3D is active',
    'no vehicle may begin embedded in road collision',
    'fixed-step physics must remain stable',
    'regressions are rejected rather than promoted'
  ],
  priorities:[
    'movement/start/opponents',
    'continuous track collision',
    'vehicle stability and grip',
    'AI driving using shared physics',
    'race flow and recovery',
    'models/materials/lighting',
    'performance and cleanup'
  ],
  history
};
fs.mkdirSync('polygon-rush/l3n/out',{recursive:true});
fs.writeFileSync('polygon-rush/l3n/out/L3N1000_REPORT.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({iterations:ITERATIONS,accepted:report.acceptedIterations,baseline:report.baselineEvaluation.value,best:report.bestEvaluation.value,bestParameters:best},null,2));
