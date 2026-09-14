import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.14 Steering Acceleration Balance','Polygon Rush v15.5.15 Brake Inertia Stability');
s=s.replaceAll('v15.5.14 • STEERING ACCELERATION BALANCE','v15.5.15 • BRAKE INERTIA STABILITY');
s=s.replaceAll("version:'15.5.14'","version:'15.5.15'");

s=s.replace(
 'cornerCombinedGrip:1.16, drivenLongPriority:.82,',
 'cornerCombinedGrip:1.16, drivenLongPriority:.82, brakeSteerBleed:.46, brakeLatDamp:3.2, brakeYawDamp:1.65, brakeMinDecel:1.15,'
);

const longAnchor='  let longForce=maxForce*Math.tanh(slipRatio*WHEEL_PHYS.longSlipStiffness);';
must(s.includes(longAnchor),'v15.5.15 longitudinal force anchor missing');
s=s.replace(longAnchor,`  let longForce=maxForce*Math.tanh(slipRatio*WHEEL_PHYS.longSlipStiffness);
  if(brake>.001&&!handbrake&&Math.abs(vLong)>.2){
   const steerBrakeBlend=clamp(Math.abs(rawSteer)*1.55,0,1);
   const brakeLongCap=maxForce*(1-WHEEL_PHYS.brakeSteerBleed*steerBrakeBlend);
   longForce=-Math.sign(vLong)*Math.min(Math.abs(longForce),brakeLongCap);
  }`);

const bodyAnchor=` const bodySlip=Math.atan2(Math.abs(bodyLat),Math.abs(bodyLong)+.8);
 let gripAssistForce=0;`;
must(s.includes(bodyAnchor),'v15.5.15 body slip anchor missing');
s=s.replace(bodyAnchor,` const bodySlip=Math.atan2(Math.abs(bodyLat),Math.abs(bodyLong)+.8);
 let brakeStabilityForce=0;
 if(brake>.001&&!handbrake&&Math.abs(bodyLong)>2){
  const stabilityGain=WHEEL_PHYS.brakeLatDamp*brake*clamp(1+Math.abs(rawSteer)*.65,1,1.5);
  brakeStabilityForce=-bodyLat*mass*stabilityGain;
  const stabilityCap=mass*g*.72;
  brakeStabilityForce=clamp(brakeStabilityForce,-stabilityCap,stabilityCap);
  fx+=bodyRightX*brakeStabilityForce;
  fz+=bodyRightZ*brakeStabilityForce;
 }
 let gripAssistForce=0;`);

const speedAnchor=` const speed=Math.hypot(car.vel.x,car.vel.z),aero=WHEEL_PHYS.aeroDrag*speed*speed;`;
must(s.includes(speedAnchor),'v15.5.15 speed anchor missing');
s=s.replace(speedAnchor,` const speed=Math.hypot(car.vel.x,car.vel.z),aero=WHEEL_PHYS.aeroDrag*speed*speed;
 if(brake>.001&&!handbrake&&speed>.25){
  const power=fx*car.vel.x+fz*car.vel.z;
  const targetPower=-mass*speed*WHEEL_PHYS.brakeMinDecel*brake;
  if(power>targetPower){
   const correction=(power-targetPower)/speed;
   fx-=car.vel.x/speed*correction;
   fz-=car.vel.z/speed*correction;
  }
 }`);

const yawAnchor=` car.yawRate+=torqueY/inertia*dt;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed)*dt);`;
must(s.includes(yawAnchor),'v15.5.15 yaw anchor missing');
s=s.replace(yawAnchor,` car.yawRate+=torqueY/inertia*dt;
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra)*dt);`);

s=s.replace(
 'car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal,inertia,mass,cgHeight:WHEEL_PHYS.cgHeight,latLoad:car._latLoadState,longLoad:car._longLoadState,bodySlip,gripAssistForce};',
 'car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal,inertia,mass,cgHeight:WHEEL_PHYS.cgHeight,latLoad:car._latLoadState,longLoad:car._longLoadState,bodySlip,gripAssistForce,brakeStabilityForce};'
);

const hook="window.__polygonRush={version:'15.5.15',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'v15.5.15 diagnostic hook missing');
s=s.replace(hook,hook+`testBrakeInertia:()=>{const idx=236,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(v=24)=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*v,0,Math.cos(h)*v),heading:h,speed:v,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const run=(steer,brake)=>{const car=mk();let prev=Math.hypot(car.vel.x,car.vel.z),maxRise=0,peakSlip=0,peakLat=0,maxYaw=0;for(let i=0;i<72;i++){applyArcadeMovement(car,{throttle:0,brake,steer,handbrake:0,nitro:false},1/60);const speed=Math.hypot(car.vel.x,car.vel.z);maxRise=Math.max(maxRise,speed-prev);prev=speed;peakSlip=Math.max(peakSlip,car.slip||0);peakLat=Math.max(peakLat,Math.abs(localVelocity(car).lat));maxYaw=Math.max(maxYaw,Math.abs(car.yawRate||0))}return {speed:prev,maxRise,peakSlip,peakLat,maxYaw,heading:Math.abs(wrapAngle(car.heading-h)),stability:Math.abs(car._forceTelemetry?.brakeStabilityForce||0)}};const straight=run(0,.72),corner=run(.42,.58);return {straightEnd:straight.speed,straightRise:straight.maxRise,straightSlip:straight.peakSlip,cornerEnd:corner.speed,cornerRise:corner.maxRise,cornerSlip:corner.peakSlip,cornerLat:corner.peakLat,cornerYaw:corner.maxYaw,cornerHeading:corner.heading,stabilityForce:corner.stability}},`);

for(const r of ['Polygon Rush v15.5.15 Brake Inertia Stability','brakeSteerBleed:.46','brakeLatDamp:3.2','brakeYawDamp:1.65','brakeMinDecel:1.15','brakeStabilityForce','targetPower','testBrakeInertia:()=>'])must(s.includes(r),'v15.5.15 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.15 brake inertia stability applied');
