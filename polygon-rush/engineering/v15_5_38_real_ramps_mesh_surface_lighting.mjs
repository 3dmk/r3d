import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.37 Mesh Scene + Collision Fix','Polygon Rush v15.5.38 Real Ramps + Mesh Surface + Lighting');
s=s.replaceAll('v15.5.37 • MESH SCENE + COLLISION FIX','v15.5.38 • REAL RAMPS + MESH SURFACE + LIGHTING');
s=s.replaceAll("version:'15.5.37'","version:'15.5.38'");

s=s.replace(
"scene.add(new THREE.HemisphereLight(0xeaf8ff,0x3a3028,1.65));const sun=new THREE.DirectionalLight(0xfff0cf,3.1);sun.position.set(-65,110,50);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-170;sun.shadow.camera.right=170;sun.shadow.camera.top=170;sun.shadow.camera.bottom=-170;scene.add(sun);",
"const hemi=new THREE.HemisphereLight(0xeaf8ff,0x332b24,.78);scene.add(hemi);const sun=new THREE.DirectionalLight(0xffefd0,3.35);sun.position.set(-82,118,58);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-190;sun.shadow.camera.right=190;sun.shadow.camera.top=190;sun.shadow.camera.bottom=-190;sun.shadow.camera.near=1;sun.shadow.camera.far=360;sun.shadow.bias=-.00025;sun.shadow.normalBias=.025;sun.target.position.set(0,0,0);scene.add(sun.target);scene.add(sun);"
);
must(s.includes('const hemi=new THREE.HemisphereLight'),'lighting anchor replacement failed');

s=s.replace('let surfaceColliders=[];','let surfaceColliders=[];\nconst meshSurfaceColliders=[],realRampRoots=[];');

const meshFns=`
function addTriangleMeshSurface(root,source='imported-ramp'){
 root.updateMatrixWorld(true);let added=0;
 root.traverse(node=>{
  if(!node.isMesh||!node.geometry?.attributes?.position)return;
  const g=node.geometry,p=g.attributes.position,idx=g.index,tc=idx?Math.floor(idx.count/3):Math.floor(p.count/3);
  for(let t=0;t<tc;t++){
   const ia=idx?idx.getX(t*3):t*3,ib=idx?idx.getX(t*3+1):t*3+1,ic=idx?idx.getX(t*3+2):t*3+2;
   const a=new THREE.Vector3().fromBufferAttribute(p,ia).applyMatrix4(node.matrixWorld),b=new THREE.Vector3().fromBufferAttribute(p,ib).applyMatrix4(node.matrixWorld),c=new THREE.Vector3().fromBufferAttribute(p,ic).applyMatrix4(node.matrixWorld);
   const n=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a));if(n.lengthSq()<1e-8)continue;n.normalize();
   if(n.y<0){const q=b.clone();b.copy(c);c.copy(q);n.multiplyScalar(-1)}
   if(n.y<.10)continue;
   meshSurfaceColliders.push({a:a.clone(),b:b.clone(),c:c.clone(),n:n.clone(),minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),minZ:Math.min(a.z,b.z,c.z),maxZ:Math.max(a.z,b.z,c.z),source});added++;
  }
 });return added;
}
function triangleSurfaceY(t,x,z){
 const den=(t.b.z-t.c.z)*(t.a.x-t.c.x)+(t.c.x-t.b.x)*(t.a.z-t.c.z);if(Math.abs(den)<1e-8)return null;
 const u=((t.b.z-t.c.z)*(x-t.c.x)+(t.c.x-t.b.x)*(z-t.c.z))/den,v=((t.c.z-t.a.z)*(x-t.c.x)+(t.a.x-t.c.x)*(z-t.c.z))/den,w=1-u-v;
 if(u<-.002||v<-.002||w<-.002)return null;return {y:u*t.a.y+v*t.b.y+w*t.c.y,normal:t.n,source:t.source};
}
function sampleTriangleMeshSurface(pos,baseY=-Infinity){
 let best=null;for(const t of meshSurfaceColliders){if(pos.x<t.minX||pos.x>t.maxX||pos.z<t.minZ||pos.z>t.maxZ)continue;const h=triangleSurfaceY(t,pos.x,pos.z);if(!h||h.y<baseY-.35||h.y>baseY+18)continue;if(!best||h.y>best.y)best=h}return best;
}
function makeRampHolder(src,targetLength=16,heightScale=1){
 const holder=new THREE.Group(),obj=prepAsset(src.clone(true));holder.add(obj);let box=new THREE.Box3().setFromObject(obj),sz=new THREE.Vector3();box.getSize(sz);const long=Math.max(sz.x,sz.z,.001),sc=targetLength/long;obj.scale.set(sc,sc*heightScale,sc);box=new THREE.Box3().setFromObject(obj);const c=new THREE.Vector3();box.getCenter(c);obj.position.set(-c.x,-box.min.y,-c.z);holder.userData.rampSize=new THREE.Vector3();new THREE.Box3().setFromObject(holder).getSize(holder.userData.rampSize);return holder;
}
async function placeRealRamp(get,group,name,x,z,length,yaw=0,heightScale=1,pitch=0){
 const src=await get(name);if(!src)return null;const r=makeRampHolder(src,length,heightScale);r.name='realRamp_'+realRampRoots.length;r.position.set(x,freeRoamSurfaceY({x,z})+.03,z);r.rotation.set(pitch,yaw,0);group.add(r);r.updateMatrixWorld(true);const tris=addTriangleMeshSurface(r,name);r.userData.surfaceTriangles=tris;realRampRoots.push(r);realAssetState.count++;realAssetState.names.push(name);return r;
}
function rampSurfaceDiagnostics(){
 let meshes=0,shadowMeshes=0,hits=0,minY=Infinity,maxY=-Infinity;
 for(const r of realRampRoots){r.traverse(n=>{if(n.isMesh){meshes++;if(n.castShadow&&n.receiveShadow)shadowMeshes++}});const box=new THREE.Box3().setFromObject(r);for(let ix=0;ix<=8;ix++)for(let iz=0;iz<=8;iz++){const x=THREE.MathUtils.lerp(box.min.x,box.max.x,ix/8),z=THREE.MathUtils.lerp(box.min.z,box.max.z,iz/8),base=freeRoamSurfaceY({x,z}),h=sampleTriangleMeshSurface({x,z},base);if(h){hits++;minY=Math.min(minY,h.y);maxY=Math.max(maxY,h.y)}}}
 return {rampCount:realRampRoots.length,triangles:meshSurfaceColliders.length,hits,heightRange:hits?maxY-minY:0,meshes,shadowMeshes,shadowEnabled:renderer.shadowMap.enabled,sunShadow:sun.castShadow,surfaceColliders:surfaceColliders.length,visibleRideablePrimitives:world.children.filter(o=>o.isMesh&&o.visible&&o.userData?.collider?.rideable).length};
}
`;
const normAnchor='function normalizeAsset(src,targetHeight){';must(s.includes(normAnchor),'normalize asset anchor missing');s=s.replace(normAnchor,meshFns+'\n'+normAnchor);

const surfaceOld="function sampleTrackSurface(pos){if(freeRoamMode){const type=freeRoamTerrainType(pos),near=nearestTrack(pos),groundY=freeRoamSurfaceY(pos),surface=sampleObjectSurface(pos,groundY),y=surface?Math.max(groundY,surface.y):groundY,surfaceType=surface?'ASPHALT':type;return {y,near,lateral:0,type:surfaceType,grip:terrainGrip(surfaceType),surfaceNormal:surface?.normal||null}}";
const surfaceNew="function sampleTrackSurface(pos){if(freeRoamMode){const type=freeRoamTerrainType(pos),near=nearestTrack(pos),groundY=freeRoamSurfaceY(pos),meshSurface=sampleTriangleMeshSurface(pos,groundY),surface=sampleObjectSurface(pos,groundY),bestY=Math.max(groundY,meshSurface?.y??-Infinity,surface?.y??-Infinity),bestNormal=(meshSurface&&meshSurface.y>=bestY-.001)?meshSurface.normal:(surface?.normal||null),surfaceType=(meshSurface||surface)?'ASPHALT':type;return {y:bestY,near,lateral:0,type:surfaceType,grip:terrainGrip(surfaceType),surfaceNormal:bestNormal}}";
must(s.includes(surfaceOld),'sampleTrackSurface anchor missing');s=s.replace(surfaceOld,surfaceNew);

const propsAnchor="for(let i=0;i<4;i++)await place('cargo_box',37+i*2.2,34,1.5,.12*i,[1.5,1.5]);";
must(s.includes(propsAnchor),'asset placement anchor missing');
s=s.replace(propsAnchor,propsAnchor+`\n  meshSurfaceColliders.length=0;realRampRoots.length=0;\n  await placeRealRamp(get,group,'track_bump',0,-52,15,0,1.35,0);\n  await placeRealRamp(get,group,'track_bump',34,-28,19,.48,1.65,0);\n  await placeRealRamp(get,group,'track_bump',-42,26,13,-.42,1.18,0);\n  await placeRealRamp(get,group,'track_straight',-18,72,18,.12,1.0,-.16);`);

s=s.replace('renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;scene.fog=new THREE.Fog(0xb7d2dc,155,470);sun.intensity=2.85;',
"renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;scene.fog=new THREE.Fog(0xb7d2dc,165,500);sun.intensity=3.35;hemi.intensity=.78;world.traverse(o=>{if(o.isMesh)o.receiveShadow=true});");

const diagAnchor="freeRoamMeshCollision:()=>({surfaceColliders:surfaceColliders.length,visibleRideablePrimitives:world.children.filter(o=>o.isMesh&&o.visible&&o.userData?.collider?.rideable).length,geometryBoundColliders:barriers.filter(o=>o.userData?.collider?.source==='imported-mesh-bounds').length}),";
must(s.includes(diagAnchor),'mesh collision diagnostic anchor missing');s=s.replace(diagAnchor,diagAnchor+'rampSurface:()=>rampSurfaceDiagnostics(),');

s+='\n<!-- v15.5.38 imported Kenney track ramps; triangle-mesh wheel surface; stronger directional shadows; no ramp collision planes -->\n';
for(const x of ['v15.5.38','placeRealRamp','sampleTriangleMeshSurface','rampSurface:()=>','track_bump','track_straight'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.38 real ramps + mesh surface + lighting applied');
