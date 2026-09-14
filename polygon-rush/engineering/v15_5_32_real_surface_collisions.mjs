import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const rep=(a,b)=>{must(s.includes(a),'missing anchor: '+a.slice(0,100));s=s.replace(a,b)};

rep('Polygon Rush v15.5.31 Free Roam Physics Fix','Polygon Rush v15.5.32 Real Surface Collisions');
rep('v15.5.31 • FREE ROAM PHYSICS FIX','v15.5.32 • REAL RAMP + SLOPE COLLISIONS');
s=s.replaceAll("version:'15.5.31'","version:'15.5.32'");

rep('let testMode=false,freeRoamMode=false;','let testMode=false,freeRoamMode=false;\nlet surfaceColliders=[];');

const oldAdd="const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.86,metalness:.04}),addBox=(x,y,z,sx,sy,sz,c=0x8a8f87,rx=0,ry=0,rz=0,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(c));m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;m.userData.collider={hx:sx*.5,hz:sz*.5,yaw:ry};world.add(m);if(solid)barriers.push(m);return m};";
const newAdd="const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.86,metalness:.04}),addBox=(x,y,z,sx,sy,sz,c=0x8a8f87,rx=0,ry=0,rz=0,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(c));m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;m.userData.collider={hx:sx*.5,hy:sy*.5,hz:sz*.5,yaw:ry,rideable:!solid||Math.abs(rx)>.001||Math.abs(rz)>.001};world.add(m);surfaceColliders.push(m);if(solid)barriers.push(m);return m};";
rep(oldAdd,newAdd);

rep('function addFreeRoamCourseFeatures(){\n const mat=', 'function addFreeRoamCourseFeatures(){\n surfaceColliders.length=0;\n const mat=');

const sampleAnchor='function freeRoamTerrainType(pos){';
const surfaceFns=`function objectTopSurface(obj,pos){
 const c=obj?.userData?.collider;if(!c||!obj.visible)return null;
 obj.updateMatrixWorld(true);
 const q=new THREE.Quaternion();obj.getWorldQuaternion(q);
 const normal=new THREE.Vector3(0,1,0).applyQuaternion(q);
 if(normal.y<.16)return null;
 const top=obj.localToWorld(new THREE.Vector3(0,c.hy||0,0));
 const y=top.y-(normal.x*(pos.x-top.x)+normal.z*(pos.z-top.z))/normal.y;
 const local=obj.worldToLocal(new THREE.Vector3(pos.x,y,pos.z));
 if(Math.abs(local.x)>c.hx+.25||Math.abs(local.z)>c.hz+.25||Math.abs(local.y-(c.hy||0))>.08)return null;
 return {y,normal,obj};
}
function sampleObjectSurface(pos,baseY=-Infinity){
 let best=null;
 for(const obj of surfaceColliders){const hit=objectTopSurface(obj,pos);if(!hit)continue;if(hit.y<baseY-.35)continue;if(!best||hit.y>best.y)best=hit}
 return best;
}
function resolveRideableObjectCollision(car,obj,carRadius=1.35){
 const c=obj?.userData?.collider;if(!c)return false;
 if(c.rideable){const top=objectTopSurface(obj,car.pos);if(top){const support=sampleTrackSurface(car.pos).y;if(top.y<=support+.45||car.pos.y>=top.y-.15)return false}}
 return resolveObjectCollisionOBB(car,obj,carRadius);
}
`;
must(s.includes(sampleAnchor),'freeRoamTerrainType anchor missing');s=s.replace(sampleAnchor,surfaceFns+sampleAnchor);

const oldSample="if(freeRoamMode){const type=freeRoamTerrainType(pos),near=nearestTrack(pos),y=freeRoamSurfaceY(pos);return {y,near,lateral:0,type,grip:terrainGrip(type)}}";
const newSample="if(freeRoamMode){const type=freeRoamTerrainType(pos),near=nearestTrack(pos),groundY=freeRoamSurfaceY(pos),surface=sampleObjectSurface(pos,groundY),y=surface?Math.max(groundY,surface.y):groundY,surfaceType=surface?'ASPHALT':type;return {y,near,lateral:0,type:surfaceType,grip:terrainGrip(surfaceType),surfaceNormal:surface?.normal||null}}";
rep(oldSample,newSample);

rep("for(const b of barriers){if((freeRoamMode||testMode)&&b.userData?.collider)resolveObjectCollisionOBB(player,b,1.35);else resolveWorldCollision(player,b,2.0,true)}",
"for(const b of barriers){if(freeRoamMode&&b.userData?.collider)resolveRideableObjectCollision(player,b,1.35);else if(testMode&&b.userData?.collider)resolveObjectCollisionOBB(player,b,1.35);else resolveWorldCollision(player,b,2.0,true)}");

const hook='testFreeRoamPhysics:()=>';
must(s.includes(hook),'physics test hook missing');
const test=`testObjectSurfaces:()=>{
 const a=sampleTrackSurface({x:0,z:-76}),b=sampleTrackSurface({x:0,z:-90}),c=sampleTrackSurface({x:0,z:-103});
 const car={mass:1180,pos:new THREE.Vector3(0,a.y+.22,-75),vel:new THREE.Vector3(0,0,-9),heading:Math.PI,speed:9,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};
 let maxY=car.pos.y;for(let i=0;i<150;i++){applyArcadeMovement(car,{throttle:.65,reverse:0,brake:0,steer:0,handbrake:0,nitro:false},1/120);maxY=Math.max(maxY,car.pos.y)}
 return {low:a.y,mid:b.y,high:c.y,relief:Math.max(a.y,b.y,c.y)-Math.min(a.y,b.y,c.y),carMaxY:maxY,carZ:car.pos.z,ok:(Math.max(a.y,b.y,c.y)-Math.min(a.y,b.y,c.y))>.9&&maxY>1.1&&car.pos.z<-82};
},`;
s=s.replace(hook,test+hook,1);

s+='\n<!-- v15.5.32 real-object-surface-collision ramp-plane-contact wheel-height slopes-climb -->\n';
for(const x of ['v15.5.32','surfaceColliders','objectTopSurface','sampleObjectSurface','resolveRideableObjectCollision','testObjectSurfaces'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.32 real surface collisions applied');
