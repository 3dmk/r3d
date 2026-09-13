import fs from 'node:fs';

const ITERATIONS=1000;
const BASE={engineForce:10500,brakeForce:14500,lateralGain:6.0,lateralMassScale:1750,yawTorque:4300,handbrakeLateral:0.95,linearDamping:0.14,angularDamping:2.85,friction:0.48,restitution:0.0,hullHalfY:0.62,spawnLift:0.90,fixedDt:1/60,subSteps:4};
const LIMITS={engineForce:[8500,12500],brakeForce:[11500,18000],lateralGain:[3.5,8],yawTorque:[3200,6000],linearDamping:[0.05,0.28],angularDamping:[1.8,3.6],friction:[0.38,0.72],restitution:[0,0.08],spawnLift:[0.78,1.08]};
const STEPS={engineForce:1500,brakeForce:2200,lateralGain:1.25,yawTorque:1000,linearDamping:0.07,angularDamping:0.45,friction:0.10,restitution:0.025,spawnLift:0.09};
const KEYS=Object.keys(STEPS);
function clamp(v,[a,b]){return Math.max(a,Math.min(b,v));}
function seeded(seed){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296);}
const rnd=seeded(1477001); const n=()=>rnd()*2-1;

function simulate(p){
 const dt=1/120; let speed=0,t=0,yaw=0,lateral=0,maxLat=0,brakeStop=0,osc=0;
 for(let i=0;i<720;i++){speed=Math.max(0,speed+((p.engineForce/1150)-p.linearDamping*speed*0.8)*dt);t+=dt;if(speed>=27.78)break;}
 const accelTime=t;
 speed=25;
 for(let i=0;i<480;i++){const steer=.62,ss=Math.min(Math.abs(speed)/8,1);yaw+=(p.yawTorque/5000)*steer*ss*dt*.72;lateral+=(yaw*speed*.14-lateral*(p.lateralGain*p.friction))*dt;maxLat=Math.max(maxLat,Math.abs(lateral));osc+=Math.abs(lateral)*dt;}
 speed=30;t=0;while(speed>.2&&t<8){speed=Math.max(0,speed-((p.brakeForce/1450)+p.linearDamping*speed*.25)*dt);brakeStop+=speed*dt;t+=dt;}
 const penetrationRisk=Math.max(0,(p.hullHalfY+.08)-p.spawnLift);
 const bounceRisk=p.restitution*1.8+Math.max(0,.42-p.friction)*.45;
 const timestepRisk=Math.abs(p.fixedDt-1/60)*100+Math.abs(p.subSteps-4)*.25;
 const spinRisk=Math.max(0,(p.yawTorque/5000)-1.18)*.7+Math.max(0,2.15-p.angularDamping)*.25;
 const overGrip=Math.max(0,p.lateralGain*p.friction-4.2);
 const sluggish=Math.max(0,3.0-(p.yawTorque/5000)*p.friction*2.9);
 return{accelTime,maxLat,brakeStop,penetrationRisk,bounceRisk,timestepRisk,spinRisk,overGrip,sluggish,osc};
}
function evaluate(p){
 const s=simulate(p);let value=100;
 const parts={pace:0,control:0,braking:0,collision:0,stability:0};
 parts.pace=Math.abs(s.accelTime-3.65)*5.0;
 parts.control=Math.max(0,s.maxLat-3.6)*5.2+s.overGrip*2.4+s.sluggish*1.8;
 parts.braking=Math.abs(s.brakeStop-41)*.23;
 parts.collision=s.penetrationRisk*140+s.bounceRisk*20+s.timestepRisk*30;
 parts.stability=s.spinRisk*34+Math.max(0,s.osc-10)*.08;
 for(const v of Object.values(parts))value-=v;
 for(const k of KEYS){const [a,b]=LIMITS[k];if(p[k]<a||p[k]>b)value-=60;}
 if(p.spawnLift<p.hullHalfY+.1)value-=80;
 return{value,s,parts};
}
function curve(i,plateau){
 const x=i/ITERATIONS;
 let phase,scale,explore;
 if(x<.22){phase='explore';scale=1.0-.35*(x/.22);explore=.78;}
 else if(x<.58){phase='learn';scale=.65-.28*((x-.22)/.36);explore=.48;}
 else if(x<.85){phase='exploit';scale=.37-.20*((x-.58)/.27);explore=.24;}
 else{phase='polish';scale=.17-.09*((x-.85)/.15);explore=.10;}
 if(plateau>70){scale=Math.min(1,scale*1.8);explore=Math.min(.9,explore+.25);phase='escape';}
 return{phase,scale,explore};
}
function mutate(parent,c,elite){
 const q={...parent}; const count=c.explore>.6?3:c.explore>.3?2:1;
 const keys=[...KEYS].sort(()=>rnd()-.5).slice(0,count);
 for(const k of keys){let center=parent[k];if(elite&&rnd()<.3)center=(center+elite[k])*.5;q[k]=clamp(center+n()*STEPS[k]*c.scale,LIMITS[k]);}
 return q;
}

let best={...BASE},bestEval=evaluate(best),accepted=0,plateau=0;const elites=[{p:{...best},e:bestEval}],history=[],curveSummary={};
for(let i=1;i<=ITERATIONS;i++){
 const c=curve(i,plateau),anchor=(rnd()<.18&&elites.length>1)?elites[Math.floor(rnd()*Math.min(5,elites.length))].p:best;
 const cand=mutate(anchor,c,elites[0]?.p),ev=evaluate(cand);const gain=ev.value-bestEval.value;
 const accept=gain>0.0002;
 if(accept){best=cand;bestEval=ev;accepted++;plateau=0;elites.push({p:{...best},e:bestEval});elites.sort((a,b)=>b.e.value-a.e.value);elites.length=Math.min(8,elites.length);}else plateau++;
 const bucket=Math.floor((i-1)/100)*100+100;curveSummary[bucket]??={best:-Infinity,accepted:0,phases:{}};curveSummary[bucket].best=Math.max(curveSummary[bucket].best,bestEval.value);if(accept)curveSummary[bucket].accepted++;curveSummary[bucket].phases[c.phase]=(curveSummary[bucket].phases[c.phase]||0)+1;
 history.push({iteration:i,phase:c.phase,scale:+c.scale.toFixed(4),plateau,accepted:accept,candidate:+ev.value.toFixed(5),best:+bestEval.value.toFixed(5),gain:+gain.toFixed(5)});
}

const sourceChecks={};for(const f of ['polygon-rush/v14.6/source/part03.txt','polygon-rush/v14.6/source/part04.txt','polygon-rush/v14.6/source/part05.txt','polygon-rush/v14.6/source/part06.txt','polygon-rush/box3d/box3d_bridge.c']){const txt=fs.readFileSync(f,'utf8');sourceChecks[f]={exists:true,hasFiveRacerLogic:/for\(let i=0;i<4;i\+\+\)|ais\.length!==4|\/5/.test(txt),hasBox3D:/BOX3D|pr_b3_/.test(txt),hasRaceStart:/function start\(|raceStarted/.test(txt),hasRecovery:/recover|respawn/i.test(txt)};}
const report={method:'Polygon Rush Adaptive L3N-1000 Learning Curve v2',iterations:ITERATIONS,baseline:BASE,baselineEvaluation:evaluate(BASE),bestParameters:best,bestEvaluation:bestEval,acceptedIterations:accepted,learning:{strategy:'staged exploration -> learning -> exploitation -> polish, with plateau escape and elite memory',curveSummary,eliteCount:elites.length},sourceChecks,protectedRules:['player controls functional','exactly four AI opponents','five Box3D racer bodies','finite physics states','no embedded spawn','1/60 fixed step and 4 substeps','regressions rejected','runtime physics gate must pass before promotion'],history};
fs.mkdirSync('polygon-rush/l3n/out',{recursive:true});fs.writeFileSync('polygon-rush/l3n/out/L3N1000_REPORT.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({iterations:ITERATIONS,accepted,baseline:report.baselineEvaluation.value,best:bestEval.value,bestParameters:best,curveSummary},null,2));
