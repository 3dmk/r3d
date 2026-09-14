import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(x,m)=>{if(!x)throw new Error(m)};

const cfg='terrainFloorY:-.28,';
must(s.includes(cfg),'momentum config anchor missing');
s=s.replace(cfg,'terrainFloorY:-.28, driveMomentumRise:5.8, driveMomentumFall:1.45, driveMomentumAccel:4.6, driveMomentumCornerKeep:.88, driveMomentumSlipGate:.34,');

const state='car._driveThrottle??=0;';
must(s.includes(state),'drive throttle state anchor missing');
s=s.replace(state,state+'car._driveMomentum??=0;');

const throttleUpdate='car._driveThrottle+=(throttle-car._driveThrottle)*(1-Math.exp(-throttleRate*dt));';
must(s.includes(throttleUpdate),'throttle update anchor missing');
s=s.replace(throttleUpdate,`${throttleUpdate}
 const momentumTarget=(brake>.02||handbrake)?0:Math.pow(car._driveThrottle,.72);
 const momentumRate=momentumTarget>car._driveMomentum?WHEEL_PHYS.driveMomentumRise:WHEEL_PHYS.driveMomentumFall;
 car._driveMomentum+=(momentumTarget-car._driveMomentum)*(1-Math.exp(-momentumRate*dt));`);

const integrate=' const responseMass=mass*WHEEL_PHYS.responseMassScale,ax=fx/responseMass,az=fz/responseMass;car.vel.x+=ax*dt;car.vel.z+=az*dt;';
must(s.includes(integrate),'momentum integration anchor missing');
s=s.replace(integrate,` const momentumSpeedFade=clamp(1-speedAbs/82,.26,1);
 const momentumSlipKeep=clamp(1-bodySlip/WHEEL_PHYS.driveMomentumSlipGate,.35,1);
 const momentumCornerKeep=Math.abs(rawSteer)>.05?WHEEL_PHYS.driveMomentumCornerKeep:1;
 const driveCarryAccel=WHEEL_PHYS.driveMomentumAccel*car._driveMomentum*momentumSpeedFade*momentumSlipKeep*momentumCornerKeep;
 if(driveCarryAccel>0&&brake<.02&&!handbrake){
  fx+=Math.sin(car.heading)*mass*driveCarryAccel;
  fz+=Math.cos(car.heading)*mass*driveCarryAccel;
 }
 const responseMass=mass*WHEEL_PHYS.responseMassScale,ax=fx/responseMass,az=fz/responseMass;car.vel.x+=ax*dt;car.vel.z+=az*dt;`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'momentum diagnostic hook missing');
s=s.replace(hook,hook+`testAccelerationMomentum:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),c={mass:1180,pos:p.clone(),vel:new THREE.Vector3(),heading:h,speed:0,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};const speeds=[];for(let k=0;k<90;k++){applyArcadeMovement(c,{throttle:1,brake:0,steer:k>35?.32:0,handbrake:0,nitro:false},1/60);if(k%15===14)speeds.push(Math.hypot(c.vel.x,c.vel.z))}const beforeLift=speeds[speeds.length-1],stored=c._driveMomentum||0;for(let k=0;k<18;k++)applyArcadeMovement(c,{throttle:0,brake:0,steer:.24,handbrake:0,nitro:false},1/60);return {speeds,beforeLift,afterLift:Math.hypot(c.vel.x,c.vel.z),stored,afterStored:c._driveMomentum||0,kept:(c._driveMomentum||0)>stored*.45}},`);

for(const r of ['driveMomentumRise:5.8','driveMomentumFall:1.45','driveMomentumAccel:4.6','car._driveMomentum??=0','driveCarryAccel','testAccelerationMomentum:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush persistent acceleration momentum applied');
