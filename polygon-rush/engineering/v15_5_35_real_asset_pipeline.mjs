import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.34 Free Roam Production Art','Polygon Rush v15.5.35 Real Asset Free Roam');
s=s.replaceAll('v15.5.34 • FREE ROAM PRODUCTION ART','v15.5.35 • REAL ASSET FREE ROAM');
s=s.replaceAll("version:'15.5.34'","version:'15.5.35'");

const code=`
const REAL_ASSET_PATH='assets/models/';
const realAssetState={ready:false,loading:false,count:0,car:false,failed:[],names:[]};
let realCarVisual=null,realCarWheels=[];
function addRealCollider(x,z,sx,sz,yaw=0){
 const m=new THREE.Object3D();m.position.set(x,freeRoamSurfaceY({x,z}),z);m.rotation.y=yaw;m.visible=true;m.userData.collider={hx:sx*.5,hy:3,hz:sz*.5,yaw,rideable:false};world.add(m);barriers.push(m);return m;
}
function fitAsset(obj,targetHeight){
 const box=new THREE.Box3().setFromObject(obj),size=new THREE.Vector3();box.getSize(size);
 const h=Math.max(.001,size.y),sc=targetHeight/h;obj.scale.setScalar(sc);box.setFromObject(obj);const c=new THREE.Vector3();box.getCenter(c);obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=box.min.y;return obj;
}
function prepAsset(obj){obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;if(n.material){const mats=Array.isArray(n.material)?n.material:[n.material];for(const m of mats){if('roughness'in m)m.roughness=Math.max(.48,m.roughness??.75);if('metalness'in m)m.metalness=Math.min(.45,m.metalness??.05);if(m.map)m.map.colorSpace=THREE.SRGBColorSpace}}}});return obj}
async function loadRealProductionAssets(){
 if(realAssetState.loading||realAssetState.ready||!freeRoamMode)return realAssetState;realAssetState.loading=true;
 try{
  const {GLTFLoader}=await import('./vendor/GLTFLoader.js');const loader=new GLTFLoader();const cache={};
  const get=async(name)=>{if(cache[name])return cache[name];try{const g=await loader.loadAsync(REAL_ASSET_PATH+name+'.glb');cache[name]=g.scene;return g.scene}catch(e){realAssetState.failed.push(name);console.error('ASSET LOAD',name,e);return null}};
  const group=new THREE.Group();group.name='freeRoamRealAssets';world.add(group);
  const place=async(name,x,z,h,yaw=0,collider=null)=>{const src=await get(name);if(!src)return null;const o=prepAsset(src.clone(true));fitAsset(o,h);o.position.set(x,freeRoamSurfaceY({x,z}),z);o.rotation.y=yaw;group.add(o);realAssetState.count++;realAssetState.names.push(name);if(collider)addRealCollider(x,z,collider[0],collider[1],yaw);return o};
  const trees=[[-118,-94,'tree_pine',10],[-102,-74,'tree_oak',9],[-87,-112,'tree_pine',12],[-66,-91,'tree_oak',10],[-126,-25,'tree_pine',11],[-112,8,'tree_oak',9],[-132,46,'tree_pine',12],[-108,82,'tree_oak',10],[-85,112,'tree_pine',11],[87,-126,'tree_pine',12],[112,-96,'tree_oak',10],[126,-58,'tree_pine',11],[118,-18,'tree_oak',9],[132,28,'tree_pine',12],[111,72,'tree_oak',10],[91,108,'tree_pine',11],[58,126,'tree_oak',9],[-38,126,'tree_pine',10],[-72,112,'tree_oak',10]];
  for(const [x,z,n,h] of trees)await place(n,x,z,h,(x+z)*.03,[2.1,2.1]);
  const rocks=[[-72,-52,'rock_large',3.3],[-58,-39,'rock_medium',2.6],[-44,-58,'rock_large',3.0],[68,-63,'rock_large',3.4],[83,-48,'rock_medium',2.5],[96,-70,'rock_large',3.1],[-92,61,'rock_medium',2.5],[-76,78,'rock_large',3.2],[73,74,'rock_large',3.3],[91,84,'rock_medium',2.4],[24,116,'rock_large',3.0],[-18,109,'rock_medium',2.5]];
  for(const [x,z,n,h] of rocks)await place(n,x,z,h,(x-z)*.04,[2.6,2.6]);
  await place('building_house',46,47,8.5,-.32,[11,9]);
  await place('building_tower',-84,87,10.5,.5,[8,8]);
  await place('decoration_tents',25,-58,7.5,.15,[13,10]);
  await place('decoration_forest',-98,-18,11,-.18,null);
  const carSrc=await get('player_car');
  if(carSrc&&player?.g){
   const old=player.g.getObjectByName('realPlayerCar');if(old)player.g.remove(old);
   const car=prepAsset(carSrc.clone(true));car.name='realPlayerCar';const box=new THREE.Box3().setFromObject(car),sz=new THREE.Vector3();box.getSize(sz);const horiz=Math.max(sz.x,sz.z,.01);car.scale.setScalar(4.6/horiz);const b2=new THREE.Box3().setFromObject(car);car.position.y=-b2.min.y+.08;car.rotation.y=Math.PI;player.g.add(car);realCarVisual=car;realCarWheels=[];car.traverse(n=>{if(/wheel/i.test(n.name||''))realCarWheels.push(n)});if(player.g.userData.visual)player.g.userData.visual.visible=false;realAssetState.car=true;realAssetState.count++;realAssetState.names.push('player_car');
  }
  const proc=world.getObjectByName('freeRoamProductionArt');if(proc)proc.visible=false;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;scene.fog=new THREE.Fog(0xb7d2dc,145,460);sun.intensity=2.65;
  realAssetState.ready=realAssetState.count>=25&&realAssetState.car;return realAssetState;
 }catch(e){realAssetState.failed.push(String(e));console.error('REAL ASSET PIPELINE',e);return realAssetState}finally{realAssetState.loading=false}
}
function updateRealCarVisual(dt){if(!realCarVisual||!player)return;const spin=(player.speed||0)*dt/Math.max(.25,.38);for(const w of realCarWheels){w.rotation.x-=spin;if(/front/i.test(w.name||''))w.rotation.y=(player.steer||0)*.42}}
`;
const anchor='function enforceFreeRoamOnly(){';must(s.includes(anchor),'free roam anchor missing');s=s.replace(anchor,code+'\n'+anchor);
s=s.replaceAll('if(freeRoamMode)decorateFreeRoamProduction();','if(freeRoamMode){decorateFreeRoamProduction();loadRealProductionAssets();}');
s=s.replaceAll('renderer.render(scene,cam)','updateRealCarVisual(dt);renderer.render(scene,cam)');
s=s.replaceAll("wheelPhysics:true,productionArt:()=>","wheelPhysics:true,realAssets:()=>({...realAssetState}),productionArt:()=>");
s+='\n<!-- v15.5.35 real external CC0 GLB assets + local loader + collision proxies -->\n';
for(const x of ['v15.5.35','loadRealProductionAssets','freeRoamRealAssets','realAssets:()=>','player_car'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.35 real asset pipeline applied');
