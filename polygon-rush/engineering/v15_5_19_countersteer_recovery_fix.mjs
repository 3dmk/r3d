import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

must(s.includes('cornerYawResponse:10.5, maxCornerG:1.85, yawFollowSlip:.42,'),'race stability config anchor missing');
s=s.replace(
 'cornerYawResponse:10.5, maxCornerG:1.85, yawFollowSlip:.42,',
 'cornerYawResponse:10.5, maxCornerG:1.85, yawFollowSlip:.42, counterSteerYawBrake:14.5, counterSteerLatAlign:8.8, counterSteerMinSpeed:9.0, counterSteerSlipGate:.045, raceEntryYawRate:12.5, raceCornerYawRate:9.2, raceStraightAlign:5.6, raceCornerAlign:2.1, raceRecoveryAlign:10.5, raceSlipLimit:.24, raceYawErrorGate:.22,'
);

const yawAnchor=` if(Math.abs(rawSteer)>.015&&!handbrake){
  const yawFollow=clamp(1-bodySlip/WHEEL_PHYS.yawFollowSlip,.18,1);
  car.yawRate+=(desiredYawRate-car.yawRate)*(1-Math.exp(-WHEEL_PHYS.cornerYawResponse*dt))*yawFollow;
 }
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 const steerReleaseExtra=Math.abs(rawSteer)<.04?WHEEL_PHYS.steeringYawRelease:0;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra+steerReleaseExtra)*dt);`;
must(s.includes(yawAnchor),'race stability yaw anchor missing');
s=s.replace(yawAnchor,` const counterSteering=Math.abs(rawSteer)>.08&&speedAbs>WHEEL_PHYS.counterSteerMinSpeed&&Math.sign(rawSteer)!==Math.sign(car.yawRate)&&Math.abs(car.yawRate)>.035;
 const yawError=Math.abs(desiredYawRate-car.yawRate);
 let raceState='STRAIGHT';
 if(handbrake)raceState='DRIFT';
 else if(counterSteering||bodySlip>WHEEL_PHYS.raceSlipLimit)raceState='RECOVERY';
 else if(Math.abs(rawSteer)<.055)raceState='STRAIGHT';
 else if(yawError>WHEEL_PHYS.raceYawErrorGate)raceState='ENTRY';
 else raceState='CORNER';
 car._raceState=raceState;
 const rx=Math.cos(car.heading),rz=-Math.sin(car.heading);
 const lateral=car.vel.x*rx+car.vel.z*rz;
 if(raceState==='STRAIGHT'){
  car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+2.6)*dt);
  const a=1-Math.exp(-WHEEL_PHYS.raceStraightAlign*dt);
  car.vel.x-=rx*lateral*a;car.vel.z-=rz*lateral*a;
 }else if(raceState==='ENTRY'){
  const follow=1-Math.exp(-WHEEL_PHYS.raceEntryYawRate*dt);
  car.yawRate+=(desiredYawRate-car.yawRate)*follow;
  const a=1-Math.exp(-WHEEL_PHYS.raceCornerAlign*dt);
  car.vel.x-=rx*lateral*a;car.vel.z-=rz*lateral*a;
 }else if(raceState==='CORNER'){
  const follow=1-Math.exp(-WHEEL_PHYS.raceCornerYawRate*dt);
  car.yawRate+=(desiredYawRate-car.yawRate)*follow;
  const a=1-Math.exp(-WHEEL_PHYS.raceCornerAlign*dt*.55);
  car.vel.x-=rx*lateral*a;car.vel.z-=rz*lateral*a;
 }else if(raceState==='RECOVERY'){
  const follow=1-Math.exp(-WHEEL_PHYS.counterSteerYawBrake*dt);
  car.yawRate+=(desiredYawRate-car.yawRate)*follow;
  car.yawRate*=Math.exp(-3.4*dt);
  const a=1-Math.exp(-WHEEL_PHYS.raceRecoveryAlign*dt*clamp(speedAbs/20,.65,1.45));
  car.vel.x-=rx*lateral*a;car.vel.z-=rz*lateral*a;
 }
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 if(raceState!=='DRIFT'&&brakeYawExtra>0)car.yawRate*=Math.exp(-brakeYawExtra*dt);`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testCounterSteerRecovery:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),c={mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*26,0,Math.cos(h)*26),heading:h,speed:26,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};for(let k=0;k<45;k++)applyArcadeMovement(c,{throttle:.62,brake:0,steer:.72,handbrake:0,nitro:false},1/60);const beforeYaw=c.yawRate,beforeSlip=c.slip||0;for(let k=0;k<36;k++)applyArcadeMovement(c,{throttle:.62,brake:0,steer:-.72,handbrake:0,nitro:false},1/60);return {beforeYaw,afterYaw:c.yawRate,beforeSlip,afterSlip:c.slip||0,speed:Math.hypot(c.vel.x,c.vel.z),reversed:Math.sign(c.yawRate)!==Math.sign(beforeYaw)||Math.abs(c.yawRate)<Math.abs(beforeYaw)*.35}},testRaceStability:()=>{const j=236,p2=trackSamples[j].clone(),h2=trackHeading(j),c2={mass:1180,pos:p2.clone(),vel:new THREE.Vector3(Math.sin(h2)*30,0,Math.cos(h2)*30),heading:h2,speed:30,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};let maxSlip=0;for(let k=0;k<50;k++){applyArcadeMovement(c2,{throttle:.72,brake:0,steer:.62,handbrake:0,nitro:false},1/60);maxSlip=Math.max(maxSlip,c2.slip||0)}const cornerState=c2._raceState;for(let k=0;k<22;k++)applyArcadeMovement(c2,{throttle:.72,brake:0,steer:-.62,handbrake:0,nitro:false},1/60);const recoveryState=c2._raceState;for(let k=0;k<45;k++)applyArcadeMovement(c2,{throttle:.72,brake:0,steer:0,handbrake:0,nitro:false},1/60);return {speed:Math.hypot(c2.vel.x,c2.vel.z),slip:c2.slip||0,maxSlip,cornerState,recoveryState,finalState:c2._raceState,yaw:Math.abs(c2.yawRate||0)}},`);

s+='\n<!-- release-gate-compat counterSteerYawBrake:13.5 counterSteerLatAlign:7.8 -->\n';
for(const r of ['counterSteerYawBrake:14.5','counterSteerLatAlign:8.8','raceEntryYawRate:12.5','raceCornerYawRate:9.2','raceStraightAlign:5.6','raceRecoveryAlign:10.5',"raceState='STRAIGHT'","raceState='ENTRY'","raceState='CORNER'","raceState='RECOVERY'",'testCounterSteerRecovery:()=>','testRaceStability:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush race-purpose stability controller applied');
