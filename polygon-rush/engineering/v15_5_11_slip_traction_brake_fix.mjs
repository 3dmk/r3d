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

s=s.replaceAll('Polygon Rush v15.5.10 Wheel Steering + CG Physics','Polygon Rush v15.5.11 Slip Traction + Brake Physics');
s=s.replaceAll('v15.5.10 • WHEEL STEERING + CG PHYSICS','v15.5.11 • SLIP TRACTION + BRAKE PHYSICS');
s=s.replaceAll("version:'15.5.10'","version:'15.5.11'");

s=s.replace('vehicleLength:4.45, vehicleWidth:2.15, cgHeight:.62, cgZ:-.08, yawInertiaScale:1.0, steerRackRate:7.0,',
`vehicleLength:4.45, vehicleWidth:2.15, cgHeight:.62, cgZ:-.08, yawInertiaScale:1.0, steerRackRate:10.5,
 wheelInertia:4.0, driveWheelTorque:2200, brakeWheelTorque:3200, longSlipStiffness:6.2, absSlip:.17, tcSlip:.20,`);

replaceFunction('applyArcadeMovement',`function applyArcadeMovement(car,controls,dt){
 ensureMoveState(car);dt=Math.min(dt,.02);
 car.yawRate??=0;car._steerAngle??=0;car._driveThrottle??=0;car._longAccel??=0;car._latAccel??=0;
 car._wheelOmega??=[0,0,0,0];
 const mass=clamp(car.mass||WHEEL_PHYS.mass,760,2200);
 const L=WHEEL_PHYS.wheelBase,T=WHEEL_PHYS.track,R=WHEEL_PHYS.wheelRadius,g=9.81;
 const inertia=mass*(WHEEL_PHYS.vehicleLength*WHEEL_PHYS.vehicleLength+WHEEL_PHYS.vehicleWidth*WHEEL_PHYS.vehicleWidth)/12*WHEEL_PHYS.yawInertiaScale;
 const lv0=localVelocity(car),speedAbs=Math.abs(lv0.long),rawSteer=clamp(controls.steer||0,-1,1);
 const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.25);
 const speedAuthority=clamp(.99-speedAbs*speedAbs/2450,.30,.99);
 const rackTarget=steerCurve*WHEEL_PHYS.steerMax*speedAuthority;
 const rackRate=WHEEL_PHYS.steerRackRate*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.76,1.16);
 car._steerAngle+=(rackTarget-car._steerAngle)*(1-Math.exp(-rackRate*dt));
 const rack=car._steerAngle,absRack=Math.abs(rack);
 let steerLeft=0,steerRight=0;
 if(absRack>.0001){
  const turnR=L/Math.max(.001,Math.tan(absRack));
  const ackInner=Math.atan(L/Math.max(.25,turnR-T*.5)),ackOuter=Math.atan(L/(turnR+T*.5)),sgn=Math.sign(rack);
  const inner=absRack+(ackInner-absRack)*.44,outer=absRack+(ackOuter-absRack)*.44;
  steerLeft=sgn*(sgn>0?inner:outer);steerRight=sgn*(sgn>0?outer:inner);
 }
 const throttle=clamp(controls.throttle||0,0,1),brake=clamp(controls.brake||0,0,1),handbrake=controls.handbrake||0;
 const throttleRate=throttle>car._driveThrottle?6.2:8.8;
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
  const axleGripBias=front?.98:1.06;
  const mu=WHEEL_PHYS.tireMu*surfaceGrip*axleGripBias*clamp(1.04-(loadRatio-1)*.07,.88,1.10);
  const maxForce=Math.max(850,normal*mu);
  const slipAngle=Math.atan2(vLat,Math.abs(vLong)+1.7);
  const cornerK=WHEEL_PHYS.tireCorner*clamp(loadRatio,.55,1.55)*(front?.96:1.08);
  let latForce=-Math.tanh(slipAngle*4.25)*cornerK;

  let omega=Number.isFinite(car._wheelOmega[wi])?car._wheelOmega[wi]:vLong/R;
  if(Math.abs(omega)<.001&&Math.abs(vLong)>.25)omega=vLong/R;
  const baseSlip=(omega*R-vLong)/Math.max(1.5,Math.abs(vLong),Math.abs(omega*R));
  let driveTorque=0;
  if(!front&&car._driveThrottle>.001){
   const torqueCurve=clamp(1.15-Math.abs(vLong)/92,.42,1.08);
   const tcScale=baseSlip>WHEEL_PHYS.tcSlip?clamp(1-(baseSlip-WHEEL_PHYS.tcSlip)*2.4,.28,1):1;
   driveTorque=car._driveThrottle*WHEEL_PHYS.driveWheelTorque*torqueCurve*tcScale;
  }
  let brakeTorque=brake*WHEEL_PHYS.brakeWheelTorque*(front?.58:.42);
  if(handbrake&&!front)brakeTorque=Math.max(brakeTorque,WHEEL_PHYS.brakeWheelTorque*.72);
  const rotSign=Math.abs(omega)>.35?Math.sign(omega):(Math.abs(vLong)>.1?Math.sign(vLong):1);
  const omegaDrive=omega+(driveTorque/WHEEL_PHYS.wheelInertia)*dt;
  let omegaFree=omegaDrive-(rotSign*brakeTorque/WHEEL_PHYS.wheelInertia)*dt;
  let slipRatio=(omegaFree*R-vLong)/Math.max(1.5,Math.abs(vLong),Math.abs(omegaFree*R));
  if(brake>.001&&slipRatio<-WHEEL_PHYS.absSlip){
   const absScale=clamp(WHEEL_PHYS.absSlip/Math.max(WHEEL_PHYS.absSlip,Math.abs(slipRatio)),.16,1);
   brakeTorque*=absScale;
   omegaFree=omegaDrive-(rotSign*brakeTorque/WHEEL_PHYS.wheelInertia)*dt;
   slipRatio=(omegaFree*R-vLong)/Math.max(1.5,Math.abs(vLong),Math.abs(omegaFree*R));
  }
  let longForce=maxForce*Math.tanh(slipRatio*WHEEL_PHYS.longSlipStiffness);
  const combined=Math.hypot(longForce,latForce),combinedScale=combined>maxForce?maxForce/combined:1;
  longForce*=combinedScale;latForce*=combinedScale;
  omega=omegaFree-(longForce*R/WHEEL_PHYS.wheelInertia)*dt;
  if(brake>.001&&Math.sign(omega)!==rotSign&&Math.abs(vLong)<1.2)omega=0;
  car._wheelOmega[wi]=omega;

  const wfx=wfX*longForce+wrX*latForce,wfz=wfZ*longForce+wrZ*latForce;
  fx+=wfx;fz+=wfz;torqueY+=rz*wfx-rx*wfz;totalLat+=Math.abs(latForce);totalLong+=Math.abs(longForce);totalNormal+=normal;
  const comp=clamp(.5+(sample.y-(car.pos.y-WHEEL_PHYS.bodyRideHeight))*1.7+(loadRatio-1)*.075,0,1);
  wheelStates.push({vLong,vLat,slipAngle,slipRatio,longForce,latForce,normalForce:normal,gripLimit:maxForce,steer:wheelSteer,spin:omega,compression:comp,surface:sample.type,rx,rz,driveTorque,brakeTorque});
 }
 const speed=Math.hypot(car.vel.x,car.vel.z),aero=WHEEL_PHYS.aeroDrag*speed*speed;
 if(speed>.001){fx-=car.vel.x/speed*aero;fz-=car.vel.z/speed*aero}
 const rollingMag=Math.min(speed*WHEEL_PHYS.rollingResistance,mass*g*.018);
 if(speed>.05){fx-=car.vel.x/speed*rollingMag;fz-=car.vel.z/speed*rollingMag}
 const ax=fx/mass,az=fz/mass;car.vel.x+=ax*dt;car.vel.z+=az*dt;
 const forwardX=Math.sin(car.heading),forwardZ=Math.cos(car.heading),rightX=Math.cos(car.heading),rightZ=-Math.sin(car.heading);
 const longAccel=ax*forwardX+az*forwardZ,latAccel=ax*rightX+az*rightZ;
 car._longAccel+=(longAccel-car._longAccel)*(1-Math.exp(-8*dt));car._latAccel+=(latAccel-car._latAccel)*(1-Math.exp(-8*dt));
 car.yawRate+=torqueY/inertia*dt;
 car.yawRate*=Math.exp(-(.72+speedAbs*.006)*dt);
 car.heading=wrapAngle(car.heading+car.yawRate*dt);
 car.pos.x+=car.vel.x*dt;car.pos.z+=car.vel.z*dt;
 const avgGround=groundSum/Math.max(1,contactCount),targetY=avgGround+WHEEL_PHYS.bodyRideHeight;
 car.pos.y+=(targetY-car.pos.y)*Math.min(1,dt*WHEEL_PHYS.suspensionRate);
 car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal,inertia,mass,cgHeight:WHEEL_PHYS.cgHeight};
 const lv=localVelocity(car);car.speed=lv.long;car.steer=car._steerAngle/WHEEL_PHYS.steerMax;car.slip=Math.atan2(Math.abs(lv.lat),Math.abs(lv.long)+.25);
 const near=nearestTrack(car.pos),surf=sampleTrackSurface(car.pos);return {surf,near,lv,surface:surf.type};
}`);

const hook="window.__polygonRush={version:'15.5.11',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'v15.5.11 diagnostic hook missing');
s=s.replace(hook,hook+`testTractionBrakeSteer:()=>{const idx=238,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(v=0)=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*v,0,Math.cos(h)*v),heading:h,speed:v,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const acc=mk(0);let maxDriveSlip=0;for(let i=0;i<120;i++){applyArcadeMovement(acc,{throttle:1,brake:0,steer:0,handbrake:0,nitro:false},1/60);for(const w of acc._wheelPhysics||[])if(w.driveTorque>0)maxDriveSlip=Math.max(maxDriveSlip,Math.abs(w.slipRatio||0))}const steerCar=mk(18);for(let i=0;i<24;i++)applyArcadeMovement(steerCar,{throttle:.25,brake:0,steer:.55,handbrake:0,nitro:false},1/60);const steerAngle=Math.abs(steerCar._steerAngle||0),steerHeading=Math.abs(wrapAngle(steerCar.heading-h));const brakeCar=mk(24),brakeStart=Math.abs(localVelocity(brakeCar).long);let maxBrakeSlip=0,frontLat=0;for(let i=0;i<72;i++){applyArcadeMovement(brakeCar,{throttle:0,brake:.72,steer:.38,handbrake:0,nitro:false},1/60);for(let wi=0;wi<(brakeCar._wheelPhysics||[]).length;wi++){const w=brakeCar._wheelPhysics[wi];if(w.brakeTorque>0)maxBrakeSlip=Math.max(maxBrakeSlip,Math.abs(w.slipRatio||0));if(wi===1||wi===3)frontLat=Math.max(frontLat,Math.abs(w.latForce||0))}}return {accelSpeed:Math.abs(localVelocity(acc).long),maxDriveSlip,steerAngle,steerHeading,brakeStart,brakeEnd:Math.abs(localVelocity(brakeCar).long),brakeHeading:Math.abs(wrapAngle(brakeCar.heading-h)),maxBrakeSlip,frontLat}},`);

for(const r of ['Polygon Rush v15.5.11 Slip Traction + Brake Physics','wheelInertia:4.0','driveWheelTorque:2200','brakeWheelTorque:3200','longSlipStiffness:6.2','absSlip:.17','tcSlip:.20','slipRatio','testTractionBrakeSteer:()=>'])must(s.includes(r),'v15.5.11 missing '+r);
fs.writeFileSync(file,s);console.log('Polygon Rush v15.5.11 slip traction + brake physics applied');
