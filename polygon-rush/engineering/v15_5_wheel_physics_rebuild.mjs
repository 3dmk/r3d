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

s=s.replaceAll('Polygon Rush v15.4 Core Drive Rebuild','Polygon Rush v15.5 Wheel Physics Rebuild');
s=s.replaceAll('v15.4 • CORE DRIVE REBUILD','v15.5 • WHEEL PHYSICS REBUILD');
s=s.replaceAll("version:'15.4'","version:'15.5'");
s=s.replaceAll("solver:'arcade'","solver:'wheel-physics'");
s=s.replaceAll("$('#box3dHud').textContent='ARCADE'","$('#box3dHud').textContent='WHEEL PHYSICS'");
s=s.replaceAll('Physics backend: ARCADE','Physics backend: WHEEL PHYSICS');
s=s.replaceAll('OWNERSHIP: arcade solver owns player + AI movement','OWNERSHIP: four-wheel tire/suspension solver owns player + AI movement');

// Give every visible wheel persistent physical metadata and spin the rim with the tire.
s=s.replace('pivot.userData.tire=tire;allWheels.push(pivot);if(z>0)frontWheels.push(pivot)',
`pivot.userData.tire=tire;pivot.userData.rim=rim;pivot.userData.localX=x;pivot.userData.localZ=z;pivot.userData.front=z>0;pivot.userData.spin=0;pivot.userData.compression=.5;allWheels.push(pivot);if(z>0)frontWheels.push(pivot)`);

const WHEEL_CONST=`const WHEEL_PHYS={
 mass:1180, inertiaY:2350, wheelRadius:.58, wheelBase:3.16, track:2.84,
 driveForce:9200, reverseForce:4200, brakeForce:13200,
 cornerStiffness:7600, rollingResistance:42, aeroDrag:.46,
 steerMax:.58, steerResponse:7.5, yawDamping:1.55,
 suspensionTravel:.46, suspensionRate:8.5, bodyRideHeight:.18
};\n`;
const moveMarker='const MOVE={';
must(s.includes(moveMarker),'MOVE marker missing');s=s.replace(moveMarker,WHEEL_CONST+moveMarker);

replaceFunction('applyArcadeMovement',`function applyArcadeMovement(car,controls,dt){
 ensureMoveState(car);
 dt=Math.min(dt,.033);
 car.yawRate??=0;car._steerAngle??=0;
 const wheels=car.g?.userData?.allWheels||[];
 const steerTarget=(controls.steer||0)*WHEEL_PHYS.steerMax;
 car._steerAngle+=(steerTarget-car._steerAngle)*Math.min(1,dt*WHEEL_PHYS.steerResponse);
 const c=Math.cos(car.heading),si=Math.sin(car.heading);
 let fx=0,fz=0,torqueY=0,groundSum=0,contactCount=0;
 const wheelStates=[];
 const speed=Math.hypot(car.vel.x,car.vel.z);
 for(let wi=0;wi<4;wi++){
  const side=wi<2?-1:1, front=(wi%2)===1;
  const lx=side*1.42,lz=front?1.58:-1.58;
  const rx=lx*c+lz*si, rz=-lx*si+lz*c;
  const wx=car.pos.x+rx,wz=car.pos.z+rz;
  const sample=sampleTrackSurface({x:wx,z:wz});
  groundSum+=sample.y;contactCount++;
  const wa=car.heading+(front?car._steerAngle:0),wfX=Math.sin(wa),wfZ=Math.cos(wa),wrX=Math.cos(wa),wrZ=-Math.sin(wa);
  const pvx=car.vel.x+car.yawRate*rz,pvz=car.vel.z-car.yawRate*rx;
  const vLong=pvx*wfX+pvz*wfZ,vLat=pvx*wrX+pvz*wrZ;
  const grip=terrainGrip(sample.type)*(1-car.suspensionDamage*.28);
  const normal=WHEEL_PHYS.mass*9.81*.25;
  let longForce=0;
  if(front===false){
    if((controls.throttle||0)>0)longForce+=(controls.throttle||0)*(vLong<-.5?WHEEL_PHYS.reverseForce:WHEEL_PHYS.driveForce)*.5;
  }
  if((controls.brake||0)>0){
    const sign=Math.abs(vLong)>.25?Math.sign(vLong):1;
    longForce-=sign*(controls.brake||0)*WHEEL_PHYS.brakeForce*.25;
  }
  let latForce=-vLat*WHEEL_PHYS.cornerStiffness*(front?1.05:.95);
  if((controls.handbrake||0)&&!front)latForce*=.22;
  const maxF=Math.max(1200,normal*(1.15*grip));
  longForce=clamp(longForce,-maxF,maxF);
  const lateralLimit=Math.sqrt(Math.max(0,maxF*maxF-longForce*longForce));
  latForce=clamp(latForce,-lateralLimit,lateralLimit);
  const wfx=wfX*longForce+wrX*latForce,wfz=wfZ*longForce+wrZ*latForce;
  fx+=wfx;fz+=wfz;torqueY+=rz*wfx-rx*wfz;
  const comp=clamp(.5+(sample.y-(car.pos.y-WHEEL_PHYS.bodyRideHeight))*1.7,0,1);
  wheelStates.push({vLong,vLat,steer:front?car._steerAngle:0,spin:vLong/WHEEL_PHYS.wheelRadius,compression:comp,surface:sample.type});
 }
 const vmag=Math.hypot(car.vel.x,car.vel.z),drag=WHEEL_PHYS.aeroDrag*vmag;
 fx-=car.vel.x*(WHEEL_PHYS.rollingResistance+drag);fz-=car.vel.z*(WHEEL_PHYS.rollingResistance+drag);
 car.vel.x+=fx/WHEEL_PHYS.mass*dt;car.vel.z+=fz/WHEEL_PHYS.mass*dt;
 car.yawRate+=torqueY/WHEEL_PHYS.inertiaY*dt;
 car.yawRate*=Math.exp(-WHEEL_PHYS.yawDamping*dt);
 car.heading=wrapAngle(car.heading+car.yawRate*dt);
 car.pos.x+=car.vel.x*dt;car.pos.z+=car.vel.z*dt;
 const avgGround=groundSum/Math.max(1,contactCount),targetY=avgGround+WHEEL_PHYS.bodyRideHeight;
 car.pos.y+=(targetY-car.pos.y)*Math.min(1,dt*WHEEL_PHYS.suspensionRate);
 car._wheelPhysics=wheelStates;
 const lv=localVelocity(car);car.speed=lv.long;car.steer=car._steerAngle/WHEEL_PHYS.steerMax;
 car.slip=Math.atan2(Math.abs(lv.lat),Math.abs(lv.long)+.25);
 const near=nearestTrack(car.pos),surf=sampleTrackSurface(car.pos);
 return {surf,near,lv,surface:surf.type};
}`);

replaceFunction('animateBuggy',`function animateBuggy(car,long,lat,dt){
 const wheels=car.g?.userData?.allWheels||[];
 const states=car._wheelPhysics||[];
 for(let i=0;i<wheels.length;i++){
  const w=wheels[i],st=states[i]||null;
  const steer=st?st.steer:(w.userData.front?(car._steerAngle||0):0);
  w.rotation.y=steer;
  if(st){
   w.userData.spin=(w.userData.spin||0)-st.spin*dt;
   w.userData.compression=st.compression;
   w.position.y=.62-(st.compression-.5)*.26;
  }else w.userData.spin=(w.userData.spin||0)-long*dt/WHEEL_PHYS.wheelRadius;
  if(w.userData.tire){w.userData.tire.rotation.z=Math.PI/2;w.userData.tire.rotation.y=w.userData.spin}
  if(w.userData.rim){w.userData.rim.rotation.z=Math.PI/2;w.userData.rim.rotation.y=w.userData.spin}
 }
}`);

// Collision response now changes chassis velocity and yaw instead of only pushing a hovercraft body away.
replaceFunction('resolveWorldCollision',`function resolveWorldCollision(car,obj,radius=1.9,breakable=false){
 if(!obj.visible)return;
 const dx=car.pos.x-obj.position.x,dz=car.pos.z-obj.position.z,d=Math.hypot(dx,dz);if(d<=.001||d>radius)return;
 const nx=dx/d,nz=dz/d,speed=Math.hypot(car.vel.x,car.vel.z);
 if(breakable&&speed>14){obj.visible=false;obj.userData.alive=false;car.vel.multiplyScalar(.88);car.yawRate+=(Math.random()-.5)*.35;applyImpactDamage(car,speed/48,'collision');return}
 car.pos.x+=nx*(radius-d+.02);car.pos.z+=nz*(radius-d+.02);
 const vn=car.vel.x*nx+car.vel.z*nz;
 if(vn<0){car.vel.x-=nx*vn*1.55;car.vel.z-=nz*vn*1.55;car.yawRate+=clamp((nx*Math.cos(car.heading)-nz*Math.sin(car.heading))*vn*.028,-1.2,1.2)}
 car.vel.multiplyScalar(.90);applyImpactDamage(car,speed/52,'collision');
}`);

// Expose physical state to the browser gate/debugging.
s=s.replace("window.__polygonRush={version:'15.5',racers:5,solver:'wheel-physics',startOk:true};",
            "window.__polygonRush={version:'15.5',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true};");
s=s.replace("window.__polygonRush={version:'15.5',boot:true,solver:'wheel-physics'};",
            "window.__polygonRush={version:'15.5',boot:true,solver:'wheel-physics',wheelPhysics:true};");

for(const r of ['Polygon Rush v15.5 Wheel Physics Rebuild','const WHEEL_PHYS=','car._wheelPhysics=wheelStates','w.userData.rim.rotation.y=w.userData.spin','Physics backend: WHEEL PHYSICS','wheelPhysics:true'])must(s.includes(r),'v15.5 missing '+r);
for(const bad of ["solver:'arcade'","$('#box3dHud').textContent='ARCADE'"])must(!s.includes(bad),'v15.5 stale '+bad);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5 wheel physics rebuild applied');
