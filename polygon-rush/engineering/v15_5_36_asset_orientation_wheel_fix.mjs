import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.35 Real Asset Free Roam','Polygon Rush v15.5.36 Asset Orientation + Car Art');
s=s.replaceAll('v15.5.35 • REAL ASSET FREE ROAM','v15.5.36 • ASSET ORIENTATION + CAR ART');
s=s.replaceAll("version:'15.5.35'","version:'15.5.36'");

const start='function fitAsset(obj,targetHeight){';
const end='function enforceFreeRoamOnly(){';
const a=s.indexOf(start),b=s.indexOf(end);
must(a>=0&&b>a,'v15.5.35 asset block not found');
const replacement=`function normalizeAsset(src,targetHeight){
 const holder=new THREE.Group(),obj=prepAsset(src.clone(true));holder.add(obj);
 let box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);
 const h=Math.max(.001,size.y),sc=targetHeight/h;obj.scale.setScalar(sc);
 box=new THREE.Box3().setFromObject(obj);const c=new THREE.Vector3();box.getCenter(c);
 obj.position.set(-c.x,-box.min.y,-c.z);holder.userData.normalizedSize=new THREE.Vector3();new THREE.Box3().setFromObject(holder).getSize(holder.userData.normalizedSize);
 return holder;
}
function prepAsset(obj){
 const aniso=Math.min(8,renderer.capabilities.getMaxAnisotropy?.()||1);
 obj.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;const mats=Array.isArray(n.material)?n.material:[n.material];for(const m of mats){if(!m)continue;if(m.map){m.map.colorSpace=THREE.SRGBColorSpace;m.map.anisotropy=aniso;m.map.needsUpdate=true}if('roughness'in m&&m.roughness==null)m.roughness=.62;if('metalness'in m&&m.metalness==null)m.metalness=.04;m.needsUpdate=true}});return obj;
}
function orientAsset(holder,kind='prop'){
 const sz=holder.userData.normalizedSize||new THREE.Vector3();
 if(kind==='vehicleBody'&&sz.x>sz.z*1.12)holder.rotation.y=Math.PI/2;
 return holder;
}
function makeCarWheel(src,x,z,isFront,isLeft){
 const steer=new THREE.Group(),spin=new THREE.Group(),model=prepAsset(src.clone(true));steer.add(spin);spin.add(model);
 let box=new THREE.Box3().setFromObject(model),sz=new THREE.Vector3();box.getSize(sz);
 const maxD=Math.max(sz.x,sz.y,sz.z,.001),scale=.82/maxD;model.scale.setScalar(scale);
 box=new THREE.Box3().setFromObject(model);box.getSize(sz);
 if(sz.z<sz.x*.72&&sz.z<sz.y*.72)model.rotation.y=Math.PI/2;
 else if(sz.y<sz.x*.72&&sz.y<sz.z*.72)model.rotation.z=Math.PI/2;
 box=new THREE.Box3().setFromObject(model);const c=new THREE.Vector3();box.getCenter(c);model.position.sub(c);
 if(isLeft)model.rotation.y+=Math.PI;
 steer.position.set(x,.56,z);steer.userData.front=isFront;steer.userData.spin=spin;steer.userData.radius=.41;steer.userData.left=isLeft;return steer;
}
async function loadRealProductionAssets(){
 if(realAssetState.loading||realAssetState.ready||!freeRoamMode)return realAssetState;realAssetState.loading=true;
 realAssetState.count=0;realAssetState.car=false;realAssetState.failed=[];realAssetState.names=[];
 try{
  const {GLTFLoader}=await import('./vendor/GLTFLoader.js');const loader=new GLTFLoader(),cache={};
  const get=async(name)=>{if(cache[name])return cache[name];try{const g=await loader.loadAsync(REAL_ASSET_PATH+name+'.glb');cache[name]=g.scene;return g.scene}catch(e){realAssetState.failed.push(name);console.error('ASSET LOAD',name,e);return null}};
  const old=world.getObjectByName('freeRoamRealAssets');if(old)world.remove(old);
  const group=new THREE.Group();group.name='freeRoamRealAssets';world.add(group);
  const place=async(name,x,z,h,yaw=0,collider=null,kind='prop')=>{const src=await get(name);if(!src)return null;const holder=orientAsset(normalizeAsset(src,h),kind);holder.position.set(x,freeRoamSurfaceY({x,z}),z);holder.rotation.y+=yaw;group.add(holder);realAssetState.count++;realAssetState.names.push(name);if(collider)addRealCollider(x,z,collider[0],collider[1],yaw);return holder};

  // Clean, intentional scenery: individual assets only. No giant pre-combined decoration piles.
  const trees=[[-122,-92,'tree_pine',11],[-104,-72,'tree_oak',9],[-88,-112,'tree_pine',12],[-124,38,'tree_oak',10],[-96,98,'tree_pine',11],[112,-96,'tree_oak',10],[126,-48,'tree_pine',12],[108,92,'tree_oak',10],[62,126,'tree_pine',11],[-64,118,'tree_oak',10]];
  for(const [x,z,n,h] of trees)await place(n,x,z,h,(x-z)*.011,[1.8,1.8]);
  const rocks=[[-76,-54,'rock_large',3.2],[-54,-42,'rock_medium',2.4],[74,-66,'rock_large',3.3],[94,-48,'rock_medium',2.5],[-88,68,'rock_large',3.0],[82,82,'rock_large',3.1]];
  for(const [x,z,n,h] of rocks)await place(n,x,z,h,(x+z)*.017,[2.2,2.2]);
  await place('city_building_a',48,48,10,-.18,[10,8]);
  await place('city_building_b',72,47,12,.12,[11,9]);
  await place('city_building_c',-82,88,10,.38,[9,8]);
  for(let i=0;i<7;i++)await place('city_fence',28+i*4.8,18,2.2,0,[4.4,.7]);
  for(let i=0;i<8;i++)await place('traffic_cone',-18+i*4.3,-42,1.0,(i%2?-.08:.08),[.55,.55]);
  for(let i=0;i<4;i++)await place('cargo_box',37+i*2.2,34,1.5,.12*i,[1.5,1.5]);

  const bodySrc=await get('player_body'),wheelSrc=await get('player_wheel');
  if(bodySrc&&wheelSrc&&player?.g){
   const previous=player.g.getObjectByName('realPlayerCar');if(previous)player.g.remove(previous);
   const carRoot=new THREE.Group();carRoot.name='realPlayerCar';player.g.add(carRoot);
   const body=orientAsset(normalizeAsset(bodySrc,1.75),'vehicleBody');
   let bb=new THREE.Box3().setFromObject(body),bs=new THREE.Vector3();bb.getSize(bs);const long=Math.max(bs.x,bs.z,.001),bodyScale=4.75/long;body.scale.multiplyScalar(bodyScale);
   bb=new THREE.Box3().setFromObject(body);bb.getSize(bs);body.position.y=.20;carRoot.add(body);
   const wheels=[makeCarWheel(wheelSrc,-1.03,1.42,true,true),makeCarWheel(wheelSrc,1.03,1.42,true,false),makeCarWheel(wheelSrc,-1.03,-1.42,false,true),makeCarWheel(wheelSrc,1.03,-1.42,false,false)];
   for(const w of wheels)carRoot.add(w);realCarVisual=carRoot;realCarWheels=wheels;
   if(player.g.userData.visual)player.g.userData.visual.visible=false;
   realAssetState.car=true;realAssetState.count+=5;realAssetState.names.push('player_body','player_wheel');
  }
  const proc=world.getObjectByName('freeRoamProductionArt');if(proc)proc.visible=false;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;scene.fog=new THREE.Fog(0xb7d2dc,155,470);sun.intensity=2.85;
  realAssetState.ready=realAssetState.count>=30&&realAssetState.car;return realAssetState;
 }catch(e){realAssetState.failed.push(String(e));console.error('REAL ASSET PIPELINE',e);return realAssetState}finally{realAssetState.loading=false}
}
function updateRealCarVisual(dt){
 if(!realCarVisual||!player)return;const speed=player.speed||0,steerAngle=player._steerAngle??((player.steer||0)*.45);
 for(const w of realCarWheels){if(!w?.userData?.spin)continue;if(w.userData.front)w.rotation.y=steerAngle;else w.rotation.y=0;const dir=w.userData.left?-1:1;w.userData.spin.rotation.x+=dir*speed*dt/Math.max(.2,w.userData.radius||.41)}
}
function enforceFreeRoamOnly(){`;
s=s.slice(0,a)+replacement+s.slice(b+end.length);
s=s.replaceAll('v15.5.35 real external CC0 GLB assets + local loader + collision proxies','v15.5.36 corrected asset transforms + explicit wheel axle pivots + textured car kit');
s+='\n<!-- v15.5.36 clean individual scenery, normalized origins, explicit steering/spin wheel hierarchy -->\n';
for(const x of ['v15.5.36','player_body','player_wheel','makeCarWheel','city_building_a','normalizeAsset'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.36 asset orientation + wheel fix applied');
