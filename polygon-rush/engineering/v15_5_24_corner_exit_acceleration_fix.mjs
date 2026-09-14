import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

const cfg='racePowerGripKeep:.94,';
must(s.includes(cfg),'corner-exit config anchor missing');
s=s.replace(cfg,'racePowerGripKeep:.94, cornerExitAccel:5.8, cornerExitBuild:8.5, cornerExitDecay:3.0, cornerExitSlipGate:.18, cornerExitSteerGate:.28,');

const state='car._driveMomentum??=0;';
must(s.includes(state),'corner-exit state anchor missing');
s=s.replace(state,state+'car._cornerExitBoost??=0;car._prevSteerAbs??=0;');

const integrate=` const responseMass=mass*WHEEL_PHYS.responseMassScale,ax=fx/responseMass,az=fz/responseMass;car.vel.x+=ax*dt;car.vel.z+=az*dt;`;
must(s.includes(integrate),'corner-exit integration anchor missing');
s=s.replace(integrate,` const steerAbsNow=Math.abs(rawSteer),steerRelease=Math.max(0,(car._prevSteerAbs??steerAbsNow)-steerAbsNow);
 const exitEligible=car._driveThrottle>.35&&brake<.02&&!handbrake&&steerAbsNow<WHEEL_PHYS.cornerExitSteerGate&&bodySlip<WHEEL_PHYS.cornerExitSlipGate&&steerRelease>.006;
 const exitTarget=exitEligible?clamp(.35+steerRelease*4.5,0,1):0;
 const exitRate=exitTarget>car._cornerExitBoost?WHEEL_PHYS.cornerExitBuild:WHEEL_PHYS.cornerExitDecay;
 car._cornerExitBoost+=(exitTarget-car._cornerExitBoost)*(1-Math.exp(-exitRate*dt));
 if(car._cornerExitBoost>.001){
  const exitSpeedFade=clamp(1-speedAbs/76,.30,1),exitAccel=WHEEL_PHYS.cornerExitAccel*car._cornerExitBoost*exitSpeedFade;
  fx+=Math.sin(car.heading)*mass*exitAccel;
  fz+=Math.cos(car.heading)*mass*exitAccel;
 }
 car._prevSteerAbs=steerAbsNow;
 const responseMass=mass*WHEEL_PHYS.responseMassScale,ax=fx/responseMass,az=fz/responseMass;car.vel.x+=ax*dt;car.vel.z+=az*dt;`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'corner-exit diagnostic hook missing');
s=s.replace(hook,hook+`testCornerExitAcceleration:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),c={mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*18,0,Math.cos(h)*18),heading:h,speed:18,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};for(let k=0;k<42;k++)applyArcadeMovement(c,{throttle:.82,brake:0,steer:.62,handbrake:0,nitro:false},1/60);const turnSpeed=Math.hypot(c.vel.x,c.vel.z);for(let k=0;k<18;k++)applyArcadeMovement(c,{throttle:.88,brake:0,steer:.10,handbrake:0,nitro:false},1/60);const earlyExit=Math.hypot(c.vel.x,c.vel.z),boost=c._cornerExitBoost||0;for(let k=0;k<42;k++)applyArcadeMovement(c,{throttle:.88,brake:0,steer:0,handbrake:0,nitro:false},1/60);return {turnSpeed,earlyExit,finalSpeed:Math.hypot(c.vel.x,c.vel.z),boost,accelerated:earlyExit>turnSpeed+.7}},`);

for(const r of ['cornerExitAccel:5.8','cornerExitBuild:8.5','cornerExitDecay:3.0','cornerExitSlipGate:.18','cornerExitSteerGate:.28','_cornerExitBoost','exitEligible','testCornerExitAcceleration:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush corner exit acceleration recovery applied');
