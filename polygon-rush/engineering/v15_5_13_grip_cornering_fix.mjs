import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.12 Corner Momentum + Tire Relaxation','Polygon Rush v15.5.13 Grip Cornering Dynamics');
s=s.replaceAll('v15.5.12 • CORNER MOMENTUM + TIRE RELAXATION','v15.5.13 • GRIP CORNERING DYNAMICS');
s=s.replaceAll("version:'15.5.12'","version:'15.5.13'");

s=s.replace(
 'tireRelaxLength:1.35, tireRelaxFloor:3.2, loadTransferRate:4.2, cornerForceGain:1.08, yawDampBase:.48, yawDampSpeed:.0045,',
 'tireRelaxLength:.68, tireRelaxFloor:5.8, loadTransferRate:6.8, cornerForceGain:1.30, yawDampBase:.62, yawDampSpeed:.0055, gripSlipStart:.10, gripSlipFull:.24, gripAssistG:.72, rearStability:1.18,'
);

s=s.replace(
 'const axleGripBias=front?1.00:1.08;',
 'const axleGripBias=front?1.08:WHEEL_PHYS.rearStability;'
);
s=s.replace(
 'const brakeRearSupport=!front?1+brake*.16:1;',
 'const brakeRearSupport=!front?1+brake*.28:1;'
);
s=s.replace(
 'const cornerK=WHEEL_PHYS.tireCorner*WHEEL_PHYS.cornerForceGain*clamp(loadRatio,.58,1.50)*(front?1.00:1.10)*brakeRearSupport;',
 'const cornerK=WHEEL_PHYS.tireCorner*WHEEL_PHYS.cornerForceGain*clamp(loadRatio,.62,1.46)*(front?1.08:1.20)*brakeRearSupport;'
);
s=s.replace(
 'const relaxRate=clamp(Math.abs(vLong)/WHEEL_PHYS.tireRelaxLength,WHEEL_PHYS.tireRelaxFloor,10.5);',
 'const relaxRate=clamp(Math.abs(vLong)/WHEEL_PHYS.tireRelaxLength,WHEEL_PHYS.tireRelaxFloor,18.0);'
);

const anchor=` const speed=Math.hypot(car.vel.x,car.vel.z),aero=WHEEL_PHYS.aeroDrag*speed*speed;`;
must(s.includes(anchor),'v15.5.13 force anchor missing');
s=s.replace(anchor,` const bodyForwardX=Math.sin(car.heading),bodyForwardZ=Math.cos(car.heading),bodyRightX=Math.cos(car.heading),bodyRightZ=-Math.sin(car.heading);
 const bodyLong=car.vel.x*bodyForwardX+car.vel.z*bodyForwardZ;
 const bodyLat=car.vel.x*bodyRightX+car.vel.z*bodyRightZ;
 const bodySlip=Math.atan2(Math.abs(bodyLat),Math.abs(bodyLong)+.8);
 let gripAssistForce=0;
 if(!handbrake&&Math.abs(bodyLong)>3&&bodySlip>WHEEL_PHYS.gripSlipStart){
  const assistBlend=clamp((bodySlip-WHEEL_PHYS.gripSlipStart)/(WHEEL_PHYS.gripSlipFull-WHEEL_PHYS.gripSlipStart),0,1);
  const inputReserve=clamp(1-brake*.18-car._driveThrottle*.10,.72,1);
  gripAssistForce=-Math.sign(bodyLat)*mass*g*WHEEL_PHYS.gripAssistG*assistBlend*inputReserve;
  fx+=bodyRightX*gripAssistForce;
  fz+=bodyRightZ*gripAssistForce;
 }
 const speed=Math.hypot(car.vel.x,car.vel.z),aero=WHEEL_PHYS.aeroDrag*speed*speed;`);

s=s.replace(
 'car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal,inertia,mass,cgHeight:WHEEL_PHYS.cgHeight,latLoad:car._latLoadState,longLoad:car._longLoadState};',
 'car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal,inertia,mass,cgHeight:WHEEL_PHYS.cgHeight,latLoad:car._latLoadState,longLoad:car._longLoadState,bodySlip,gripAssistForce};'
);

const hook="window.__polygonRush={version:'15.5.13',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'v15.5.13 diagnostic hook missing');
s=s.replace(hook,hook+`testGripCornering:()=>{const idx=236,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(v=22)=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*v,0,Math.cos(h)*v),heading:h,speed:v,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const run=(controls,frames=90)=>{const car=mk();let peakSlip=0,peakLat=0,assist=0;for(let i=0;i<frames;i++){applyArcadeMovement(car,controls,1/60);peakSlip=Math.max(peakSlip,car.slip||0);peakLat=Math.max(peakLat,Math.abs(localVelocity(car).lat));assist=Math.max(assist,Math.abs(car._forceTelemetry?.gripAssistForce||0))}return {car,peakSlip,peakLat,assist,speed:Math.hypot(car.vel.x,car.vel.z),heading:Math.abs(wrapAngle(car.heading-h))}};const coast=run({throttle:.18,brake:0,steer:.50,handbrake:0,nitro:false});const power=run({throttle:.70,brake:0,steer:.46,handbrake:0,nitro:false});const braking=run({throttle:0,brake:.48,steer:.42,handbrake:0,nitro:false},72);const drift=run({throttle:.48,brake:0,steer:.52,handbrake:1,nitro:false},72);return {coastSlip:coast.peakSlip,coastLat:coast.peakLat,coastHeading:coast.heading,coastSpeed:coast.speed,powerSlip:power.peakSlip,powerHeading:power.heading,powerSpeed:power.speed,brakeSlip:braking.peakSlip,brakeHeading:braking.heading,brakeSpeed:braking.speed,gripAssist:Math.max(coast.assist,power.assist,braking.assist),driftSlip:drift.peakSlip}},`);

for(const r of ['Polygon Rush v15.5.13 Grip Cornering Dynamics','tireRelaxLength:.68','cornerForceGain:1.30','gripSlipStart:.10','gripAssistG:.72','rearStability:1.18','gripAssistForce','testGripCornering:()=>'])must(s.includes(r),'v15.5.13 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.13 grip cornering dynamics applied');
