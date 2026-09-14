import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const replaceFunction=(name,newCode)=>{
 const start=s.indexOf(`function ${name}(`);must(start>=0,`missing ${name}`);
 let i=s.indexOf('{',start),depth=0,end=-1;
 for(;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'&&--depth===0){end=i+1;break}}
 must(end>start,`unterminated ${name}`);s=s.slice(0,start)+newCode+s.slice(end);
};

// Split the car's visible chassis from the unsprung wheel pivots. Previously both lived under one visual transform.
const visAnchor='root.userData.visual=visual;root.userData.frontWheels=frontWheels;root.userData.allWheels=allWheels;root.userData.rearLights=rearLights;root.userData.reverseLights=reverseLights;';
must(s.includes(visAnchor),'car visual/chassis anchor missing');
s=s.replace(visAnchor,`const chassis=new THREE.Group();
 chassis.name='physicsChassis';
 visual.add(chassis);
 // Move every direct visual child except wheel pivots into the sprung chassis transform.
 // Wheels remain under visual so each wheel can follow ground independently.
 for(const child of [...visual.children]){
  if(child===chassis||allWheels.includes(child))continue;
  chassis.attach(child);
 }
 root.userData.visual=visual;root.userData.chassis=chassis;root.userData.frontWheels=frontWheels;root.userData.allWheels=allWheels;root.userData.rearLights=rearLights;root.userData.reverseLights=reverseLights;`);

replaceFunction('updateSuspension',`function updateSuspension(car,dt,long,lat){
 const fl=wheelContact(car,-1.42,1.58),fr=wheelContact(car,1.42,1.58),rl=wheelContact(car,-1.42,-1.58),rr=wheelContact(car,1.42,-1.58);
 const contacts=[fl,fr,rl,rr],mounts=[[-1.42,1.58],[1.42,1.58],[-1.42,-1.58],[1.42,-1.58]];
 const front=(fl.y+fr.y)*.5,rear=(rl.y+rr.y)*.5,left=(fl.y+rl.y)*.5,right=(fr.y+rr.y)*.5;
 const surfaceY=(front+rear+left+right)*.25;
 car.surfaceY=surfaceY;
 const wheels=car.g.userData.allWheels||[];
 for(let i=0;i<wheels.length&&i<contacts.length;i++)wheels[i].position.y=.62-(contacts[i].compression-.5)*.38;

 const mass=clamp(car.mass||WHEEL_PHYS.mass,760,2200),sprungMass=mass*.86,g=9.81;
 const track=2.84,wheelBase=3.16,cgH=WHEEL_PHYS.cgHeight||.54;
 const rollInertia=sprungMass*(track*track+1.35*1.35)/12;
 const pitchInertia=sprungMass*(wheelBase*wheelBase+1.35*1.35)/12;
 const springK=28500*(1-car.suspensionDamage*.30),damper=4100*(1-car.suspensionDamage*.24),travel=.38;
 const staticDeflection=(sprungMass*g*.25)/springK;
 car._bodyHeave??=0;car._bodyHeaveVel??=0;car._bodyRoll??=0;car._bodyRollVel??=0;car._bodyPitch??=0;car._bodyPitchVel??=0;
 let sumF=0,rollTorque=0,pitchTorque=0;
 const wheelForces=[];
 for(let i=0;i<4;i++){
  const [x,z]=mounts[i],road=(contacts[i].compression-.5)*travel;
  const bodyDisp=car._bodyHeave+car._bodyRoll*x+car._bodyPitch*z;
  const bodyVel=car._bodyHeaveVel+car._bodyRollVel*x+car._bodyPitchVel*z;
  const compression=staticDeflection+road-bodyDisp;
  const force=Math.max(0,springK*compression-damper*bodyVel);
  sumF+=force;rollTorque+=force*x;pitchTorque+=force*z;wheelForces.push(force);
 }
 // Inertial load transfer acts on the sprung chassis CG, giving genuine body roll and pitch moments.
 rollTorque+=-(car._latAccel||0)*sprungMass*cgH;
 pitchTorque+=-(car._longAccel||0)*sprungMass*cgH;
 const heaveAccel=(sumF-sprungMass*g)/sprungMass;
 const rollAccel=rollTorque/rollInertia;
 const pitchAccel=pitchTorque/pitchInertia;
 car._bodyHeaveVel+=heaveAccel*dt;car._bodyRollVel+=rollAccel*dt;car._bodyPitchVel+=pitchAccel*dt;
 // Small structural damping keeps the chassis stable without locking it to the wheels.
 car._bodyHeaveVel*=Math.exp(-1.8*dt);car._bodyRollVel*=Math.exp(-2.2*dt);car._bodyPitchVel*=Math.exp(-2.35*dt);
 car._bodyHeave+=car._bodyHeaveVel*dt;car._bodyRoll+=car._bodyRollVel*dt;car._bodyPitch+=car._bodyPitchVel*dt;
 car._bodyHeave=clamp(car._bodyHeave,-.22,.22);car._bodyRoll=clamp(car._bodyRoll,-.24,.24);car._bodyPitch=clamp(car._bodyPitch,-.18,.18);
 if(Math.abs(car._bodyHeave)>=.219)car._bodyHeaveVel*=.25;
 if(Math.abs(car._bodyRoll)>=.239)car._bodyRollVel*=.25;
 if(Math.abs(car._bodyPitch)>=.179)car._bodyPitchVel*=.25;
 const chassis=car.g.userData.chassis;
 if(chassis){chassis.position.y=car._bodyHeave;chassis.rotation.z=car._bodyRoll;chassis.rotation.x=car._bodyPitch;}
 const avgComp=(fl.compression+fr.compression+rl.compression+rr.compression)*.25;
 car.bottomOut=avgComp>.94;
 car._suspensionTelemetry={avgComp,wheelForces,heave:car._bodyHeave,heaveVel:car._bodyHeaveVel,roll:car._bodyRoll,rollRate:car._bodyRollVel,pitch:car._bodyPitch,pitchRate:car._bodyPitchVel,sprungMass,rollInertia,pitchInertia};
 return {surfaceY,front,rear,left,right,avgComp}
}`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
if(s.includes(hook))s=s.replace(hook,hook+`testPhysicsChassis:()=>{const g=carMesh(0xffffff),c={mass:1180,g,pos:new THREE.Vector3(),vel:new THREE.Vector3(),heading:0,suspensionDamage:0,_longAccel:0,_latAccel:0};for(let i=0;i<30;i++){c._latAccel=6;c._longAccel=-4;updateSuspension(c,1/60,0,0)}const t=c._suspensionTelemetry||{},out={separate:!!g.userData.chassis,wheelsOutside:(g.userData.allWheels||[]).every(w=>w.parent===g.userData.visual),sprungMass:t.sprungMass||0,roll:Math.abs(t.roll||0),pitch:Math.abs(t.pitch||0),forces:(t.wheelForces||[]).length};carsG.remove(g);return out},`);

for(const r of ['physicsChassis','root.userData.chassis=chassis','sprungMass=mass*.86','rollInertia','pitchInertia','wheelForces','testPhysicsChassis:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush physics-based chassis body applied');
