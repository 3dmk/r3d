import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const rep=(a,b)=>{must(s.includes(a),'missing anchor: '+a.slice(0,80));s=s.replace(a,b)};

rep('Polygon Rush v15.5.30 Test + Free Roam','Polygon Rush v15.5.31 Free Roam Physics Fix');
rep('v15.5.30 • TEST + FREE ROAM','v15.5.31 • FREE ROAM PHYSICS FIX');
s=s.replaceAll("version:'15.5.30'","version:'15.5.31'");

rep('cornerStiffness:13200, rollingResistance:46, aeroDrag:.46,','cornerStiffness:13200, rollingResistance:34, aeroDrag:.38,');
rep('wheelInertia:6.5, driveWheelTorque:2350, brakeWheelTorque:2600,','wheelInertia:6.5, driveWheelTorque:2700, brakeWheelTorque:2600,');
rep('rearStability:1.18, cornerCombinedGrip:1.28, drivenLongPriority:.90,','rearStability:1.18, cornerCombinedGrip:1.42, drivenLongPriority:.96,');

rep("const throttle=clamp(controls.throttle||0,0,1),rawBrake=clamp(controls.brake||0,0,1),handbrake=controls.handbrake||0;",
"const throttle=clamp(controls.throttle||0,0,1),reverse=clamp(controls.reverse||0,0,1),rawBrake=clamp(controls.brake||0,0,1),handbrake=controls.handbrake||0;");
rep('const throttleRate=throttle>car._driveThrottle?11.5:14.0;\n car._driveThrottle+=(throttle-car._driveThrottle)*(1-Math.exp(-throttleRate*dt));',
"const driveInput=throttle-reverse;\n const throttleRate=Math.abs(driveInput)>Math.abs(car._driveThrottle)?15.5:7.0;\n car._driveThrottle+=(driveInput-car._driveThrottle)*(1-Math.exp(-throttleRate*dt));");
rep("if(!front&&car._driveThrottle>.001){\n   const torqueCurve=clamp(1.15-Math.abs(vLong)/94,.42,1.08);\n   driveTorque=car._driveThrottle*WHEEL_PHYS.driveWheelTorque*torqueCurve;\n  }",
"if(!front&&Math.abs(car._driveThrottle)>.001){\n   const torqueCurve=clamp(1.20-Math.abs(vLong)/94,.46,1.12);\n   const reverseScale=car._driveThrottle<0?.62:1;\n   driveTorque=car._driveThrottle*WHEEL_PHYS.driveWheelTorque*torqueCurve*reverseScale;\n  }");
s=s.replaceAll('if(!front&&driveTorque>0){','if(!front&&Math.abs(driveTorque)>0){');
s=s.replaceAll('if(!front&&driveTorque>0&&!handbrake){','if(!front&&Math.abs(driveTorque)>0&&!handbrake){');
s=s.replaceAll('if(!front&&driveTorque>0&&vLong>1)','if(!front&&driveTorque>0&&vLong>1)');
rep('const omegaLimit=(vLong+WHEEL_PHYS.tcSlip*driveDen)/R;\n   if(omegaDrive>omegaLimit){omegaDrive=omegaLimit;driveTorque=Math.max(0,(omegaDrive-omega)*WHEEL_PHYS.wheelInertia/Math.max(dt,.001))}',
"const slipAllowance=WHEEL_PHYS.tcSlip*driveDen;\n   const omegaMax=(vLong+slipAllowance)/R,omegaMin=(vLong-slipAllowance)/R;\n   if(driveTorque>0&&omegaDrive>omegaMax){omegaDrive=omegaMax;driveTorque=Math.max(0,(omegaDrive-omega)*WHEEL_PHYS.wheelInertia/Math.max(dt,.001))}\n   if(driveTorque<0&&omegaDrive<omegaMin){omegaDrive=omegaMin;driveTorque=Math.min(0,(omegaDrive-omega)*WHEEL_PHYS.wheelInertia/Math.max(dt,.001))}");

rep("const brake=canDrive&&(keys.KeyS||keys.ArrowDown)?1:0;",
"const reverseKey=canDrive&&(keys.KeyS||keys.ArrowDown)?1:0;\n const currentLong=localVelocity(player).long;\n const reverse=reverseKey&&currentLong<1.0?1:0;\n const brake=reverseKey&&currentLong>=1.0?1:0;");
rep('const controls={throttle,brake,steer,handbrake,nitro},steps=dt>.012?2:1,h=dt/steps;',
'const controls={throttle,reverse,brake,steer,handbrake,nitro},steps=dt>.012?4:2,h=dt/steps;');

const addBoxOld="const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.86,metalness:.04}),addBox=(x,y,z,sx,sy,sz,c=0x8a8f87,rx=0,ry=0,rz=0,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(c));m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;world.add(m);if(solid)barriers.push(m);return m};";
const addBoxNew="const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.86,metalness:.04}),addBox=(x,y,z,sx,sy,sz,c=0x8a8f87,rx=0,ry=0,rz=0,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(c));m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;m.userData.collider={hx:sx*.5,hz:sz*.5,yaw:ry};world.add(m);if(solid)barriers.push(m);return m};";
rep(addBoxOld,addBoxNew);

const collisionAnchor='function resolveWorldCollision(car,obj,radius=1.9,breakable=false){';
const obb=`function resolveObjectCollisionOBB(car,obj,carRadius=1.35){\n if(!obj?.visible||!obj.userData?.collider)return false;\n const c=obj.userData.collider,yaw=c.yaw||obj.rotation?.y||0,co=Math.cos(yaw),si=Math.sin(yaw);\n const dx=car.pos.x-obj.position.x,dz=car.pos.z-obj.position.z;\n const lx=dx*co-dz*si,lz=dx*si+dz*co;\n const qx=clamp(lx,-c.hx,c.hx),qz=clamp(lz,-c.hz,c.hz),ex=lx-qx,ez=lz-qz,d2=ex*ex+ez*ez;\n if(d2>=carRadius*carRadius)return false;\n let nxL,nzL,pen;\n if(d2>1e-8){const d=Math.sqrt(d2);nxL=ex/d;nzL=ez/d;pen=carRadius-d}else{const px=c.hx-Math.abs(lx),pz=c.hz-Math.abs(lz);if(px<pz){nxL=lx>=0?1:-1;nzL=0;pen=carRadius+px}else{nxL=0;nzL=lz>=0?1:-1;pen=carRadius+pz}}\n const nx=nxL*co+nzL*si,nz=-nxL*si+nzL*co;\n car.pos.x+=nx*(pen+.02);car.pos.z+=nz*(pen+.02);\n const vn=car.vel.x*nx+car.vel.z*nz;if(vn<0){car.vel.x-=nx*vn*1.12;car.vel.z-=nz*vn*1.12;const tx=-nz,tz=nx,vt=car.vel.x*tx+car.vel.z*tz;car.vel.x-=tx*vt*.10;car.vel.z-=tz*vt*.10;car.yawRate=(car.yawRate||0)+clamp(vt*.010,-.35,.35)}\n return true;\n}\n`;
must(s.includes(collisionAnchor),'collision anchor missing');s=s.replace(collisionAnchor,obb+collisionAnchor);
rep('for(const b of barriers)resolveWorldCollision(player,b,2.0,true);',"for(const b of barriers){if((freeRoamMode||testMode)&&b.userData?.collider)resolveObjectCollisionOBB(player,b,1.35);else resolveWorldCollision(player,b,2.0,true)}");

// Preserve more forward momentum while cornering under power, but do not inject free acceleration.
rep('const rollingMag=Math.min(speed*WHEEL_PHYS.rollingResistance,mass*g*.018);',
"const steerLoad=clamp(Math.abs(rawSteer),0,1),powerKeep=clamp(1-steerLoad*car._driveThrottle*.38,.72,1);\n const rollingMag=Math.min(speed*WHEEL_PHYS.rollingResistance*powerKeep,mass*g*.018);");

const hook="testSteerUnderPower:()=>";
must(s.includes(hook),'steer test hook missing');
const insert=`testFreeRoamPhysics:()=>{\n const idx=236,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(v=0)=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*v,0,Math.cos(h)*v),heading:h,speed:v,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});\n const acc=mk();for(let i=0;i<90;i++)applyArcadeMovement(acc,{throttle:1,reverse:0,brake:0,steer:0,handbrake:0,nitro:false},1/60);\n const rev=mk();for(let i=0;i<100;i++)applyArcadeMovement(rev,{throttle:0,reverse:1,brake:0,steer:0,handbrake:0,nitro:false},1/60);\n const turn=mk(22),start=Math.abs(localVelocity(turn).long);for(let i=0;i<72;i++)applyArcadeMovement(turn,{throttle:.85,reverse:0,brake:0,steer:.65,handbrake:0,nitro:false},1/60);\n const box=new THREE.Object3D();box.position.set(0,0,0);box.rotation.y=.35;box.userData.collider={hx:6,hz:1,yaw:.35};const col=mk();col.pos.set(0,0,0);col.vel.set(12,0,0);const hit=resolveObjectCollisionOBB(col,box,1.35);\n return {accel:Math.abs(localVelocity(acc).long),reverse:localVelocity(rev).long,turnStart:start,turnEnd:Math.abs(localVelocity(turn).long),turnHeading:Math.abs(wrapAngle(turn.heading-h)),collisionHit:hit,collisionPos:[col.pos.x,col.pos.z]};\n},`;
s=s.replace(hook,insert+hook,1);

s+='\n<!-- v15.5.31 free-roam-obb-collision reverse-drive momentum-preservation anti-clipping -->\n';
for(const x of ['v15.5.31','resolveObjectCollisionOBB','testFreeRoamPhysics','const reverse=','driveWheelTorque:2700'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.31 physics collision fix applied');
