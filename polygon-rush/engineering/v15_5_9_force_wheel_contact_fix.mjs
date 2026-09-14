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

s=s.replaceAll('Polygon Rush v15.5.8 Natural Mass Dynamics','Polygon Rush v15.5.9 Force Wheel Contact');
s=s.replaceAll('v15.5.8 • NATURAL MASS DYNAMICS','v15.5.9 • FORCE WHEEL CONTACT');
s=s.replaceAll("version:'15.5.8'","version:'15.5.9'");

s=s.replace('massRef:1180, loadTransfer:.18, steerInertia:.76, velocityAlign:6.4, highSpeedGrip:.58,',
`massRef:1180, loadTransfer:.18, steerInertia:.76, velocityAlign:6.4, highSpeedGrip:.58,
 tireMu:1.34, tireCorner:14500, tireLong:11800, drivetrain:1.14, wheelLoadTransfer:.16, collisionFriction:.52, collisionRestitution:.12,`);

replaceFunction('applyArcadeMovement',`function applyArcadeMovement(car,controls,dt){
 ensureMoveState(car);dt=Math.min(dt,.02);
 car.yawRate??=0;car._steerAngle??=0;car._driveThrottle??=0;
 const mass=clamp(car.mass||WHEEL_PHYS.mass,760,2200),massRatio=mass/WHEEL_PHYS.mass;
 const inertia=WHEEL_PHYS.inertiaY*massRatio;
 const lv0=localVelocity(car),speedAbs=Math.abs(lv0.long),rawSteer=clamp(controls.steer||0,-1,1);
 const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.55);
 const steerAuthority=clamp(1.02-speedAbs*speedAbs/2600,.30,1);
 const steerTarget=steerCurve*WHEEL_PHYS.steerMax*steerAuthority;
 const steerRate=(Math.abs(rawSteer)>.02?6.4:7.8)/Math.sqrt(massRatio);
 car._steerAngle+=(steerTarget-car._steerAngle)*(1-Math.exp(-steerRate*dt));
 const throttle=clamp(controls.throttle||0,0,1),brake=clamp(controls.brake||0,0,1),handbrake=controls.handbrake||0;
 const throttleRate=throttle>car._driveThrottle?5.2:7.6;
 car._driveThrottle+=(throttle-car._driveThrottle)*(1-Math.exp(-throttleRate*dt));
 const c=Math.cos(car.heading),si=Math.sin(car.heading),g=9.81;
 let fx=0,fz=0,torqueY=0,groundSum=0,contactCount=0,totalLat=0,totalLong=0,totalNormal=0;
 const wheelStates=[];
 const accelGuess=car._longAccel||0;
 const frontLoad=clamp(.5-accelGuess*WHEEL_PHYS.wheelLoadTransfer/g,.34,.66),rearLoad=1-frontLoad;
 for(let wi=0;wi<4;wi++){
  const left=wi<2,front=(wi%2)===1,lx=(left?-1:1)*WHEEL_PHYS.track*.5,lz=(front?1:-1)*WHEEL_PHYS.wheelBase*.5;
  const rx=lx*c+lz*si,rz=-lx*si+lz*c,wx=car.pos.x+rx,wz=car.pos.z+rz;
  const sample=sampleTrackSurface({x:wx,z:wz});groundSum+=sample.y;contactCount++;
  const wa=car.heading+(front?car._steerAngle:0),wfX=Math.sin(wa),wfZ=Math.cos(wa),wrX=Math.cos(wa),wrZ=-Math.sin(wa);
  const pvx=car.vel.x+car.yawRate*rz,pvz=car.vel.z-car.yawRate*rx;
  const vLong=pvx*wfX+pvz*wfZ,vLat=pvx*wrX+pvz*wrZ;
  const surfaceGrip=clamp(terrainGrip(sample.type),.30,1.35)*(1-car.suspensionDamage*.32);
  const axleLoad=mass*g*(front?frontLoad:rearLoad),normal=axleLoad*.5;
  const mu=WHEEL_PHYS.tireMu*surfaceGrip;
  const maxForce=Math.max(900,normal*mu);
  const slipAngle=Math.atan2(vLat,Math.abs(vLong)+2.2);
  let latForce=-Math.tanh(slipAngle*4.6)*WHEEL_PHYS.tireCorner*(front?1.08:.94);
  let longForce=0;
  if(!front&&car._driveThrottle>.001){
   const torqueCurve=clamp(1.16-Math.abs(vLong)/82,.48,1.10);
   longForce+=car._driveThrottle*WHEEL_PHYS.driveForce*WHEEL_PHYS.drivetrain*.5*torqueCurve;
  }
  if(brake>.001){const sign=Math.abs(vLong)>.18?Math.sign(vLong):1;longForce-=sign*WHEEL_PHYS.brakeForce*brake*.25}
  const rolling=Math.min(Math.abs(vLong)*WHEEL_PHYS.tireLong*.025,normal*.055);longForce-=Math.sign(vLong||1)*rolling;
  if(handbrake&&!front){latForce*=.26;longForce-=Math.sign(vLong||1)*normal*.18}
  const demand=Math.hypot(longForce,latForce),scale=demand>maxForce?maxForce/demand:1;longForce*=scale;latForce*=scale;
  const wfx=wfX*longForce+wrX*latForce,wfz=wfZ*longForce+wrZ*latForce;
  fx+=wfx;fz+=wfz;torqueY+=rz*wfx-rx*wfz;totalLat+=Math.abs(latForce);totalLong+=Math.abs(longForce);totalNormal+=normal;
  const comp=clamp(.5+(sample.y-(car.pos.y-WHEEL_PHYS.bodyRideHeight))*1.7+(normal/(mass*g*.25)-1)*.07,0,1);
  wheelStates.push({vLong,vLat,slipAngle,longForce,latForce,normalForce:normal,gripLimit:maxForce,steer:front?car._steerAngle:0,spin:vLong/WHEEL_PHYS.wheelRadius,compression:comp,surface:sample.type});
 }
 const speed=Math.hypot(car.vel.x,car.vel.z),aero=WHEEL_PHYS.aeroDrag*speed*speed;
 if(speed>.001){fx-=car.vel.x/speed*aero;fz-=car.vel.z/speed*aero}
 const ax=fx/mass,az=fz/mass;car.vel.x+=ax*dt;car.vel.z+=az*dt;
 const longAccel=ax*Math.sin(car.heading)+az*Math.cos(car.heading);car._longAccel+=(longAccel-car._longAccel)*(1-Math.exp(-6*dt));
 car.yawRate+=torqueY/inertia*dt;car.yawRate*=Math.exp(-(1.45+speedAbs*.018)*dt);
 car.heading=wrapAngle(car.heading+car.yawRate*dt);
 car.pos.x+=car.vel.x*dt;car.pos.z+=car.vel.z*dt;
 const avgGround=groundSum/Math.max(1,contactCount),targetY=avgGround+WHEEL_PHYS.bodyRideHeight;
 car.pos.y+=(targetY-car.pos.y)*Math.min(1,dt*WHEEL_PHYS.suspensionRate);
 car._wheelPhysics=wheelStates;car._forceTelemetry={fx,fz,torqueY,totalLat,totalLong,totalNormal};
 const lv=localVelocity(car);car.speed=lv.long;car.steer=car._steerAngle/WHEEL_PHYS.steerMax;car.slip=Math.atan2(Math.abs(lv.lat),Math.abs(lv.long)+.25);
 const near=nearestTrack(car.pos),surf=sampleTrackSurface(car.pos);return {surf,near,lv,surface:surf.type};
}`);

replaceFunction('resolveCarCollision',`function resolveCarCollision(a,b){
 const r=MOVE.collisionRadius,ma=clamp(a.mass||WHEEL_PHYS.mass,760,2200),mb=clamp(b.mass||WHEEL_PHYS.mass,760,2200),ia=1/ma,ib=1/mb;
 for(let iter=0;iter<3;iter++){
  const dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z,d=Math.hypot(dx,dz);if(d<=.0001||d>=r)break;
  const nx=dx/d,nz=dz/d,pen=r-d,inv=ia+ib,cor=Math.max(0,pen-.006)*.82;
  a.pos.x+=nx*cor*(ia/inv);a.pos.z+=nz*cor*(ia/inv);b.pos.x-=nx*cor*(ib/inv);b.pos.z-=nz*cor*(ib/inv);
  const rvx=a.vel.x-b.vel.x,rvz=a.vel.z-b.vel.z,rel=rvx*nx+rvz*nz;if(rel>=0)continue;
  const j=-(1+WHEEL_PHYS.collisionRestitution)*rel/inv;
  a.vel.x+=nx*j*ia;a.vel.z+=nz*j*ia;b.vel.x-=nx*j*ib;b.vel.z-=nz*j*ib;
  const tx=-nz,tz=nx,relT=rvx*tx+rvz*tz,jt=clamp(-relT/inv,-j*WHEEL_PHYS.collisionFriction,j*WHEEL_PHYS.collisionFriction);
  a.vel.x+=tx*jt*ia;a.vel.z+=tz*jt*ia;b.vel.x-=tx*jt*ib;b.vel.z-=tz*jt*ib;
  const spin=clamp(relT*.012,-.7,.7);a.yawRate=(a.yawRate||0)+spin*(mb/(ma+mb));b.yawRate=(b.yawRate||0)-spin*(ma/(ma+mb));
  if(iter===0){applyImpactDamage(a,Math.abs(rel)/26,'collision');applyImpactDamage(b,Math.abs(rel)/26,'collision')}
 }
}`);

const hook="window.__polygonRush={version:'15.5.9',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testWheelForces:()=>{const idx=240,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(v=0)=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*v,0,Math.cos(h)*v),heading:h,speed:v,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const acc=mk(0);for(let i=0;i<120;i++)applyArcadeMovement(acc,{throttle:1,brake:0,steer:0,handbrake:0,nitro:false},1/60);const accelSpeed=Math.abs(localVelocity(acc).long),driveForce=acc._forceTelemetry?.totalLong||0;const turn=mk(25);for(let i=0;i<70;i++)applyArcadeMovement(turn,{throttle:.45,brake:0,steer:.7,handbrake:0,nitro:false},1/60);const st=turn._wheelPhysics||[],latForce=turn._forceTelemetry?.totalLat||0,maxWheelSlip=Math.max(...st.map(w=>Math.abs(w.slipAngle||0))),gripRatio=Math.max(...st.map(w=>Math.hypot(w.longForce,w.latForce)/Math.max(1,w.gripLimit)));return {accelSpeed,driveForce,latForce,maxWheelSlip,gripRatio,wheels:st.length,turnSlip:turn.slip||0}},`);
for(const r of ['Polygon Rush v15.5.9 Force Wheel Contact','tireMu:1.34','collisionFriction:.52','slipAngle','normalForce:normal','testWheelForces:()=>'])must(s.includes(r),'v15.5.9 missing '+r);
fs.writeFileSync(file,s);console.log('Polygon Rush v15.5.9 force wheel contact applied');
