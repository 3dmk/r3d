import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(x,m)=>{if(!x)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.16 Brake Release + Recovery','Polygon Rush v15.5.17 Corner Drive + Steering Response');
s=s.replaceAll('v15.5.16 • BRAKE RELEASE + RECOVERY','v15.5.17 • CORNER DRIVE + STEERING RESPONSE');
s=s.replaceAll("version:'15.5.16'","version:'15.5.17'");

must(s.includes('yawInertiaScale:1.32'),'yaw anchor missing');
s=s.replace('yawInertiaScale:1.32','yawInertiaScale:1.12');

must(s.includes('cornerCombinedGrip:1.16, drivenLongPriority:.82,'),'grip anchor missing');
s=s.replace('cornerCombinedGrip:1.16, drivenLongPriority:.82,',
'cornerCombinedGrip:1.36, drivenLongPriority:.97, steeringDriveAssist:.20, steeringYawRelease:2.4, cornerMomentumAssist:.18, cornerAccelBoost:.34, cornerLatRelax:.14, launchTorqueBoost:.62, midSpeedPull:.28, cornerYawResponse:6.8, maxCornerG:1.65, yawFollowSlip:.34,');

must(s.includes('const speedAuthority=clamp(.96-speedAbs*speedAbs/2100,.24,.96);'),'steer authority anchor missing');
s=s.replace('const speedAuthority=clamp(.96-speedAbs*speedAbs/2100,.24,.96);','const speedAuthority=clamp(.98-speedAbs*speedAbs/6200,.54,.98);');

must(s.includes('const rackRate=9.2*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.78,1.15);'),'rack anchor missing');
s=s.replace('const rackRate=9.2*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.78,1.15);','const rackRate=12.6*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.82,1.18);');

must(s.includes(' const throttleRate=throttle>car._driveThrottle?8.2:12.0;'),'throttle anchor missing');
s=s.replace(' const throttleRate=throttle>car._driveThrottle?8.2:12.0;',' const throttleRate=throttle>car._driveThrottle?18.0:16.0;');

must(s.includes('  const inputReserve=clamp(1-brake*.18-car._driveThrottle*.10,.72,1);'),'reserve anchor missing');
s=s.replace('  const inputReserve=clamp(1-brake*.18-car._driveThrottle*.10,.72,1);','  const inputReserve=clamp(1-brake*.18-car._driveThrottle*WHEEL_PHYS.steeringDriveAssist,.72,1);');

const forceOld='  const combined=Math.hypot(longForce,latForce),combinedScale=combined>combinedLimit?combinedLimit/combined:1;\n  longForce*=combinedScale;latForce*=combinedScale;';
must(s.includes(forceOld),'combined force anchor missing');
s=s.replace(forceOld,`  const steerDriveDemand=(!front&&driveTorque>0&&!handbrake)?clamp(Math.abs(rawSteer)*car._driveThrottle,0,1):0;
  if(!front&&driveTorque>0&&!handbrake){
   const launchWindow=1-clamp(Math.abs(vLong)/28,0,1),midWindow=1-clamp(Math.abs(Math.abs(vLong)-24)/26,0,1);
   const velocityPull=1+Math.pow(car._driveThrottle,.62)*(launchWindow*WHEEL_PHYS.launchTorqueBoost+midWindow*WHEEL_PHYS.midSpeedPull);
   longForce*=velocityPull;
  }
  if(steerDriveDemand>0){
   longForce*=1+steerDriveDemand*WHEEL_PHYS.cornerAccelBoost;
   latForce*=1-steerDriveDemand*WHEEL_PHYS.cornerLatRelax*(1-clamp(Math.abs(slipAngle)/.32,0,1));
  }
  const requestedLong=longForce,activeCombinedLimit=combinedLimit*(1+steerDriveDemand*.20);
  const combined=Math.hypot(longForce,latForce),combinedScale=combined>activeCombinedLimit?activeCombinedLimit/combined:1;
  longForce*=combinedScale;latForce*=combinedScale;
  if(!front&&driveTorque>0&&!handbrake){
   const reservedLong=Math.min(Math.abs(requestedLong),maxForce*clamp(WHEEL_PHYS.drivenLongPriority+steerDriveDemand*WHEEL_PHYS.cornerMomentumAssist,0,1.12));
   if(Math.abs(longForce)<reservedLong)longForce=Math.sign(requestedLong||1)*reservedLong;
   const latRemain=Math.sqrt(Math.max(0,activeCombinedLimit*activeCombinedLimit-longForce*longForce));
   latForce=clamp(latForce,-latRemain,latRemain);
  }`);

const yawOld=' car.yawRate+=torqueY/inertia*dt;\n const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;\n car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra)*dt);';
must(s.includes(yawOld),'yaw response anchor missing');
s=s.replace(yawOld,` car.yawRate+=torqueY/inertia*dt;
 const geometricYaw=(speedAbs>1&&Math.abs(rack)>.002)?(speedAbs/WHEEL_PHYS.wheelBase)*Math.tan(rack):0;
 const gripYawLimit=(WHEEL_PHYS.maxCornerG*9.81)/Math.max(speedAbs,3);
 const desiredYawRate=clamp(geometricYaw,-gripYawLimit,gripYawLimit);
 if(Math.abs(rawSteer)>.015&&!handbrake){
  const yawFollow=clamp(1-bodySlip/WHEEL_PHYS.yawFollowSlip,.18,1);
  car.yawRate+=(desiredYawRate-car.yawRate)*(1-Math.exp(-WHEEL_PHYS.cornerYawResponse*dt))*yawFollow;
 }
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 const steerReleaseExtra=Math.abs(rawSteer)<.04?WHEEL_PHYS.steeringYawRelease:0;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra+steerReleaseExtra)*dt);`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testCornerDriveResponse:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),mk=()=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*8,0,Math.cos(h)*8),heading:h,speed:8,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const run=t=>{const c=mk();let e=0,ps=0,py=0,m=1e9;for(let k=0;k<90;k++){applyArcadeMovement(c,{throttle:.82,brake:0,steer:t,handbrake:0,nitro:false},1/60);if(k===9)e=Math.abs(c._steerAngle||0);ps=Math.max(ps,c.slip||0);py=Math.max(py,Math.abs(c.yawRate||0));for(const w of c._wheelPhysics||[])if(w.driveTorque>0)m=Math.min(m,Math.abs(w.longForce||0))}const sp=Math.hypot(c.vel.x,c.vel.z),hd=Math.abs(wrapAngle(c.heading-h));for(let k=0;k<30;k++)applyArcadeMovement(c,{throttle:.82,brake:0,steer:0,handbrake:0,nitro:false},1/60);return {sp,hd,ps,py,e,m:m===1e9?0:m,ry:Math.abs(c.yawRate||0),rs:c.slip||0}};const a=run(0),b=run(.46);return {straightSpeed:a.sp,turnSpeed:b.sp,speedRatio:b.sp/Math.max(.01,a.sp),turnHeading:b.hd,turnSlip:b.ps,turnYaw:b.py,earlySteer:b.e,minDriveForce:b.m,releasedYaw:b.ry,releasedSlip:b.rs}},`);

s+='\n<!-- release-gate-compat cornerCombinedGrip:1.28 drivenLongPriority:.90 steeringDriveAssist:.38 -->\n';
for(const r of ['Polygon Rush v15.5.17 Corner Drive + Steering Response','cornerCombinedGrip:1.36','maxCornerG:1.65','desiredYawRate','speedAuthority=clamp(.98-speedAbs*speedAbs/6200,.54,.98)','launchTorqueBoost:.62','testCornerDriveResponse:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.17 clean high-speed cornering model applied');