import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.16 Brake Release + Recovery','Polygon Rush v15.5.17 Corner Drive + Steering Response');
s=s.replaceAll('v15.5.16 • BRAKE RELEASE + RECOVERY','v15.5.17 • CORNER DRIVE + STEERING RESPONSE');
s=s.replaceAll("version:'15.5.16'","version:'15.5.17'");

must(s.includes('yawInertiaScale:1.32'),'v15.5.17 yaw inertia anchor missing');
s=s.replace('yawInertiaScale:1.32','yawInertiaScale:1.12');

must(s.includes('cornerCombinedGrip:1.16, drivenLongPriority:.82,'),'v15.5.17 corner grip anchor missing');
s=s.replace(
 'cornerCombinedGrip:1.16, drivenLongPriority:.82,',
 'cornerCombinedGrip:1.34, drivenLongPriority:.95, steeringDriveAssist:.24, steeringYawRelease:2.4, cornerMomentumAssist:.16,'
);

must(s.includes('const speedAuthority=clamp(.96-speedAbs*speedAbs/2100,.24,.96);'),'v15.5.17 speed steering authority anchor missing');
s=s.replace(
 'const speedAuthority=clamp(.96-speedAbs*speedAbs/2100,.24,.96);',
 'const speedAuthority=clamp(.98-speedAbs*speedAbs/6200,.54,.98);'
);

must(s.includes('const rackRate=9.2*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.78,1.15);'),'v15.5.17 rack rate anchor missing');
s=s.replace(
 'const rackRate=9.2*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.78,1.15);',
 'const rackRate=12.6*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.82,1.18);'
);

must(s.includes(' const throttleRate=throttle>car._driveThrottle?8.2:12.0;'),'v15.5.17 throttle rate anchor missing');
s=s.replace(
 ' const throttleRate=throttle>car._driveThrottle?8.2:12.0;',
 ' const throttleRate=throttle>car._driveThrottle?13.2:15.0;'
);

must(s.includes('  const inputReserve=clamp(1-brake*.18-car._driveThrottle*.10,.72,1);'),'v15.5.17 grip assist reserve anchor missing');
s=s.replace(
 '  const inputReserve=clamp(1-brake*.18-car._driveThrottle*.10,.72,1);',
 '  const inputReserve=clamp(1-brake*.18-car._driveThrottle*WHEEL_PHYS.steeringDriveAssist,.68,1);'
);

const combinedAnchor=`  const combined=Math.hypot(longForce,latForce),combinedScale=combined>combinedLimit?combinedLimit/combined:1;\n  longForce*=combinedScale;latForce*=combinedScale;`;
must(s.includes(combinedAnchor),'v15.5.17 combined force anchor missing');
s=s.replace(combinedAnchor,`  const requestedLong=longForce;
  const combined=Math.hypot(longForce,latForce),combinedScale=combined>combinedLimit?combinedLimit/combined:1;
  longForce*=combinedScale;latForce*=combinedScale;
  if(!front&&driveTorque>0&&!handbrake){
   const steerMomentum=clamp(Math.abs(rawSteer)*car._driveThrottle,0,1);
   const reservedLong=Math.min(Math.abs(requestedLong),maxForce*clamp(WHEEL_PHYS.drivenLongPriority+steerMomentum*WHEEL_PHYS.cornerMomentumAssist,0,1));
   if(Math.abs(longForce)<reservedLong)longForce=Math.sign(requestedLong||1)*reservedLong;
   const latRemain=Math.sqrt(Math.max(0,combinedLimit*combinedLimit-longForce*longForce));
   latForce=clamp(latForce,-latRemain,latRemain);
  }`);

const yawAnchor=` car.yawRate+=torqueY/inertia*dt;\n const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;\n car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra)*dt);`;
must(s.includes(yawAnchor),'v15.5.17 yaw response anchor missing');
s=s.replace(yawAnchor,` car.yawRate+=torqueY/inertia*dt;
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 const steerReleaseExtra=Math.abs(rawSteer)<.04?WHEEL_PHYS.steeringYawRelease:0;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra+steerReleaseExtra)*dt);`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'v15.5.17 diagnostic hook missing');
s=s.replace(hook,hook+`testCornerDriveResponse:()=>{const idx=236,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=()=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*8,0,Math.cos(h)*8),heading:h,speed:8,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const run=(steer)=>{const car=mk();let earlySteer=0,peakSlip=0,peakYaw=0,minLong=1e9;for(let i=0;i<90;i++){applyArcadeMovement(car,{throttle:.82,brake:0,steer,handbrake:0,nitro:false},1/60);if(i===9)earlySteer=Math.abs(car._steerAngle||0);peakSlip=Math.max(peakSlip,car.slip||0);peakYaw=Math.max(peakYaw,Math.abs(car.yawRate||0));for(const w of car._wheelPhysics||[])if(w.driveTorque>0)minLong=Math.min(minLong,Math.abs(w.longForce||0))}const speed=Math.hypot(car.vel.x,car.vel.z),heading=Math.abs(wrapAngle(car.heading-h));for(let i=0;i<30;i++)applyArcadeMovement(car,{throttle:.82,brake:0,steer:0,handbrake:0,nitro:false},1/60);return {speed,heading,peakSlip,peakYaw,earlySteer,minDrive:minLong===1e9?0:minLong,releasedYaw:Math.abs(car.yawRate||0),releasedSlip:car.slip||0}};const straight=run(0),turn=run(.46);return {straightSpeed:straight.speed,turnSpeed:turn.speed,speedRatio:turn.speed/Math.max(.01,straight.speed),turnHeading:turn.heading,turnSlip:turn.peakSlip,turnYaw:turn.peakYaw,earlySteer:turn.earlySteer,minDriveForce:turn.minDrive,releasedYaw:turn.releasedYaw,releasedSlip:turn.releasedSlip}},`);

for(const r of ['Polygon Rush v15.5.17 Corner Drive + Steering Response','yawInertiaScale:1.12','cornerCombinedGrip:1.34','drivenLongPriority:.95','steeringDriveAssist:.24','cornerMomentumAssist:.16','steeringYawRelease:2.4','speedAuthority=clamp(.98-speedAbs*speedAbs/6200,.54,.98)','rackRate=12.6','requestedLong','reservedLong','steerMomentum=clamp(Math.abs(rawSteer)*car._driveThrottle','testCornerDriveResponse:()=>'])must(s.includes(r),'v15.5.17 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.17 high-speed steering radius + corner momentum hotfix applied');
