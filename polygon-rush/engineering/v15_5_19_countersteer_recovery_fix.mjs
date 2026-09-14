import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

must(s.includes('cornerYawResponse:10.5, maxCornerG:1.85, yawFollowSlip:.42,'),'countersteer config anchor missing');
s=s.replace(
 'cornerYawResponse:10.5, maxCornerG:1.85, yawFollowSlip:.42,',
 'cornerYawResponse:10.5, maxCornerG:1.85, yawFollowSlip:.42, counterSteerYawBrake:13.5, counterSteerLatAlign:7.8, counterSteerMinSpeed:10.0, counterSteerSlipGate:.055,'
);

const yawAnchor=` if(Math.abs(rawSteer)>.015&&!handbrake){
  const yawFollow=clamp(1-bodySlip/WHEEL_PHYS.yawFollowSlip,.18,1);
  car.yawRate+=(desiredYawRate-car.yawRate)*(1-Math.exp(-WHEEL_PHYS.cornerYawResponse*dt))*yawFollow;
 }
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 const steerReleaseExtra=Math.abs(rawSteer)<.04?WHEEL_PHYS.steeringYawRelease:0;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra+steerReleaseExtra)*dt);`;
must(s.includes(yawAnchor),'countersteer yaw anchor missing');
s=s.replace(yawAnchor,` const counterSteering=Math.abs(rawSteer)>.08&&speedAbs>WHEEL_PHYS.counterSteerMinSpeed&&Math.sign(rawSteer)!==Math.sign(car.yawRate)&&Math.abs(car.yawRate)>.035;
 if(Math.abs(rawSteer)>.015&&!handbrake){
  const yawFollow=clamp(1-bodySlip/WHEEL_PHYS.yawFollowSlip,.18,1);
  const yawRate=counterSteering?WHEEL_PHYS.counterSteerYawBrake:WHEEL_PHYS.cornerYawResponse;
  car.yawRate+=(desiredYawRate-car.yawRate)*(1-Math.exp(-yawRate*dt))*yawFollow;
 }
 if(counterSteering&&bodySlip>WHEEL_PHYS.counterSteerSlipGate&&!handbrake){
  const rx=Math.cos(car.heading),rz=-Math.sin(car.heading);
  const lateral=car.vel.x*rx+car.vel.z*rz;
  const align=1-Math.exp(-WHEEL_PHYS.counterSteerLatAlign*dt*clamp(speedAbs/22,.55,1.35));
  car.vel.x-=rx*lateral*align;
  car.vel.z-=rz*lateral*align;
 }
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 const steerReleaseExtra=Math.abs(rawSteer)<.04?WHEEL_PHYS.steeringYawRelease:0;
 const counterYawDamp=counterSteering?2.8:0;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra+steerReleaseExtra+counterYawDamp)*dt);`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testCounterSteerRecovery:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),c={mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*26,0,Math.cos(h)*26),heading:h,speed:26,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};for(let k=0;k<45;k++)applyArcadeMovement(c,{throttle:.62,brake:0,steer:.72,handbrake:0,nitro:false},1/60);const beforeYaw=c.yawRate,beforeSlip=c.slip||0;for(let k=0;k<36;k++)applyArcadeMovement(c,{throttle:.62,brake:0,steer:-.72,handbrake:0,nitro:false},1/60);return {beforeYaw,afterYaw:c.yawRate,beforeSlip,afterSlip:c.slip||0,speed:Math.hypot(c.vel.x,c.vel.z),reversed:Math.sign(c.yawRate)!==Math.sign(beforeYaw)||Math.abs(c.yawRate)<Math.abs(beforeYaw)*.35}},`);

for(const r of ['counterSteerYawBrake:13.5','counterSteerLatAlign:7.8','counterSteering','counterYawDamp','testCounterSteerRecovery:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush high-speed counter-steer recovery applied');
