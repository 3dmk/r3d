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

s=s.replaceAll('Polygon Rush v15.5.3 Direction Stability Fix','Polygon Rush v15.5.4 Car Steering Fix');
s=s.replaceAll('v15.5.3 • DIRECTION STABILITY FIX','v15.5.4 • CAR STEERING FIX');
s=s.replaceAll("version:'15.5.3'","version:'15.5.4'");

// Replace the skating-style force steering with a stable bicycle/tire response.
replaceFunction('applyArcadeMovement',`function applyArcadeMovement(car,controls,dt){
 ensureMoveState(car);
 dt=Math.min(dt,.033);
 car.yawRate??=0;car._steerAngle??=0;
 const surf=sampleTrackSurface(car.pos),grip=terrainGrip(surf.type)*(1-car.suspensionDamage*.28);
 const lv0=localVelocity(car),speedAbs=Math.abs(lv0.long);
 const speedSteer=clamp(1.08-speedAbs/82,.42,1);
 const steerTarget=(controls.steer||0)*WHEEL_PHYS.steerMax*speedSteer;
 car._steerAngle+=(steerTarget-car._steerAngle)*Math.min(1,dt*(WHEEL_PHYS.steerResponse+2.2));

 let long=lv0.long,lat=lv0.lat;
 const throttle=controls.throttle||0,brake=controls.brake||0,handbrake=controls.handbrake||0;
 const engineAccel=(long<-.5?WHEEL_PHYS.reverseForce:WHEEL_PHYS.driveForce)/WHEEL_PHYS.mass;
 if(throttle>0)long+=engineAccel*throttle*dt;
 if(brake>0){
  const dec=WHEEL_PHYS.brakeForce/WHEEL_PHYS.mass*brake*dt;
  if(Math.abs(long)<=dec)long=0;else long-=Math.sign(long)*dec;
 }
 const drag=(WHEEL_PHYS.rollingResistance/WHEEL_PHYS.mass+WHEEL_PHYS.aeroDrag*Math.abs(long)/WHEEL_PHYS.mass)*dt;
 if(Math.abs(long)<=drag)long=0;else long-=Math.sign(long)*drag;
 if(controls.nitro&&long>=0)long+=7.2*dt;
 long=clamp(long,-18,62);

 // Tire side force: normal driving strongly removes lateral velocity; handbrake intentionally releases rear grip.
 const lateralRate=(handbrake?1.45:11.5)*clamp(grip,.42,1.35);
 lat*=Math.exp(-lateralRate*dt);
 if(!handbrake&&Math.abs(lat)<.015)lat=0;

 // Car-like yaw follows wheel steering and forward speed instead of rotating independently of travel.
 const steer=car._steerAngle;
 const understeer=1/(1+speedAbs*speedAbs*.00024);
 const targetYaw=Math.abs(long)>.35?(long/WHEEL_PHYS.wheelBase)*Math.tan(steer)*understeer:0;
 const yawResponse=(handbrake?3.0:9.5)*clamp(grip,.45,1.25);
 car.yawRate+=(targetYaw-car.yawRate)*(1-Math.exp(-yawResponse*dt));
 if(Math.abs(controls.steer||0)<.02&&!handbrake)car.yawRate*=Math.exp(-4.8*dt);
 car.heading=wrapAngle(car.heading+car.yawRate*dt);

 // Rebuild world velocity from the new chassis direction so velocity follows the steered wheels.
 const fX=Math.sin(car.heading),fZ=Math.cos(car.heading),rX=Math.cos(car.heading),rZ=-Math.sin(car.heading);
 car.vel.x=fX*long+rX*lat;car.vel.z=fZ*long+rZ*lat;
 car.pos.x+=car.vel.x*dt;car.pos.z+=car.vel.z*dt;

 // Four wheel contact/suspension state remains authoritative for wheel visuals and road contact.
 const c=Math.cos(car.heading),si=Math.sin(car.heading),wheelStates=[];let groundSum=0;
 for(let wi=0;wi<4;wi++){
  const side=wi<2?-1:1,front=(wi%2)===1,lx=side*1.42,lz=front?1.58:-1.58;
  const rx=lx*c+lz*si,rz=-lx*si+lz*c,wx=car.pos.x+rx,wz=car.pos.z+rz;
  const sample=sampleTrackSurface({x:wx,z:wz});groundSum+=sample.y;
  const wa=car.heading+(front?car._steerAngle:0),wfX=Math.sin(wa),wfZ=Math.cos(wa),wrX=Math.cos(wa),wrZ=-Math.sin(wa);
  const pvx=car.vel.x+car.yawRate*rz,pvz=car.vel.z-car.yawRate*rx;
  const vLong=pvx*wfX+pvz*wfZ,vLat=pvx*wrX+pvz*wrZ;
  const comp=clamp(.5+(sample.y-(car.pos.y-WHEEL_PHYS.bodyRideHeight))*1.7,0,1);
  wheelStates.push({vLong,vLat,steer:front?car._steerAngle:0,spin:vLong/WHEEL_PHYS.wheelRadius,compression:comp,surface:sample.type});
 }
 const targetY=groundSum*.25+WHEEL_PHYS.bodyRideHeight;
 car.pos.y+=(targetY-car.pos.y)*Math.min(1,dt*WHEEL_PHYS.suspensionRate);
 car._wheelPhysics=wheelStates;
 const lv=localVelocity(car);car.speed=lv.long;car.steer=car._steerAngle/WHEEL_PHYS.steerMax;
 car.slip=Math.atan2(Math.abs(lv.lat),Math.abs(lv.long)+.25);
 const near=nearestTrack(car.pos);
 return {surf,near,lv,surface:surf.type};
}`);

const hook="window.__polygonRush={version:'15.5.4',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testCarSteering:()=>{const idx=120,p=trackSamples[idx].clone(),h=trackHeading(idx),dummy={pos:p,vel:new THREE.Vector3(Math.sin(h)*24,0,Math.cos(h)*24),heading:h,speed:24,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};const h0=dummy.heading,p0=dummy.pos.clone();let maxSlip=0;for(let i=0;i<90;i++){applyArcadeMovement(dummy,{throttle:.45,brake:0,steer:.55,handbrake:0,nitro:false},1/60);maxSlip=Math.max(maxSlip,dummy.slip||0)}const lv=localVelocity(dummy),velHeading=Math.atan2(dummy.vel.x,dummy.vel.z),align=Math.abs(wrapAngle(velHeading-dummy.heading));return {headingChange:Math.abs(wrapAngle(dummy.heading-h0)),distance:Math.hypot(dummy.pos.x-p0.x,dummy.pos.z-p0.z),slip:dummy.slip,maxSlip,align,long:lv.long,lat:lv.lat}},testStraightHold:()=>{const idx=140,p=trackSamples[idx].clone(),h=trackHeading(idx),dummy={pos:p,vel:new THREE.Vector3(Math.sin(h)*28+Math.cos(h)*5,0,Math.cos(h)*28-Math.sin(h)*5),heading:h,speed:28,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:.35,g:{userData:{}}};for(let i=0;i<60;i++)applyArcadeMovement(dummy,{throttle:.25,brake:0,steer:0,handbrake:0,nitro:false},1/60);const lv=localVelocity(dummy),velHeading=Math.atan2(dummy.vel.x,dummy.vel.z);return {slip:dummy.slip,align:Math.abs(wrapAngle(velHeading-dummy.heading)),yawRate:Math.abs(dummy.yawRate),lat:Math.abs(lv.lat),long:Math.abs(lv.long)}},`);

for(const r of ['Polygon Rush v15.5.4 Car Steering Fix','testCarSteering:()=>','testStraightHold:()=>','const lateralRate=(handbrake?1.45:11.5)','const targetYaw=Math.abs(long)>.35?'])must(s.includes(r),'v15.5.4 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.4 car steering fix applied');
