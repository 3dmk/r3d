import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.36 Asset Orientation + Car Art','Polygon Rush v15.5.37 Mesh Scene + Collision Fix');
s=s.replaceAll('v15.5.36 • ASSET ORIENTATION + CAR ART','v15.5.37 • MESH SCENE + COLLISION FIX');
s=s.replaceAll("version:'15.5.36'","version:'15.5.37'");

// Remove the generated Free Roam slab/plane course entirely. This was the source of the
// center flicker/z-fighting and the flat rideable-plane collision behavior.
s=s.replace(/function addFreeRoamCourseFeatures\(\)\{[\s\S]*?\n\}/,
`function addFreeRoamCourseFeatures(){
 surfaceColliders.length=0;
 // v15.5.37: no generated slab/plane geometry in Free Roam.
 // Terrain comes from the Free Roam terrain sampler; solid objects come from imported meshes.
}`);
s=s.replace("if(freeRoamMode)addFreeRoamCourseFeatures();","if(freeRoamMode){surfaceColliders.length=0;addFreeRoamCourseFeatures();}");

const insert=`
function addGeometryCollider(holder,padding=.08,minHeight=.6){
 holder.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(holder);if(box.isEmpty())return null;
 const size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);
 const proxy=new THREE.Object3D();proxy.position.copy(center);proxy.rotation.y=holder.rotation.y||0;proxy.visible=false;
 proxy.userData.collider={hx:Math.max(.2,size.x*.5+padding),hy:Math.max(minHeight*.5,size.y*.5+padding),hz:Math.max(.2,size.z*.5+padding),yaw:proxy.rotation.y,rideable:false,source:'imported-mesh-bounds'};
 world.add(proxy);barriers.push(proxy);return proxy;
}
function clearLegacyPrimitiveFreeRoam(){
 surfaceColliders.length=0;
 for(const o of [...world.children]){
  if(o.name==='freeRoamProductionArt'){o.visible=false;continue}
  if(o.isMesh&&o.geometry?.type==='BoxGeometry'&&o.userData?.collider?.rideable){world.remove(o)}
 }
}
`;
const anchor='function normalizeAsset(src,targetHeight){';must(s.includes(anchor),'normalizeAsset anchor missing');s=s.replace(anchor,insert+'\n'+anchor);

// Make imported-asset collision derive from the actual loaded model bounds rather than hard-coded rectangles.
s=s.replace("const place=async(name,x,z,h,yaw=0,collider=null,kind='prop')=>{const src=await get(name);if(!src)return null;const holder=orientAsset(normalizeAsset(src,h),kind);holder.position.set(x,freeRoamSurfaceY({x,z}),z);holder.rotation.y+=yaw;group.add(holder);realAssetState.count++;realAssetState.names.push(name);if(collider)addRealCollider(x,z,collider[0],collider[1],yaw);return holder};",
"const place=async(name,x,z,h,yaw=0,collider=null,kind='prop')=>{const src=await get(name);if(!src)return null;const holder=orientAsset(normalizeAsset(src,h),kind);holder.position.set(x,freeRoamSurfaceY({x,z}),z);holder.rotation.y+=yaw;group.add(holder);holder.updateMatrixWorld(true);realAssetState.count++;realAssetState.names.push(name);if(collider)addGeometryCollider(holder,.06,.5);return holder};");

// Ensure only imported art is visible once assets are ready.
s=s.replace("const proc=world.getObjectByName('freeRoamProductionArt');if(proc)proc.visible=false;",
"clearLegacyPrimitiveFreeRoam();const proc=world.getObjectByName('freeRoamProductionArt');if(proc)proc.visible=false;");

// Add a runtime diagnostic for this exact regression.
s=s.replace("wheelPhysics:true,realAssets:()=>({...realAssetState}),productionArt:()=>",
"wheelPhysics:true,realAssets:()=>({...realAssetState}),freeRoamMeshCollision:()=>({surfaceColliders:surfaceColliders.length,visibleRideablePrimitives:world.children.filter(o=>o.isMesh&&o.visible&&o.userData?.collider?.rideable).length,geometryBoundColliders:barriers.filter(o=>o.userData?.collider?.source==='imported-mesh-bounds').length}),productionArt:()=>");

s+='\n<!-- v15.5.37 no center slab, no rideable primitive planes, imported mesh visuals + geometry-derived volumetric collision -->\n';
for(const x of ['v15.5.37','addGeometryCollider','freeRoamMeshCollision','no generated slab/plane geometry'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.37 mesh scene/collision fix applied');
