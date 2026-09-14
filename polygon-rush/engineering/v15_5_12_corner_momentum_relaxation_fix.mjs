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

s=s.replaceAll('Polygon Rush v15.5.11 Slip Traction + Brake Physics','Polygon Rush v15.5.12 Corner Momentum + Tire Relaxation');
s=s.replaceAll('v15.5.11 • SLIP TRACTION + BRAKE PHYSICS','v15.5.12 • CORNER MOMENTUM + TIRE RELAXATION');
s=s.replaceAll("version:'15.5.11'","version:'15.5.12'");

s=s.replace('wheelInertia:6.5, driveWheelTorque:2350, brakeWheelTorque:2600, longSlipStiffness:6.0, absSlip:.12, tcSlip:.24,',
`wheelInertia:6.5, driveWheelTorque:2350, brakeWheelTorque:2600, longSlipStiffness:6.0, absSlip:.12, tcSlip:.24,
 tireRelaxLength:1.35, tireRelaxFloor:3.2, loadTransferRate:4.2, cornerForceGain:1.08, yawDampBase:.48, yawDampSpeed:.0045,`);

replaceFunction('applyArcadeMovement',`function applyArcadeMovement(car,controls,dt){
 ensureMoveState(car);dt=Math.min(dt,.02);
 car.yawRate??=0;car._steerAngle??=0;car._driveThrottle??=0;car._longAccel??=0;car._latAccel??=0;
 car._wheelOmega??=[0,0,0,0];car._tireLatForce??=[0,0,0,0];car._latLoadState??=0;car._longLoadState??=0;
 const mass=clamp(car.mass||WHEEL_PHYS.mass,760,2200);
 const L=WHEEL_PHYS.wheelBase,T=WHEEL_PHYS.track,R=WHEEL_PHYS.wheelRadius,g=9.81;
 const inertia=mass*(WHEEL_PHYS.vehicleLength*WHEEL_PHYS.vehicleLength+WHEEL_PHYS.vehicleWidth*WHEEL_PHYS.vehicleWidth)/12*WHEEL_PHYS.yawInertiaScale;
 const lv0=localVelocity(car),speedAbs=Math.abs(lv0.long),rawSteer=clamp(controls.steer||0,-1,1);
 const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.14);
 const speedAuthority=clamp(1.00-speedAbs*speedAbs/3200,.34,1.00);
 const rackTarget=steerCurve*WHEEL_PHYS.steerMax*speedAuthority;
 const rackRate=9.2*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.78,1.15);
 car._steerAngle+=(rackTarget-car._steerAngle)*(1-Math.exp(-rackRate*dt));
 const rack=car._steerAngle,absRack=Math.abs(rack);
 let steerLeft=0,steerRight=0;
 if(absRack>.0001){
  const turnR=L/Math.max(.001,Math.tan(absRack));
  const ackInner=Math.atan(L/Math.max(.25,turnR-T*.5)),ackOuter=Math.atan(L/(turnR+T*.5)),sgn=Math.sign(rack);
  const inner=absRack+(ackInner-absRack)*.40,outer=absRack+(ackOuter-absRack)*.40;
  steerLeft=sgn*(sgn>0?inner:outer);steerRight=sgn*(sgn>0?outer:inner);
 }
 const throttle=clamp(controls.throttle||0,0,1),brake=clamp(controls.brake||0,0,1),handbrake=controls.handbrake||0;
 const throttleRate=throttle>car._driveThrottle?6.4:9.0;
 car._driveThrottle+=(throttle-car._driveThrottle)*(1-Math.exp(-throttleRate*dt));
 const c=Math.cos(car.heading),si=Math.sin(car.heading);
 let fx=0,fz=0,torqueY=0,groundSum=0,contactCount=0,totalLat=0,totalLong=0,totalNormal=0;
 const wheelStates=[];
 const staticFront=clamp(.5-WHEEL_PHYS.cgZ/L,.42,.58),staticRear=1-staticFront;
 car._longLoadState+=(car._longAccel-car._longLoadState)*(1-Math.exp(-WHEEL_PHYS.loadTransferRate*dt));
 car._latLoadState+=(car._latAccel-car._latLoadState)*(1-Math.exp(-WHEEL_PHYS.loadTransferRate*dt));
 const longitudinalTransfer=mass*car._longLoadState*WHEEL_PHYS.cgHeight/L;
 const lateralTransfer=mass*car._latLoadState*WHEEL_PHYS.cgHeight/T;
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
  const axleGripBias=front?1.00:1.08;
  const mu=WHEEL_PHYS.tireMu*surfaceGrip*axleGripBias*clamp(1.04-(loadRatio-1)*.07,.88,1.10);
  const maxForce=Math.max(850,normal*mu);
  const slipAngle=Math.atan2(vLat,Math.abs(vLong)+1.8);
  const brakeRearSupport=!front?1+brake*.16:1;
  const cornerK=WHEEL_PHYS.tireCorner*WHEEL_PHYS.cornerForceGain*clamp(loadRatio,.58,1.50)*(front?1.00:1.10)*brakeRearSupport;
  const targetLat=clamp(-cornerK*slipAngle,-maxForce,maxForce);
  const relaxRate=clamp(Math.abs(vLong)/WHEEL_PHYS.tireRelaxLength,WHEEL_PHYS.tireRelaxFloor,10.5);
  const latBlend=1-Math.exp(-relaxRate*dt);
  let latForce=(car._tireLatForce[wi]||0)+(targetLat-(car._tireLatForce[wi]||0))*latBlend;
  if(handbrake&&!front)latForce*=.28;

  let omega=Number.isFinite(car._wheelOmega[wi])?car._wheelOmega[wi]:vLong/R;
  if(Math.abs(omega)<.001&&Math.abs(vLong)>.25)omega=vLong/R;
  let driveTorque=0;
  if(!front&&car._driveThrottle>.001){
   const torqueCurve=clamp(1.15-Math.abs(vLong)/94,.42,1.08);
   driveTorque=car._driveThrottle*WHEEL_PHYS.driveWheelTorque*torqueCurve;
  }
  let omegaDrive=omega+(driveTorque/WHEEL_PHYS.wheelInertia)*dt;
  if(!front&&driveTorque>0){
   const driveDen=Math.max(3.5,Math.abs(vLong));
   const omegaLimit=(vLong+WHEEL_PHYS.tcSlip*driveDen)/R;
   if(omegaDrive>omegaLimit){omegaDrive=omegaLimit;driveTorque=Math.max(0,(omegaDrive-omega)*WHEEL_PHYS.wheelInertia/Math.max(dt,.001))}
  }
  const brakeBias=front?.66:.34;
  let brakeTorque=brake*WHEEL_PHYS.brakeWheelTorque*brakeBias;
  if(handbrake&&!front)brakeTorque=Math.max(brakeTorque,WHEEL_PHYS.brakeWheelTorque*.78);
  const rotSign=Math.abs(omegaDrive)>.30?Math.sign(omegaDrive):(Math.abs(vLong)>.1?Math.sign(vLong):1);
  let omegaFree=omegaDrive-(rotSign*brakeTorque/WHEEL_PHYS.wheelInertia)*dt;
  if(brake>.001&&!handbrake&&Math.abs(vLong)>1.0){
   const absTarget=(vLong/R)*(1-WHEEL_PHYS.absSlip);
   if(vLong>0&&omegaFree<absTarget){omegaFree=absTarget;brakeTorque=Math.max(0,(omegaDrive-omegaFree)*WHEEL_PHYS.wheelInertia/Math.max(dt,.001))}
   if(vLong<0&&omegaFree>absTarget){omegaFree=absTarget;brakeTorque=Math.max(0,(omegaFree-omegaDrive)*WHEEL_PHYS.wheelInertia/Math.max(dt,.001))}
  }
  const slipDen=Math.max(3.5,Math.abs(vLong),Math.abs(omegaFree*R));
  const slipRatio=(omegaFree*R-vLong)/slipDen;
  let longForce=maxForce*Math.tanh(slipRatio*WHEEL_PHYS.longSlipStiffness);
  const combined=Math.hypot(longForce,latForce),combinedScale=combined>maxForce?maxForce/combined:1;
  longForce*=combinedScale;latForce*=combinedScale;
  car._tireLatForce[wi]=latForce;
  omega=omegaFree-(longForce*R/WHEEL_PHYS.wheelInertia)*dt;
  if(!front&&driveTorque>0&&vLong>1)omega=Math.max(omega,(vLong/R)*.985);
  if(brake>.001&&Math.sign(omega)!==rotSign&&Math.abs(vLong)<1.0)omega=0;
  car._wheelOmega[wi]=omega;
  const wfx=wfX*longForce+wrX*latForce,wfz=wfZ*longForce+wrZ*latForce;
  fx+=wfx;fz+=wfz;torqueY+=rz*wfx-rx*wfz;totalLat+=Math.abs(latForce);totalLong+=Math.abs(longForce);totalNormal+=normal;
  const comp=clamp(.5+(sample.y-(car.pos.y-WHEEL_PHYS.bodyRideHeight))*1.7+(loadRatio-1)*.075,0,1);
  wheelStates.push({vLong,vLat,slipAngle,slipRatio,longForce,latForce,targetLat,normalForce:normal,gripLimit:maxForce,steer:wheelSteer,spin:omega,compression:comp,surface:sample.type,rx,rz,driveTorque,brakeTorque,relaxRate});
 }
 const speed=Math.hypot(car.vel.x,car.vel.z),aero=WHEEL_PHYS.aeroDrag*speed*speed;
 if(speed>.001){fx-=car.vel.x/speed*aero;fz-=car.vel.z/speed*aero}
 const rollingMag=Math.min(speed*WHEEL_PHYS.rollingResistance,mass*g*.018);
 if(speed>.05){fx-=car.vel.x/speed*rollingMag;fz-=car.vel.z/speed*rollingMag}
 const ax=fx/mass,az=fz/mass;car.vel.x+=ax*dt;car.vel.z+=az*dt;
 const forwardX=Math.sin(car.heading),forwardZ=Math.cos(car.heading),rightX=Math.cos(car.heading),rightZ=-Math.sin(car.heading);
 const longAccel=ax*forwardX+az*forwardZ,latAccel=ax*rightX+az*rightZ;
 car._longAccel+=(longAccel-car._longAccel)*(1-Math.exp(-6.0*dt));
 car._latAccel+=(latAccel-car._latAccel)*(1-Math.exp(-5.0*dt));
 car.yawRate+=torqueY/inertia*dt;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed)*dt);
 car.heading=wrapAngle(car.heading+car.yawRate*dt);
 car.pos.x+=car.vel.x*dt;car.pos.z+=car.vel.z*dt;
 const avgGround=groundSum/Math.max(1,contactCount),targetY=avgGround+WHEEL_PHYS.bodyRideHeight;
 car.pos.y+=(targetY-car.pos.y)*Math.min(1,dt*WHEEL_PHYS.suspensionRate);
 car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal,inertia,mass,cgHeight:WHEEL_PHYS.cgHeight,latLoad:car._latLoadState,longLoad:car._longLoadState};
 const lv=localVelocity(car);car.speed=lv.long;car.steer=car._steerAngle/WHEEL_PHYS.steerMax;car.slip=Math.atan2(Math.abs(lv.lat),Math.abs(lv.long)+.25);
 const near=nearestTrack(car.pos),surf=sampleTrackSurface(car.pos);return {surf,near,lv,surface:surf.type};
}`);

const hook="window.__polygonRush={version:'15.5.12',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'v15.5.12 diagnostic hook missing');
s=s.replace(hook,hook+`testCornerMomentum:()=>{const idx=236,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=()=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*22,0,Math.cos(h)*22),heading:h,speed:22,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const car=mk();let early=0,late=0,peakLatV=0;for(let i=0;i<72;i++){applyArcadeMovement(car,{throttle:.25,brake:0,steer:.58,handbrake:0,nitro:false},1/60);const lf=(car._forceTelemetry?.totalLat||0);if(i<8)early=Math.max(early,lf);if(i>28)late=Math.max(late,lf);peakLatV=Math.max(peakLatV,Math.abs(localVelocity(car).lat))}const heading=Math.abs(wrapAngle(car.heading-h)),before=Math.abs(localVelocity(car).lat),beforeSlip=car.slip||0;for(let i=0;i<10;i++)applyArcadeMovement(car,{throttle:.2,brake:0,steer:0,handbrake:0,nitro:false},1/60);const shortly=Math.abs(localVelocity(car).lat);for(let i=0;i<80;i++)applyArcadeMovement(car,{throttle:.15,brake:0,steer:0,handbrake:0,nitro:false},1/60);const settled=Math.abs(localVelocity(car).lat);return {earlyLatForce:early,lateLatForce:late,headingChange:heading,peakLatVelocity:peakLatV,beforeReleaseLat:before,shortlyAfterReleaseLat:shortly,settledLat:settled,beforeSlip,finalSlip:car.slip||0}},`);

for(const r of ['Polygon Rush v15.5.12 Corner Momentum + Tire Relaxation','tireRelaxLength:1.35','loadTransferRate:4.2','targetLat','relaxRate','testCornerMomentum:()=>'])must(s.includes(r),'v15.5.12 missing '+r);
fs.writeFileSync(file,s);console.log('Polygon Rush v15.5.12 corner momentum + tire relaxation applied');
