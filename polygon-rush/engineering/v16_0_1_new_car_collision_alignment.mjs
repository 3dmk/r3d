import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
s=s.replaceAll('Polygon Rush v16.0.0 Clean Physics Core','Polygon Rush v16.0.1 New Car + Collision Alignment');
s=s.replaceAll('v16.0.0 CLEAN PHYSICS CORE','v16.0.1 NEW CAR + COLLISION ALIGNMENT');
s=s.replaceAll('v16.0.0 • CLEAN PHYSICS CORE • FREE ROAM','v16.0.1 • NEW CAR • MATCHED COLLISION BODY • FREE ROAM');
s=s.replace("const VERSION='16.0.0'","const VERSION='16.0.1'");

const oldCar=/const carG=new THREE\.Group\(\);carVisualRoot\.add\(carG\);[\s\S]*?\}\}\)\(\);\nconst P=/;
must(oldCar.test(s),'old car visual block missing');
const newCar=`const carG=new THREE.Group();carVisualRoot.add(carG);const wheelVisuals=[];
// v16.0.1 car: visual dimensions intentionally match the physics chassis envelope.
const CAR={width:1.84,length:4.28,height:1.12,wheelBase:2.72,track:1.62,wheelRadius:.39,bodyFloor:.36};
const paint=new THREE.MeshStandardMaterial({color:0xd84b36,roughness:.38,metalness:.18}),dark=new THREE.MeshStandardMaterial({color:0x15191d,roughness:.72,metalness:.08}),glass=new THREE.MeshStandardMaterial({color:0x263744,roughness:.18,metalness:.12,transparent:true,opacity:.82}),trim=new THREE.MeshStandardMaterial({color:0x303840,roughness:.55,metalness:.22});
function boxPart(name,sx,sy,sz,x,y,z,mat=paint){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;carG.add(m);return m}
boxPart('lowerBody',CAR.width,.46,3.92,0,.49,0);
boxPart('nose',1.72,.28,.86,0,.68,1.63);
boxPart('hood',1.68,.20,1.18,0,.76,1.03);
boxPart('cabin',1.48,.58,1.62,0,1.00,-.18,glass);
boxPart('roof',1.42,.14,1.34,0,1.34,-.28,paint);
boxPart('rearDeck',1.70,.24,.88,0,.76,-1.57);
boxPart('frontBumper',1.78,.18,.16,0,.42,2.08,trim);
boxPart('rearBumper',1.76,.18,.16,0,.42,-2.08,trim);
boxPart('sideSkirtL',.10,.16,2.80,-.89,.39,0,trim);boxPart('sideSkirtR',.10,.16,2.80,.89,.39,0,trim);
const wheelGeo=new THREE.CylinderGeometry(CAR.wheelRadius,CAR.wheelRadius,.30,22);wheelGeo.rotateZ(Math.PI/2);const wheelMat=new THREE.MeshStandardMaterial({color:0x101214,roughness:.9,metalness:.05});
const mounts=[[-CAR.track/2,.38,CAR.wheelBase/2],[CAR.track/2,.38,CAR.wheelBase/2],[-CAR.track/2,.38,-CAR.wheelBase/2],[CAR.track/2,.38,-CAR.wheelBase/2]];
for(let i=0;i<4;i++){const pivot=new THREE.Group(),w=new THREE.Mesh(wheelGeo,wheelMat);w.castShadow=true;w.receiveShadow=true;pivot.position.set(...mounts[i]);pivot.add(w);carG.add(pivot);wheelVisuals.push(pivot)}
const P=`;
s=s.replace(oldCar,newCar);

const oldP="const P={mass:1180,inertia:new THREE.Vector3(1450,2200,1650),wheelBase:2.7,track:1.9,wheelRadius:.41,suspensionRest:.48,suspensionTravel:.34,springK:28500,damperC:4300,tireMu:1.28,cornerStiffness:8.5,longStiffness:7,engineForce:9200,brakeForce:13000,handbrakeForce:7000,steerMax:.62,steerRate:4.8,aeroDrag:.34,rolling:34};";
const newP="const P={mass:1180,inertia:new THREE.Vector3(1380,2180,1540),wheelBase:CAR.wheelBase,track:CAR.track,wheelRadius:CAR.wheelRadius,suspensionRest:.46,suspensionTravel:.30,springK:30000,damperC:4600,tireMu:1.30,cornerStiffness:8.8,longStiffness:7.2,engineForce:9200,brakeForce:13000,handbrakeForce:7000,steerMax:.60,steerRate:4.8,aeroDrag:.34,rolling:34,chassisHalf:new THREE.Vector3(CAR.width*.5,.60,CAR.length*.5)};";
must(s.includes(oldP),'physics config anchor missing');s=s.replace(oldP,newP);

const oldCollision=/function solveObstacleCollisions\(\)\{[\s\S]*?\}\nfunction physicsStep/;
must(oldCollision.test(s),'collision solver missing');
const newCollision=`function solveObstacleCollisions(){
 const hx=P.chassisHalf.x,hz=P.chassisHalf.z,hy=P.chassisHalf.y;
 const yaw=car.euler.y,c=Math.cos(yaw),sn=Math.sin(yaw),right=new THREE.Vector3(c,0,-sn),forward=new THREE.Vector3(sn,0,c);
 const axes=[right,forward,new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,1)];
 for(const o of obstacles){
   const oy=(o.min.y+o.max.y)*.5,ohy=(o.max.y-o.min.y)*.5,dy=car.pos.y-oy,py=hy+ohy-Math.abs(dy);if(py<=0)continue;
   const oc=new THREE.Vector3((o.min.x+o.max.x)*.5,0,(o.min.z+o.max.z)*.5),ohx=(o.max.x-o.min.x)*.5,ohz=(o.max.z-o.min.z)*.5,d=new THREE.Vector3(car.pos.x-oc.x,0,car.pos.z-oc.z);
   let minPen=Infinity,bestAxis=null;
   for(const axis0 of axes){const axis=axis0.clone().normalize(),dist=Math.abs(d.dot(axis)),ra=hx*Math.abs(right.dot(axis))+hz*Math.abs(forward.dot(axis)),rb=ohx*Math.abs(axis.x)+ohz*Math.abs(axis.z),pen=ra+rb-dist;if(pen<=0){bestAxis=null;minPen=-1;break}if(pen<minPen){minPen=pen;bestAxis=axis.multiplyScalar(Math.sign(d.dot(axis))||1)}}
   if(minPen<=0||!bestAxis)continue;
   car.pos.addScaledVector(bestAxis,minPen+.003);
   const cp=new THREE.Vector3(clamp(car.pos.x,o.min.x,o.max.x),clamp(car.pos.y,o.min.y,o.max.y),clamp(car.pos.z,o.min.z,o.max.z)),r=cp.clone().sub(car.pos),pv=pointVelocity(r),vn=pv.dot(bestAxis);
   if(vn<0){const restitution=.04,j=-(1+restitution)*vn*P.mass*.72,imp=bestAxis.clone().multiplyScalar(j);car.vel.addScaledVector(imp,1/P.mass);const ang=new THREE.Vector3(r.y*imp.z-r.z*imp.y,r.z*imp.x-r.x*imp.z,r.x*imp.y-r.y*imp.x);car.omega.add(new THREE.Vector3(ang.x/P.inertia.x,ang.y/P.inertia.y,ang.z/P.inertia.z));const tangent=pv.clone().addScaledVector(bestAxis,-vn),tl=tangent.length();if(tl>1e-4)car.vel.addScaledVector(tangent,-Math.min(.18,dtSafe()*4))}
 }
}
function dtSafe(){return 1/120}
function physicsStep`;
s=s.replace(oldCollision,newCollision);

s=s.replace("const by=new Map(car.contacts.map(c=>[c.index,c]));for(let i=0;i<4;i++){const w=wheelVisuals[i];if(!w)continue;const c=by.get(i),local=wheelLocal[i].clone();if(c)local.y-=clamp(c.compression,-.25,.25);w.position.lerp(local,1-Math.exp(-18*dt));if(i<2)w.rotation.y=car.steer}","const by=new Map(car.contacts.map(c=>[c.index,c]));for(let i=0;i<4;i++){const w=wheelVisuals[i];if(!w)continue;const c=by.get(i),local=wheelLocal[i].clone();local.y=.38;if(c)local.y-=clamp(c.compression,-.22,.22);w.position.lerp(local,1-Math.exp(-18*dt));if(i<2)w.rotation.y=car.steer}");

s=s.replace("invariants:{groundSnap:false,duplicateCollisionAuthority:false,duplicateYawAuthority:false,visualOwnsPhysics:false}","invariants:{groundSnap:false,duplicateCollisionAuthority:false,duplicateYawAuthority:false,visualOwnsPhysics:false,visualCollisionMatched:true,obbAabbCollision:true}");
s=s.replace("diagnostics:()=>({authority:'single-js-rigid-body'","diagnostics:()=>({authority:'single-js-rigid-body',carDimensions:[CAR.width,CAR.height,CAR.length],collisionHalf:P.chassisHalf.toArray()");
s+='\n<!-- v16.0.1 new proportion-matched car; visual/physics dimensions unified; OBB-vs-AABB collision replaces corner-only collision -->\n';
for(const x of ["VERSION='16.0.1'","visualCollisionMatched:true","obbAabbCollision:true","CAR={width:1.84,length:4.28"])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v16.0.1 new car + aligned collision applied');