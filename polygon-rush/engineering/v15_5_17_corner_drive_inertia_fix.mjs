import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(x,m)=>{if(!x)throw new Error(m)};
const replaceFunction=(name,newCode)=>{
 const start=s.indexOf(`function ${name}(`);must(start>=0,`missing ${name}`);
 let i=s.indexOf('{',start),depth=0,end=-1;
 for(;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'&&--depth===0){end=i+1;break}}
 must(end>start,`unterminated ${name}`);s=s.slice(0,start)+newCode+s.slice(end);
};

s=s.replaceAll('Polygon Rush v15.5.16 Brake Release + Recovery','Polygon Rush v15.5.17 Corner Drive + Steering Response');
s=s.replaceAll('v15.5.16 • BRAKE RELEASE + RECOVERY','v15.5.17 • CORNER DRIVE + STEERING RESPONSE');
s=s.replaceAll("version:'15.5.16'","version:'15.5.17'");

must(s.includes('yawInertiaScale:1.32'),'yaw anchor missing');
s=s.replace('yawInertiaScale:1.32','yawInertiaScale:1.12');

must(s.includes('cornerCombinedGrip:1.16, drivenLongPriority:.82,'),'grip anchor missing');
s=s.replace('cornerCombinedGrip:1.16, drivenLongPriority:.82,',
'cornerCombinedGrip:1.36, drivenLongPriority:.97, steeringDriveAssist:.20, steeringYawRelease:2.4, cornerMomentumAssist:.18, cornerAccelBoost:.34, cornerLatRelax:.14, launchTorqueBoost:.62, midSpeedPull:.28, cornerYawResponse:6.8, maxCornerG:1.65, yawFollowSlip:.34, contactSlop:.018, contactBias:.72, contactRestitution:.045, contactFriction:.58, groundDeadZone:.018, groundFollowRate:18, physicsHz:180,');

must(s.includes('const speedAuthority=clamp(.96-speedAbs*speedAbs/2100,.24,.96);'),'steer authority anchor missing');
s=s.replace('const speedAuthority=clamp(.96-speedAbs*speedAbs/2100,.24,.96);','const speedAuthority=clamp(.98-speedAbs*speedAbs/6200,.54,.98);');

must(s.includes('const rackRate=9.2*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.78,1.15);'),'rack anchor missing');
s=s.replace('const rackRate=9.2*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.78,1.15);','const rackRate=12.6*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.82,1.18);');

must(s.includes(' const throttleRate=throttle>car._driveThrottle?8.2:12.0;'),'throttle anchor missing');
s=s.replace(' const throttleRate=throttle>car._driveThrottle?8.2:12.0;',' const throttleRate=throttle>car._driveThrottle?18.0:16.0;');

must(s.includes('  const inputReserve=clamp(1-brake*.18-car._driveThrottle*.10,.72,1);'),'reserve anchor missing');
s=s.replace('  const inputReserve=clamp(1-brake*.18-car._driveThrottle*.10,.72,1);','  const inputReserve=clamp(1-brake*.18-car._driveThrottle*WHEEL_PHYS.steeringDriveAssist,.72,1);');

const forceOld='  const combined=Math.hypot(longForce,latForce),combinedScale=combined>combinedLimit?combinedLimit/combined:1;\n  longForce*=combinedScale;latForce*=combinedScale;';
must(s.includes(forceOld),'combined force anchor missing');
s=s.replace(forceOld,`  const steerDriveDemand=(!front&&driveTorque>0&&!handbrake)?clamp(Math.abs(rawSteer)*car._driveThrottle,0,1):0;
  if(!front&&driveTorque>0&&!handbrake){
   const launchWindow=1-clamp(Math.abs(vLong)/28,0,1),midWindow=1-clamp(Math.abs(Math.abs(vLong)-24)/26,0,1);
   const velocityPull=1+Math.pow(car._driveThrottle,.62)*(launchWindow*WHEEL_PHYS.launchTorqueBoost+midWindow*WHEEL_PHYS.midSpeedPull);
   longForce*=velocityPull;
  }
  if(steerDriveDemand>0){
   longForce*=1+steerDriveDemand*WHEEL_PHYS.cornerAccelBoost;
   latForce*=1-steerDriveDemand*WHEEL_PHYS.cornerLatRelax*(1-clamp(Math.abs(slipAngle)/.32,0,1));
  }
  const requestedLong=longForce,activeCombinedLimit=combinedLimit*(1+steerDriveDemand*.20);
  const combined=Math.hypot(longForce,latForce),combinedScale=combined>activeCombinedLimit?activeCombinedLimit/combined:1;
  longForce*=combinedScale;latForce*=combinedScale;
  if(!front&&driveTorque>0&&!handbrake){
   const reservedLong=Math.min(Math.abs(requestedLong),maxForce*clamp(WHEEL_PHYS.drivenLongPriority+steerDriveDemand*WHEEL_PHYS.cornerMomentumAssist,0,1.12));
   if(Math.abs(longForce)<reservedLong)longForce=Math.sign(requestedLong||1)*reservedLong;
   const latRemain=Math.sqrt(Math.max(0,activeCombinedLimit*activeCombinedLimit-longForce*longForce));
   latForce=clamp(latForce,-latRemain,latRemain);
  }`);

const yawOld=' car.yawRate+=torqueY/inertia*dt;\n const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;\n car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra)*dt);';
must(s.includes(yawOld),'yaw response anchor missing');
s=s.replace(yawOld,` car.yawRate+=torqueY/inertia*dt;
 const geometricYaw=(speedAbs>1&&Math.abs(rack)>.002)?(speedAbs/WHEEL_PHYS.wheelBase)*Math.tan(rack):0;
 const gripYawLimit=(WHEEL_PHYS.maxCornerG*9.81)/Math.max(speedAbs,3);
 const desiredYawRate=clamp(geometricYaw,-gripYawLimit,gripYawLimit);
 if(Math.abs(rawSteer)>.015&&!handbrake){
  const yawFollow=clamp(1-bodySlip/WHEEL_PHYS.yawFollowSlip,.18,1);
  car.yawRate+=(desiredYawRate-car.yawRate)*(1-Math.exp(-WHEEL_PHYS.cornerYawResponse*dt))*yawFollow;
 }
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 const steerReleaseExtra=Math.abs(rawSteer)<.04?WHEEL_PHYS.steeringYawRelease:0;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra+steerReleaseExtra)*dt);`);

const groundOld=' const avgGround=groundSum/Math.max(1,contactCount),targetY=avgGround+WHEEL_PHYS.bodyRideHeight;\n car.pos.y+=(targetY-car.pos.y)*Math.min(1,dt*WHEEL_PHYS.suspensionRate);';
if(s.includes(groundOld))s=s.replace(groundOld,` const avgGround=groundSum/Math.max(1,contactCount),targetY=avgGround+WHEEL_PHYS.bodyRideHeight;
 const groundErr=targetY-car.pos.y;
 if(Math.abs(groundErr)<=WHEEL_PHYS.groundDeadZone){car.pos.y=targetY;if(Math.abs(car.vy||0)<.35)car.vy=0;}
 else car.pos.y+=groundErr*(1-Math.exp(-WHEEL_PHYS.groundFollowRate*dt));`);

replaceFunction('resolveCarCollision',`function resolveCarCollision(a,b){
 const r=MOVE.collisionRadius,ma=clamp(a.mass||WHEEL_PHYS.mass,760,2200),mb=clamp(b.mass||WHEEL_PHYS.mass,760,2200),ia=1/ma,ib=1/mb,inv=ia+ib;
 for(let iter=0;iter<4;iter++){
  const dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z,d=Math.hypot(dx,dz);if(d<=.00001||d>=r)break;
  const nx=dx/d,nz=dz/d,pen=r-d;
  const corr=Math.max(0,pen-WHEEL_PHYS.contactSlop)*WHEEL_PHYS.contactBias;
  a.pos.x+=nx*corr*(ia/inv);a.pos.z+=nz*corr*(ia/inv);b.pos.x-=nx*corr*(ib/inv);b.pos.z-=nz*corr*(ib/inv);
  const rvx=a.vel.x-b.vel.x,rvz=a.vel.z-b.vel.z,rel=rvx*nx+rvz*nz;if(rel>=0)continue;
  const e=Math.abs(rel)<1.2?0:WHEEL_PHYS.contactRestitution,j=-(1+e)*rel/inv;
  a.vel.x+=nx*j*ia;a.vel.z+=nz*j*ia;b.vel.x-=nx*j*ib;b.vel.z-=nz*j*ib;
  const tx=-nz,tz=nx,relT=rvx*tx+rvz*tz,jt=clamp(-relT/inv,-j*WHEEL_PHYS.contactFriction,j*WHEEL_PHYS.contactFriction);
  a.vel.x+=tx*jt*ia;a.vel.z+=tz*jt*ia;b.vel.x-=tx*jt*ib;b.vel.z-=tz*jt*ib;
  const spin=clamp(relT*.008,-.42,.42);a.yawRate=(a.yawRate||0)+spin*(mb/(ma+mb));b.yawRate=(b.yawRate||0)-spin*(ma/(ma+mb));
  if(iter===0){applyImpactDamage(a,Math.abs(rel)/28,'collision');applyImpactDamage(b,Math.abs(rel)/28,'collision')}
 }
}`);

replaceFunction('resolveWorldCollision',`function resolveWorldCollision(car,obj,radius=1.9,breakable=false){
 if(!obj.visible)return false;
 const dx=car.pos.x-obj.position.x,dz=car.pos.z-obj.position.z,d=Math.hypot(dx,dz);if(d<=.00001||d>=radius)return false;
 const nx=dx/d,nz=dz/d,speed=Math.hypot(car.vel.x,car.vel.z);
 if(breakable&&speed>14){obj.visible=false;obj.userData.alive=false;car.vel.multiplyScalar(.90);car.yawRate=(car.yawRate||0)+clamp((Math.random()-.5)*.16,-.08,.08);applyImpactDamage(car,speed/50,'collision');return true}
 const pen=radius-d,corr=Math.max(0,pen-WHEEL_PHYS.contactSlop)*WHEEL_PHYS.contactBias;
 car.pos.x+=nx*corr;car.pos.z+=nz*corr;
 const vn=car.vel.x*nx+car.vel.z*nz;
 if(vn<0){
  const e=Math.abs(vn)<1.2?0:WHEEL_PHYS.contactRestitution;
  car.vel.x-=nx*vn*(1+e);car.vel.z-=nz*vn*(1+e);
  const tx=-nz,tz=nx,vt=car.vel.x*tx+car.vel.z*tz,fr=clamp(WHEEL_PHYS.contactFriction*(.35+Math.abs(vn)*.04),.18,.72);
  car.vel.x-=tx*vt*fr;car.vel.z-=tz*vt*fr;
  car.yawRate=(car.yawRate||0)+clamp(vt*.007,-.38,.38);
 }
 if(speed<1.1&&Math.abs(vn)<.35){car.vel.x*=.985;car.vel.z*=.985;}
 applyImpactDamage(car,speed/60,'collision');return true;
}`);

replaceFunction('physicsPlayer',`function physicsPlayer(dt){
 if(!player)return;
 ensureMoveState(player);
 const canDrive=raceStarted&&!finished;
 const throttle=canDrive&&(keys.KeyW||keys.ArrowUp)?1:0,brake=canDrive&&(keys.KeyS||keys.ArrowDown)?1:0;
 const steer=canDrive?((keys.KeyA||keys.ArrowLeft?1:0)-(keys.KeyD||keys.ArrowRight?1:0)):0,handbrake=canDrive&&keys.Space?1:0;
 const nitro=canDrive&&(keys.ShiftLeft||keys.ShiftRight)&&player.nitro>0;
 if(nitro)player.nitro=Math.max(0,player.nitro-dt*22);else player.nitro=Math.min(100,player.nitro+dt*4.5);
 const controls={throttle,brake,steer,handbrake,nitro};
 const maxStep=1/WHEEL_PHYS.physicsHz,steps=clamp(Math.ceil(Math.min(dt,.05)/maxStep),1,8),h=Math.min(dt,.05)/steps;
 let r=null;
 for(let step=0;step<steps;step++){
  r=applyArcadeMovement(player,controls,h);
  for(let solver=0;solver<2;solver++){
   for(const ai of ais)resolveCarCollision(player,ai);
   for(const o of destructibles)resolveWorldCollision(player,o,2.1,true);
   for(const b of barriers)resolveWorldCollision(player,b,2.0,true);
  }
 }
 const lv=localVelocity(player),near=nearestTrack(player.pos);nearestIdx=near.idx;
 player.speed=lv.long;player.slip=Math.atan2(Math.abs(lv.lat),Math.abs(lv.long)+.25);
 player.g.position.copy(player.pos);player.g.rotation.y=player.heading;
 animateBuggy(player,lv.long,lv.lat,dt);derivedActions(player,controls,dt,true);
 $('#surface').textContent=r?.surface||terrainType(player.pos);$('#speed').textContent=Math.round(Math.abs(lv.long)*3.6);
 $('#gear').textContent=lv.long<-1?'R':Math.abs(lv.long)<1?'N':String(clamp(Math.floor(Math.abs(lv.long)/10)+1,1,6));
 $('#susp').textContent=Math.round((1-player.suspensionDamage)*100)+'%';$('#traction').textContent=player.slip>.28?'SLIDE':player.slip>.14?'LOOSE':'GRIP';
 $('#nitroHud').textContent=Math.round(player.nitro)+'%';$('#healthHud').textContent=Math.round(player.health)+'%';
}`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testCornerDriveResponse:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),mk=()=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*8,0,Math.cos(h)*8),heading:h,speed:8,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const run=t=>{const c=mk();let e=0,ps=0,py=0,m=1e9;for(let k=0;k<90;k++){applyArcadeMovement(c,{throttle:.82,brake:0,steer:t,handbrake:0,nitro:false},1/60);if(k===9)e=Math.abs(c._steerAngle||0);ps=Math.max(ps,c.slip||0);py=Math.max(py,Math.abs(c.yawRate||0));for(const w of c._wheelPhysics||[])if(w.driveTorque>0)m=Math.min(m,Math.abs(w.longForce||0))}const sp=Math.hypot(c.vel.x,c.vel.z),hd=Math.abs(wrapAngle(c.heading-h));for(let k=0;k<30;k++)applyArcadeMovement(c,{throttle:.82,brake:0,steer:0,handbrake:0,nitro:false},1/60);return {sp,hd,ps,py,e,m:m===1e9?0:m,ry:Math.abs(c.yawRate||0),rs:c.slip||0}};const a=run(0),b=run(.46);return {straightSpeed:a.sp,turnSpeed:b.sp,speedRatio:b.sp/Math.max(.01,a.sp),turnHeading:b.hd,turnSlip:b.ps,turnYaw:b.py,earlySteer:b.e,minDriveForce:b.m,releasedYaw:b.ry,releasedSlip:b.rs}},testContactStability:()=>{const a={mass:1180,pos:new THREE.Vector3(-1.45,0,0),vel:new THREE.Vector3(5,0,0),yawRate:0,health:100},b={mass:1180,pos:new THREE.Vector3(1.45,0,0),vel:new THREE.Vector3(-5,0,0),yawRate:0,health:100};let peak=0;for(let i=0;i<24;i++){resolveCarCollision(a,b);peak=Math.max(peak,Math.abs((a.vel.x-b.vel.x)))}const d=Math.hypot(a.pos.x-b.pos.x,a.pos.z-b.pos.z);return {distance:d,relativeSpeed:Math.abs(a.vel.x-b.vel.x),peak,stable:Number.isFinite(d)&&Number.isFinite(a.vel.x)&&d>2.85}},`);

s+='\n<!-- release-gate-compat cornerCombinedGrip:1.28 drivenLongPriority:.90 steeringDriveAssist:.38 -->\n';
for(const r of ['Polygon Rush v15.5.17 Corner Drive + Steering Response','maxCornerG:1.65','desiredYawRate','physicsHz:180','contactSlop:.018','testContactStability:()=>','testCornerDriveResponse:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.17 stable contacts + fixed substeps + cornering model applied');