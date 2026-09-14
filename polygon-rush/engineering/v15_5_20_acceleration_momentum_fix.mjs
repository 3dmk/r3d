import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(x,m)=>{if(!x)throw new Error(m)};

const cfg='terrainFloorY:-.28,';
must(s.includes(cfg),'momentum config anchor missing');
s=s.replace(cfg,'terrainFloorY:-.28, driveMomentumRise:5.8, driveMomentumFall:1.45, driveMomentumAccel:4.6, driveMomentumCornerKeep:.88, driveMomentumSlipGate:.34, raceTurnGripRate:7.4, raceTurnSlipTarget:.12, racePowerGripKeep:.94,');

const state='car._driveThrottle??=0;';
must(s.includes(state),'drive throttle state anchor missing');
s=s.replace(state,state+'car._driveMomentum??=0;');

const throttleUpdate='car._driveThrottle+=(throttle-car._driveThrottle)*(1-Math.exp(-throttleRate*dt));';
must(s.includes(throttleUpdate),'throttle update anchor missing');
s=s.replace(throttleUpdate,`${throttleUpdate}\n const momentumTarget=(brake>.02||handbrake)?0:Math.pow(car._driveThrottle,.72);\n const momentumRate=momentumTarget>car._driveMomentum?WHEEL_PHYS.driveMomentumRise:WHEEL_PHYS.driveMomentumFall;\n car._driveMomentum+=(momentumTarget-car._driveMomentum)*(1-Math.exp(-momentumRate*dt));`);

const integrate=' const responseMass=mass*WHEEL_PHYS.responseMassScale,ax=fx/responseMass,az=fz/responseMass;car.vel.x+=ax*dt;car.vel.z+=az*dt;';
must(s.includes(integrate),'momentum integration anchor missing');
s=s.replace(integrate,` const momentumSpeedFade=clamp(1-speedAbs/82,.26,1);\n const momentumSlipKeep=clamp(1-bodySlip/WHEEL_PHYS.driveMomentumSlipGate,.35,1);\n const momentumCornerKeep=Math.abs(rawSteer)>.05?WHEEL_PHYS.driveMomentumCornerKeep:1;\n const driveCarryAccel=WHEEL_PHYS.driveMomentumAccel*car._driveMomentum*momentumSpeedFade*momentumSlipKeep*momentumCornerKeep;\n if(driveCarryAccel>0&&brake<.02&&!handbrake){fx+=Math.sin(car.heading)*mass*driveCarryAccel;fz+=Math.cos(car.heading)*mass*driveCarryAccel;}\n const responseMass=mass*WHEEL_PHYS.responseMassScale,ax=fx/responseMass,az=fz/responseMass;car.vel.x+=ax*dt;car.vel.z+=az*dt;\n if(!handbrake&&Math.abs(rawSteer)>.045){\n  const rxTurn=Math.cos(car.heading),rzTurn=-Math.sin(car.heading),latTurn=car.vel.x*rxTurn+car.vel.z*rzTurn,longTurn=Math.abs(car.vel.x*Math.sin(car.heading)+car.vel.z*Math.cos(car.heading)),turnSlip=Math.abs(latTurn)/Math.max(3,longTurn);\n  if(turnSlip>WHEEL_PHYS.raceTurnSlipTarget){const excess=clamp((turnSlip-WHEEL_PHYS.raceTurnSlipTarget)/.22,0,1),throttleGrip=1-(controls.throttle||0)*(1-WHEEL_PHYS.racePowerGripKeep),turnGripRate=WHEEL_PHYS.raceTurnGripRate*(.68+.32*clamp(speedAbs/26,0,1))*excess*throttleGrip,turnGripBlend=1-Math.exp(-turnGripRate*dt);car.vel.x-=rxTurn*latTurn*turnGripBlend;car.vel.z-=rzTurn*latTurn*turnGripBlend;}\n }`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'momentum diagnostic hook missing');
s=s.replace(hook,hook+`testAccelerationMomentum:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),c={mass:1180,pos:p.clone(),vel:new THREE.Vector3(),heading:h,speed:0,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};const speeds=[];for(let k=0;k<90;k++){applyArcadeMovement(c,{throttle:1,brake:0,steer:k>35?.32:0,handbrake:0,nitro:false},1/60);if(k%15===14)speeds.push(Math.hypot(c.vel.x,c.vel.z))}const beforeLift=speeds[speeds.length-1],stored=c._driveMomentum||0;for(let k=0;k<18;k++)applyArcadeMovement(c,{throttle:0,brake:0,steer:.24,handbrake:0,nitro:false},1/60);return {speeds,beforeLift,afterLift:Math.hypot(c.vel.x,c.vel.z),stored,afterStored:c._driveMomentum||0,kept:(c._driveMomentum||0)>stored*.45}},testNormalTurnGrip:()=>{const j=236,p2=trackSamples[j].clone(),h2=trackHeading(j),c2={mass:1180,pos:p2.clone(),vel:new THREE.Vector3(Math.sin(h2)*24,0,Math.cos(h2)*24),heading:h2,speed:24,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};let peak=0;for(let k=0;k<70;k++){applyArcadeMovement(c2,{throttle:.78,brake:0,steer:.52,handbrake:0,nitro:false},1/60);peak=Math.max(peak,c2.slip||0)}const lv=localVelocity(c2);return {speed:Math.hypot(c2.vel.x,c2.vel.z),slip:c2.slip||0,peak,long:Math.abs(lv.long),lat:Math.abs(lv.lat),momentum:c2._driveMomentum||0}},`);

for(const r of ['driveMomentumRise:5.8','driveMomentumFall:1.45','driveMomentumAccel:4.6','raceTurnGripRate:7.4','raceTurnSlipTarget:.12','racePowerGripKeep:.94','car._driveMomentum??=0','driveCarryAccel','testAccelerationMomentum:()=>','testNormalTurnGrip:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush persistent acceleration momentum + normal turn grip applied');

for(const patch of ['polygon-rush/engineering/v15_5_21_test_track_mode.mjs','polygon-rush/engineering/v15_5_22_progressive_steering_no_block_fix.mjs','polygon-rush/engineering/v15_5_23_turning_differential_fix.mjs','polygon-rush/engineering/v15_5_24_corner_exit_acceleration_fix.mjs','polygon-rush/engineering/v15_5_25_sprung_body_suspension_fix.mjs','polygon-rush/engineering/v15_5_26_physics_chassis_body_fix.mjs','polygon-rush/engineering/v15_5_27_freeroam_demo_course.mjs','polygon-rush/engineering/v15_5_28_course_menu_sync_fix.mjs']){
 const run=spawnSync(process.execPath,[patch,file],{stdio:'inherit'});if(run.status!==0)process.exit(run.status??1);
}
