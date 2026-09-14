import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

const cfg='raceEntryYawRate:12.5, raceCornerYawRate:9.2, raceStraightAlign:5.6, raceCornerAlign:2.1, raceRecoveryAlign:10.5, raceSlipLimit:.24, raceYawErrorGate:.22,';
must(s.includes(cfg),'turn grip config anchor missing');
s=s.replace(cfg,'raceEntryYawRate:12.5, raceCornerYawRate:9.2, raceStraightAlign:6.2, raceCornerAlign:4.8, raceRecoveryAlign:11.2, raceSlipLimit:.20, raceYawErrorGate:.22, raceTurnGripRate:7.4, raceTurnSlipTarget:.12, racePowerGripKeep:.94,');

const anchor=" if(raceState!=='DRIFT'&&brakeYawExtra>0)car.yawRate*=Math.exp(-brakeYawExtra*dt);";
must(s.includes(anchor),'turn grip controller anchor missing');
s=s.replace(anchor,` if(raceState!=='DRIFT'&&brakeYawExtra>0)car.yawRate*=Math.exp(-brakeYawExtra*dt);
 // Normal race turns should rotate the velocity vector with the chassis instead of carrying a persistent side-slide.
 // Only the lateral component is reduced; longitudinal acceleration momentum is preserved.
 if(!handbrake&&(raceState==='ENTRY'||raceState==='CORNER')){
  const turnLat=car.vel.x*rx+car.vel.z*rz;
  const turnLong=Math.abs(car.vel.x*Math.sin(car.heading)+car.vel.z*Math.cos(car.heading));
  const slipRatio=Math.abs(turnLat)/Math.max(3,turnLong);
  if(slipRatio>WHEEL_PHYS.raceTurnSlipTarget){
   const excess=clamp((slipRatio-WHEEL_PHYS.raceTurnSlipTarget)/.22,0,1);
   const powerKeep=1-(controls.throttle||0)*(1-WHEEL_PHYS.racePowerGripKeep);
   const gripRate=WHEEL_PHYS.raceTurnGripRate*(.65+.35*clamp(speedAbs/26,0,1))*excess*powerKeep;
   const gripBlend=1-Math.exp(-gripRate*dt);
   car.vel.x-=rx*turnLat*gripBlend;
   car.vel.z-=rz*turnLat*gripBlend;
  }
 }`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'turn grip diagnostic hook missing');
s=s.replace(hook,hook+`testNormalTurnGrip:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),c={mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*24,0,Math.cos(h)*24),heading:h,speed:24,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};let peak=0;for(let k=0;k<70;k++){applyArcadeMovement(c,{throttle:.78,brake:0,steer:.52,handbrake:0,nitro:false},1/60);peak=Math.max(peak,c.slip||0)}const lv=localVelocity(c);return {speed:Math.hypot(c.vel.x,c.vel.z),slip:c.slip||0,peak,long:Math.abs(lv.long),lat:Math.abs(lv.lat),state:c._raceState||null,momentum:c._driveMomentum||0}},`);

for(const r of ['raceCornerAlign:4.8','raceTurnGripRate:7.4','raceTurnSlipTarget:.12','racePowerGripKeep:.94','testNormalTurnGrip:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush normal turn grip / anti-slide fix applied');
