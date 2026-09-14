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

s=s.replaceAll('Polygon Rush v15.5 Wheel Physics Rebuild','Polygon Rush v15.5.1 Wheel Axis Fix');
s=s.replaceAll('v15.5 • WHEEL PHYSICS REBUILD','v15.5.1 • WHEEL AXIS FIX');
s=s.replaceAll("version:'15.5'","version:'15.5.1'");

// CylinderGeometry starts with its axle on local Y. Bake the 90-degree orientation
// into the geometry once so transforms stay separated: pivot Y = steering,
// tire/rim X = rolling spin.
const oldTire="const tire=new THREE.Mesh(new THREE.CylinderGeometry(.58,.58,.42,16),dark);tire.rotation.z=Math.PI/2;tire.castShadow=true;pivot.add(tire);";
const newTire="const tireGeo=new THREE.CylinderGeometry(.58,.58,.42,16);tireGeo.rotateZ(Math.PI/2);const tire=new THREE.Mesh(tireGeo,dark);tire.castShadow=true;pivot.add(tire);";
const oldRim="const rim=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.44,12),cageMat);rim.rotation.z=Math.PI/2;pivot.add(rim);";
const newRim="const rimGeo=new THREE.CylinderGeometry(.31,.31,.44,12);rimGeo.rotateZ(Math.PI/2);const rim=new THREE.Mesh(rimGeo,cageMat);pivot.add(rim);";
must(s.includes(oldTire),'tire construction marker missing');
must(s.includes(oldRim),'rim construction marker missing');
s=s.replace(oldTire,newTire).replace(oldRim,newRim);

replaceFunction('animateBuggy',`function animateBuggy(car,long,lat,dt){
 const wheels=car.g?.userData?.allWheels||[];
 const states=car._wheelPhysics||[];
 for(let i=0;i<wheels.length;i++){
  const w=wheels[i],st=states[i]||null;
  const steer=st?st.steer:(w.userData.front?(car._steerAngle||0):0);
  w.rotation.set(0,steer,0);
  if(st){
   w.userData.spin=(w.userData.spin||0)-st.spin*dt;
   w.userData.compression=st.compression;
   w.position.y=.62-(st.compression-.5)*.26;
  }else w.userData.spin=(w.userData.spin||0)-long*dt/WHEEL_PHYS.wheelRadius;
  if(w.userData.tire)w.userData.tire.rotation.set(w.userData.spin,0,0);
  if(w.userData.rim)w.userData.rim.rotation.set(w.userData.spin,0,0);
 }
}`);

const diagNeedle="spin:(player.g?.userData?.allWheels||[]).map(w=>w.userData.spin||0),states:";
const diagReplacement="spin:(player.g?.userData?.allWheels||[]).map(w=>w.userData.spin||0),wheelEuler:(player.g?.userData?.allWheels||[]).map(w=>w.userData.tire?[w.userData.tire.rotation.x,w.userData.tire.rotation.y,w.userData.tire.rotation.z]:[0,0,0]),states:";
must(s.includes(diagNeedle),'runtime diagnostics spin marker missing');
s=s.replace(diagNeedle,diagReplacement);

const aiNeedle='testAI:(steps=120)=>{';
must(s.includes(aiNeedle),'testAI hook missing');
s=s.replace(aiNeedle,"forceGo:()=>{raceStarted=true;countdown=0;window.__polygonRush.go=true;return true},testAI:(steps=120)=>{");

for(const r of ['Polygon Rush v15.5.1 Wheel Axis Fix','tireGeo.rotateZ(Math.PI/2)','rimGeo.rotateZ(Math.PI/2)','w.userData.tire.rotation.set(w.userData.spin,0,0)','w.userData.rim.rotation.set(w.userData.spin,0,0)','wheelEuler:','forceGo:()=>'])must(s.includes(r),'v15.5.1 missing '+r);
for(const bad of ['w.userData.tire.rotation.y=w.userData.spin','w.userData.rim.rotation.y=w.userData.spin','tire.rotation.z=Math.PI/2','rim.rotation.z=Math.PI/2'])must(!s.includes(bad),'v15.5.1 stale wrong-axis code '+bad);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.1 wheel axis fix applied');
