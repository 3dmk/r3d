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

s=s.replaceAll('Polygon Rush v15.5.9 Force Wheel Contact','Polygon Rush v15.5.10 Wheel Steering + CG Physics');
s=s.replaceAll('v15.5.9 • FORCE WHEEL CONTACT','v15.5.10 • WHEEL STEERING + CG PHYSICS');
s=s.replaceAll("version:'15.5.9'","version:'15.5.10'");

s=s.replace('tireMu:1.34, tireCorner:14500, tireLong:11800, drivetrain:1.14, wheelLoadTransfer:.16, collisionFriction:.52, collisionRestitution:.12,',
`tireMu:1.34, tireCorner:14500, tireLong:11800, drivetrain:1.14, wheelLoadTransfer:.16, collisionFriction:.52, collisionRestitution:.12,
 vehicleLength:4.45, vehicleWidth:2.15, cgHeight:.62, cgZ:-.08, yawInertiaScale:1.0, steerRackRate:7.0,`);

replaceFunction('applyArcadeMovement',`function applyArcadeMovement(car,controls,dt){
 ensureMoveState(car);dt=Math.min(dt,.02);
 car.yawRate??=0;car._steerAngle??=0;car._driveThrottle??=0;car._longAccel??=0;car._latAccel??=0;
 const mass=clamp(car.mass||WHEEL_PHYS.mass,760,2200);
 const L=WHEEL_PHYS.wheelBase,T=WHEEL_PHYS.track,g=9.81;
 const inertia=mass*(WHEEL_PHYS.vehicleLength*WHEEL_PHYS.vehicleLength+WHEEL_PHYS.vehicleWidth*WHEEL_PHYS.vehicleWidth)/12*WHEEL_PHYS.yawInertiaScale;
 const lv0=localVelocity(car),speedAbs=Math.abs(lv0.long),rawSteer=clamp(controls.steer||0,-1,1);
 const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.48);
 const speedAuthority=clamp(1.0-speedAbs*speedAbs/2850,.30,1);
 const rackTarget=steerCurve*WHEEL_PHYS.steerMax*speedAuthority;
 const rackRate=WHEEL_PHYS.steerRackRate*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.72,1.18);
 car._steerAngle+=(rackTarget-car._steerAngle)*(1-Math.exp(-rackRate*dt));
 const rack=car._steerAngle,absRack=Math.abs(rack);
 let steerLeft=0,steerRight=0;
 if(absRack>.0001){
  const turnR=L/Math.max(.001,Math.tan(absRack));
  const inner=Math.atan(L/Math.max(.25,turnR-T*.5)),outer=Math.atan(L/(turnR+T*.5)),sgn=Math.sign(rack);
  steerLeft=sgn*(sgn>0?inner:outer);steerRight=sgn*(sgn>0?outer:inner);
 }
 const throttle=clamp(controls.throttle||0,0,1),brake=clamp(controls.brake||0,0,1),handbrake=controls.handbrake||0;
 const throttleRate=throttle>car._driveThrottle?5.4:7.8;
 car._driveThrottle+=(throttle-car._driveThrottle)*(1-Math.exp(-throttleRate*dt));
 const c=Math.cos(car.heading),si=Math.sin(car.heading);
 let fx=0,fz=0,torqueY=0,groundSum=0,contactCount=0,totalLat=0,totalLong=0,totalNormal=0;
 const wheelStates=[];
 const staticFront=clamp(.5-WHEEL_PHYS.cgZ/L,.42,.58),staticRear=1-staticFront;
 const longitudinalTransfer=mass*car._longAccel*WHEEL_PHYS.cgHeight/L;
 const lateralTransfer=mass*car._latAccel*WHEEL_PHYS.cgHeight/T;
 for(let wi=0;wi<4;wi++){
  const left=wi<2,front=(wi%2)===1,lx=(left?-1:1)*T*.5,lz=(front?1:-1)*L*.5-WHEEL_PHYS.cgZ;
  const rx=lx*c+lz*si,rz=-lx*si+lz*c,wx=car.pos.x+rx,wz=car.pos.z+rz;
  const sample=sampleTrackSurface({x:wx,z:wz});groundSum+=sample.y;contactCount++;
  const wheelSteer=front?(left?steerLeft:steerRight):0;
  const wa=car.heading+wheelSteer,wfX=Math.sin(wa),wfZ=Math.cos(wa),wrX=Math.cos(wa),wrZ=-Math.sin(wa);
  const pvx=car.vel.x+car.yawRate*rz,pvz=car.vel.z-car.yawRate*rx;
  const vLong=pvx*wfX+pvz*wfZ,vLat=pvx*wrX+pvz*wrZ;
  const axleStatic=mass*g*(front?staticFront:staticRear);
  const axleDynamic=axleStatic+(front?-longitudinalTransfer:longitudinalTransfer);
  const sideTransfer=(left?-1:1)*lateralTransfer*.5;
  const normal=Math.max(mass*g*.08,axleDynamic*.5+sideTransfer);
  const surfaceGrip=clamp(terrainGrip(sample.type),.30,1.35)*(1-car.suspensionDamage*.32);
  const loadRatio=normal/(mass*g*.25);
  const loadSensitiveMu=WHEEL_PHYS.tireMu*surfaceGrip*clamp(1.04-(loadRatio-1)*.07,.88,1.10);
  const maxForce=Math.max(850,normal*loadSensitiveMu);
  const slipAngle=Math.atan2(vLat,Math.abs(vLong)+1.8);
  const cornerK=WHEEL_PHYS.tireCorner*clamp(loadRatio,.55,1.55)*(front?1.05:.96);
  let latForce=-Math.tanh(slipAngle*4.2)*cornerK;
  let longForce=0;
  if(!front&&car._driveThrottle>.001){
   const torqueCurve=clamp(1.18-Math.abs(vLong)/86,.46,1.12);
   longForce+=car._driveThrottle*WHEEL_PHYS.driveForce*WHEEL_PHYS.drivetrain*.5*torqueCurve;
  }
  if(brake>.001){const sign=Math.abs(vLong)>.15?Math.sign(vLong):1;longForce-=sign*WHEEL_PHYS.brakeForce*brake*.25}
  const rolling=Math.min(Math.abs(vLong)*WHEEL_PHYS.tireLong*.022,normal*.05);longForce-=Math.sign(vLong||1)*rolling;
  if(handbrake&&!front){latForce*=.24;longForce-=Math.sign(vLong||1)*normal*.20}
  const demand=Math.hypot(longForce,latForce),scale=demand>maxForce?maxForce/demand:1;longForce*=scale;latForce*=scale;
  const wfx=wfX*longForce+wrX*latForce,wfz=wfZ*longForce+wrZ*latForce;
  fx+=wfx;fz+=wfz;torqueY+=rz*wfx-rx*wfz;totalLat+=Math.abs(latForce);totalLong+=Math.abs(longForce);totalNormal+=normal;
  const comp=clamp(.5+(sample.y-(car.pos.y-WHEEL_PHYS.bodyRideHeight))*1.7+(loadRatio-1)*.075,0,1);
  wheelStates.push({vLong,vLat,slipAngle,longForce,latForce,normalForce:normal,gripLimit:maxForce,steer:wheelSteer,spin:vLong/WHEEL_PHYS.wheelRadius,compression:comp,surface:sample.type,rx,rz});
 }
 const speed=Math.hypot(car.vel.x,car.vel.z),aero=WHEEL_PHYS.aeroDrag*speed*speed;
 if(speed>.001){fx-=car.vel.x/speed*aero;fz-=car.vel.z/speed*aero}
 const ax=fx/mass,az=fz/mass;car.vel.x+=ax*dt;car.vel.z+=az*dt;
 const forwardX=Math.sin(car.heading),forwardZ=Math.cos(car.heading),rightX=Math.cos(car.heading),rightZ=-Math.sin(car.heading);
 const longAccel=ax*forwardX+az*forwardZ,latAccel=ax*rightX+az*rightZ;
 car._longAccel+=(longAccel-car._longAccel)*(1-Math.exp(-8*dt));car._latAccel+=(latAccel-car._latAccel)*(1-Math.exp(-8*dt));
 car.yawRate+=torqueY/inertia*dt;
 // Chassis heading changes only from wheel/contact torque. This is rotational drag, not steering assistance.
 car.yawRate*=Math.exp(-(.22+speedAbs*.004)*dt);
 car.heading=wrapAngle(car.heading+car.yawRate*dt);
 car.pos.x+=car.vel.x*dt;car.pos.z+=car.vel.z*dt;
 const avgGround=groundSum/Math.max(1,contactCount),targetY=avgGround+WHEEL_PHYS.bodyRideHeight;
 car.pos.y+=(targetY-car.pos.y)*Math.min(1,dt*WHEEL_PHYS.suspensionRate);
 car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal,inertia,mass,cgHeight:WHEEL_PHYS.cgHeight};
 const lv=localVelocity(car);car.speed=lv.long;car.steer=car._steerAngle/WHEEL_PHYS.steerMax;car.slip=Math.atan2(Math.abs(lv.lat),Math.abs(lv.long)+.25);
 const near=nearestTrack(car.pos),surf=sampleTrackSurface(car.pos);return {surf,near,lv,surface:surf.type};
}`);

const hook="window.__polygonRush={version:'15.5.10',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'v15.5.10 diagnostic hook missing');
s=s.replace(hook,hook+`testWheelSteeringTorque:()=>{const idx=238,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(mass=1180)=>({mass,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*24,0,Math.cos(h)*24),heading:h,speed:24,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const straight=mk(),turn=mk();for(let i=0;i<45;i++){applyArcadeMovement(straight,{throttle:.2,brake:0,steer:0,handbrake:0,nitro:false},1/60);applyArcadeMovement(turn,{throttle:.2,brake:0,steer:.72,handbrake:0,nitro:false},1/60)}const front=turn._wheelPhysics.filter((w,i)=>i===1||i===3);return {straightYaw:Math.abs(straight.yawRate),turnYaw:Math.abs(turn.yawRate),torque:Math.abs(turn._forceTelemetry?.torqueY||0),frontLat:front.reduce((a,w)=>a+Math.abs(w.latForce),0),leftSteer:front[0]?.steer||0,rightSteer:front[1]?.steer||0,headingChange:Math.abs(wrapAngle(turn.heading-h)),inertia:turn._forceTelemetry?.inertia||0,mass:turn._forceTelemetry?.mass||0}},testMassPhysics:()=>{const idx=242,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(mass)=>({mass,pos:p.clone(),vel:new THREE.Vector3(),heading:h,speed:0,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const light=mk(900),heavy=mk(1700);for(let i=0;i<90;i++){applyArcadeMovement(light,{throttle:1,brake:0,steer:0,handbrake:0,nitro:false},1/60);applyArcadeMovement(heavy,{throttle:1,brake:0,steer:0,handbrake:0,nitro:false},1/60)}return {lightSpeed:Math.abs(localVelocity(light).long),heavySpeed:Math.abs(localVelocity(heavy).long),lightInertia:light._forceTelemetry?.inertia||0,heavyInertia:heavy._forceTelemetry?.inertia||0,lightMass:light._forceTelemetry?.mass||0,heavyMass:heavy._forceTelemetry?.mass||0}},`);

for(const r of ['Polygon Rush v15.5.10 Wheel Steering + CG Physics','vehicleLength:4.45','cgHeight:.62','yawInertiaScale:1.0','const inertia=mass*','steerLeft','steerRight','testWheelSteeringTorque:()=>','testMassPhysics:()=>'])must(s.includes(r),'v15.5.10 missing '+r);
fs.writeFileSync(file,s);console.log('Polygon Rush v15.5.10 wheel steering + CG physics applied');
