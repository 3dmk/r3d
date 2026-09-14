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

replaceFunction('updateSuspension',`function updateSuspension(car,dt,long,lat){
 const fl=wheelContact(car,-1.42,1.58),fr=wheelContact(car,1.42,1.58),rl=wheelContact(car,-1.42,-1.58),rr=wheelContact(car,1.42,-1.58);
 const front=(fl.y+fr.y)*.5,rear=(rl.y+rr.y)*.5,left=(fl.y+rl.y)*.5,right=(fr.y+rr.y)*.5;
 const surfaceY=(front+rear+left+right)*.25;
 const pitchTerrain=Math.atan2(front-rear,3.16),rollTerrain=Math.atan2(left-right,2.84);
 car.surfaceY=surfaceY;car.contactPitch=pitchTerrain;car.contactRoll=rollTerrain;
 car._bodyHeave??=0;car._bodyHeaveVel??=0;car._bodyRoll??=0;car._bodyRollVel??=0;car._bodyPitch??=0;car._bodyPitchVel??=0;
 const contacts=[fl,fr,rl,rr],wheels=car.g.userData.allWheels||[];
 const avgComp=(fl.compression+fr.compression+rl.compression+rr.compression)*.25;
 const frontComp=(fl.compression+fr.compression)*.5,rearComp=(rl.compression+rr.compression)*.5;
 const leftComp=(fl.compression+rl.compression)*.5,rightComp=(fr.compression+rr.compression)*.5;
 // Unsprung wheel travel follows each contact independently.
 for(let i=0;i<wheels.length&&i<contacts.length;i++){
  const w=wheels[i],ct=contacts[i];
  w.position.y=.62-(ct.compression-.5)*.34;
 }
 // Sprung chassis: body has its own vertical mass/damper instead of being a rigid block on the wheel group.
 const heaveTarget=clamp((.50-avgComp)*.30,-.16,.16);
 const heaveAccel=(heaveTarget-car._bodyHeave)*42-car._bodyHeaveVel*10.5;
 car._bodyHeaveVel+=heaveAccel*dt;car._bodyHeave+=car._bodyHeaveVel*dt;
 car._bodyHeave=clamp(car._bodyHeave,-.20,.20);
 // Body roll comes from left/right suspension load plus lateral acceleration.
 const compressionRoll=(rightComp-leftComp)*.24;
 const accelRoll=clamp(-(car._latAccel||0)*.010,-.13,.13);
 const rollTarget=clamp(rollTerrain+compressionRoll+accelRoll,-.22,.22);
 const rollAccel=(rollTarget-car._bodyRoll)*48-car._bodyRollVel*11.5;
 car._bodyRollVel+=rollAccel*dt;car._bodyRoll+=car._bodyRollVel*dt;
 // Body pitch comes from front/rear suspension load plus longitudinal acceleration.
 const compressionPitch=(rearComp-frontComp)*.20;
 const accelPitch=clamp(-(car._longAccel||0)*.0085,-.105,.105);
 const pitchTarget=clamp(pitchTerrain+compressionPitch+accelPitch,-.16,.16);
 const pitchAccel=(pitchTarget-car._bodyPitch)*52-car._bodyPitchVel*12.0;
 car._bodyPitchVel+=pitchAccel*dt;car._bodyPitch+=car._bodyPitchVel*dt;
 const vis=car.g.userData.visual;
 if(vis){
  vis.position.y=car._bodyHeave;
  vis.rotation.z=car._bodyRoll;
  vis.rotation.x=car._bodyPitch;
 }
 car.bottomOut=avgComp>.93;
 car._suspensionTelemetry={avgComp,frontComp,rearComp,leftComp,rightComp,heave:car._bodyHeave,heaveVel:car._bodyHeaveVel,roll:car._bodyRoll,pitch:car._bodyPitch};
 return {surfaceY,front,rear,left,right,avgComp}
}`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
if(s.includes(hook))s=s.replace(hook,hook+`testSprungBody:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),c={mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*22,0,Math.cos(h)*22),heading:h,speed:22,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{visual:{position:{y:0},rotation:{x:0,z:0}},allWheels:[]}}};c._longAccel=0;c._latAccel=0;for(let k=0;k<20;k++){c._latAccel=7;c._longAccel=-5;updateSuspension(c,1/60,22,4)}const t=c._suspensionTelemetry||{};return {heave:Math.abs(t.heave||0),roll:Math.abs(t.roll||0),pitch:Math.abs(t.pitch||0),moved:Math.abs(t.heave||0)>.001&&Math.abs(t.roll||0)>.002&&Math.abs(t.pitch||0)>.002}},`);

for(const r of ['car._bodyHeave','car._bodyRoll','car._bodyPitch','_suspensionTelemetry','vis.position.y=car._bodyHeave'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush sprung body suspension applied');
