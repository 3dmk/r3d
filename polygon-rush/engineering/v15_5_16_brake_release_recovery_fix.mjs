import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.15 Brake Inertia Stability','Polygon Rush v15.5.16 Brake Release + Recovery');
s=s.replaceAll('v15.5.15 • BRAKE INERTIA STABILITY','v15.5.16 • BRAKE RELEASE + RECOVERY');
s=s.replaceAll("version:'15.5.15'","version:'15.5.16'");

// Compatibility handoff for the v15.5.17 corner-drive patch. v15.5.12 introduced
// the 1.00/3200 authority form, while v15.5.17 still consumes the earlier anchor
// before replacing it with its final high-speed authority model.
s=s.replace('const speedAuthority=clamp(1.00-speedAbs*speedAbs/3200,.34,1.00);','const speedAuthority=clamp(.96-speedAbs*speedAbs/2100,.24,.96);');

s=s.replace(
 'brakeSteerBleed:.46, brakeLatDamp:3.2, brakeYawDamp:1.65, brakeMinDecel:1.15,',
 'brakeSteerBleed:.46, brakeLatDamp:3.2, brakeYawDamp:1.65, brakeMinDecel:1.15, brakeMaxDecel:8.2, brakeFadeStart:3.0, brakeStopSpeed:.42, brakeApplyRate:12.0, brakeReleaseRate:20.0,'
);

const inputAnchor=' const throttle=clamp(controls.throttle||0,0,1),brake=clamp(controls.brake||0,0,1),handbrake=controls.handbrake||0;';
must(s.includes(inputAnchor),'v15.5.16 brake input anchor missing');
s=s.replace(inputAnchor,` const throttle=clamp(controls.throttle||0,0,1),rawBrake=clamp(controls.brake||0,0,1),handbrake=controls.handbrake||0;
 car._brakeBlend??=0;
 const brakeRate=rawBrake>car._brakeBlend?WHEEL_PHYS.brakeApplyRate:WHEEL_PHYS.brakeReleaseRate;
 car._brakeBlend+=(rawBrake-car._brakeBlend)*(1-Math.exp(-brakeRate*dt));
 if(rawBrake<.001&&car._brakeBlend<.002)car._brakeBlend=0;
 const brake=car._brakeBlend;`);

s=s.replace(
 ' const throttleRate=throttle>car._driveThrottle?6.4:9.0;',
 ' const throttleRate=throttle>car._driveThrottle?8.2:12.0;'
);

const torqueAnchor='  const brakeBias=front?.66:.34;\n  let brakeTorque=brake*WHEEL_PHYS.brakeWheelTorque*brakeBias;';
must(s.includes(torqueAnchor),'v15.5.16 brake torque anchor missing');
s=s.replace(torqueAnchor,`  const brakeBias=front?.66:.34;
  const wheelBrakeFade=handbrake?1:clamp((Math.abs(vLong)-WHEEL_PHYS.brakeStopSpeed)/(WHEEL_PHYS.brakeFadeStart-WHEEL_PHYS.brakeStopSpeed),0,1);
  let brakeTorque=brake*WHEEL_PHYS.brakeWheelTorque*brakeBias*wheelBrakeFade;`);

const powerBlock=` if(brake>.001&&!handbrake&&speed>.25){
  const power=fx*car.vel.x+fz*car.vel.z;
  const targetPower=-mass*speed*WHEEL_PHYS.brakeMinDecel*brake;
  if(power>targetPower){
   const correction=(power-targetPower)/speed;
   fx-=car.vel.x/speed*correction;
   fz-=car.vel.z/speed*correction;
  }
 }`;
must(s.includes(powerBlock),'v15.5.16 brake power block missing');
s=s.replace(powerBlock,` if(brake>.001&&!handbrake&&speed>.05){
  const speedFade=clamp((speed-WHEEL_PHYS.brakeStopSpeed)/(WHEEL_PHYS.brakeFadeStart-WHEEL_PHYS.brakeStopSpeed),0,1);
  const maxDecel=WHEEL_PHYS.brakeMaxDecel*brake*speedFade;
  const power=fx*car.vel.x+fz*car.vel.z;
  const minPower=-mass*speed*maxDecel;
  if(power<minPower){
   const correction=(minPower-power)/speed;
   fx+=car.vel.x/speed*correction;
   fz+=car.vel.z/speed*correction;
  }
 }`);

const integrateAnchor=' const ax=fx/mass,az=fz/mass;car.vel.x+=ax*dt;car.vel.z+=az*dt;';
must(s.includes(integrateAnchor),'v15.5.16 integration anchor missing');
s=s.replace(integrateAnchor,` const ax=fx/mass,az=fz/mass;car.vel.x+=ax*dt;car.vel.z+=az*dt;
 if(brake>.001&&!handbrake){
  const postLong=car.vel.x*bodyForwardX+car.vel.z*bodyForwardZ;
  if(bodyLong*postLong<0||Math.abs(bodyLong)<WHEEL_PHYS.brakeStopSpeed&&Math.sign(postLong)!==Math.sign(bodyLong)){
   car.vel.x-=bodyForwardX*postLong;
   car.vel.z-=bodyForwardZ*postLong;
  }
 }`);

const telemetryOld='car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal,inertia,mass,cgHeight:WHEEL_PHYS.cgHeight,latLoad:car._latLoadState,longLoad:car._longLoadState,bodySlip,gripAssistForce,brakeStabilityForce};';
const telemetryNew='car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal,inertia,mass,cgHeight:WHEEL_PHYS.cgHeight,latLoad:car._latLoadState,longLoad:car._longLoadState,bodySlip,gripAssistForce,brakeStabilityForce,brakeBlend:brake};';
must(s.includes(telemetryOld),'v15.5.16 telemetry anchor missing');
s=s.replace(telemetryOld,telemetryNew);

const hook="window.__polygonRush={version:'15.5.16',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'v15.5.16 diagnostic hook missing');
s=s.replace(hook,hook+`testBrakeRecovery:()=>{const idx=236,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(v=18)=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*v,0,Math.cos(h)*v),heading:h,speed:v,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const car=mk();let minLong=1e9,maxReverse=0;for(let i=0;i<90;i++){applyArcadeMovement(car,{throttle:0,brake:.78,steer:.12,handbrake:0,nitro:false},1/60);const l=localVelocity(car).long;minLong=Math.min(minLong,l);if(l<0)maxReverse=Math.max(maxReverse,-l)}const releaseSpeed=Math.max(0,localVelocity(car).long),blendAtRelease=car._forceTelemetry?.brakeBlend||0;for(let i=0;i<75;i++)applyArcadeMovement(car,{throttle:.82,brake:0,steer:.10,handbrake:0,nitro:false},1/60);const recovered=Math.max(0,localVelocity(car).long),blendAfter=car._forceTelemetry?.brakeBlend||0;return {releaseSpeed,recovered,delta:recovered-releaseSpeed,maxReverse,minLong,blendAtRelease,blendAfter}},`);

for(const r of ['Polygon Rush v15.5.16 Brake Release + Recovery','brakeMaxDecel:8.2','brakeFadeStart:3.0','brakeStopSpeed:.42','brakeReleaseRate:20.0','wheelBrakeFade','minPower','testBrakeRecovery:()=>'])must(s.includes(r),'v15.5.16 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.16 brake release + recovery applied');