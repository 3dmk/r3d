import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.39 Four-Wheel Mesh Contact','Polygon Rush v15.5.40 3D World Contact');
s=s.replaceAll('v15.5.39 • FOUR-WHEEL MESH CONTACT','v15.5.40 • 3D WORLD CONTACT');
s=s.replaceAll("version:'15.5.39'","version:'15.5.40'");

const suspAnchor='function updateSuspension(car,dt,long,lat){';
const worldFns=`function applyWorldContactImpulse(car,contacts,dt){
 const hits=contacts.filter(c=>c.supported);if(!hits.length)return {count:0,normal:new THREE.Vector3(0,1,0),impulse:0};
 let n=hits.reduce((a,c)=>a.add(c.normal),new THREE.Vector3()).normalize();if(n.y<.05)n.y=.05;n.normalize();
 const v3=new THREE.Vector3(car.vel.x,car.vy||car.vel.y||0,car.vel.z),vn=v3.dot(n);
 let impulse=0;
 if(vn<0){const restitution=.08,remove=-(1+restitution)*vn;v3.addScaledVector(n,remove);impulse=remove*(car.mass||1180)}
 const tangent=v3.clone().addScaledVector(n,-v3.dot(n));const tLen=tangent.length();
 if(tLen>1e-5){const friction=clamp(.35+hits.length*.08,.35,.67),drop=Math.min(tLen,9.81*friction*dt);v3.addScaledVector(tangent,-drop/tLen)}
 car.vel.x=v3.x;car.vel.z=v3.z;car.vy=v3.y;car.vel.y=v3.y;
 const forward=new THREE.Vector3(Math.sin(car.heading),0,Math.cos(car.heading)),right=new THREE.Vector3(Math.cos(car.heading),0,-Math.sin(car.heading));
 const slopeForward=Math.asin(clamp(n.dot(forward),-.95,.95)),slopeSide=Math.asin(clamp(n.dot(right),-.95,.95));
 car.contactPitchTarget=-slopeForward;car.contactRollTarget=slopeSide;
 const center=new THREE.Vector3(car.pos.x,car.pos.y+.55,car.pos.z),cp=hits.reduce((a,c)=>a.add(new THREE.Vector3(c.x,c.y,c.z)),new THREE.Vector3()).multiplyScalar(1/hits.length),r=cp.sub(center),force=n.clone().multiplyScalar(impulse/Math.max(dt,.001)),torque=r.cross(force);
 const inertia=Math.max(450,(car.mass||1180)*2.1);car.pitchRate=(car.pitchRate||0)+torque.x/inertia*dt;car.rollRate=(car.rollRate||0)+torque.z/inertia*dt;car.yawRate=(car.yawRate||0)+torque.y/inertia*dt*.35;
 car.pitchRate*=Math.pow(.58,dt);car.rollRate*=Math.pow(.58,dt);
 return {count:hits.length,normal:n,impulse,torque};
}
`;
must(s.includes(suspAnchor),'suspension anchor missing');s=s.replace(suspAnchor,worldFns+suspAnchor);

const oldChunk=` const avgNormal=use.reduce((n,c)=>n.add(c.normal),new THREE.Vector3()).normalize();
 car.surfaceY=surfaceY;car.contactPitch=pitchTerrain;car.contactRoll=rollTerrain;car.contactNormal=avgNormal;car.wheelContactCount=supported.length;`;
const newChunk=` const avgNormal=use.reduce((n,c)=>n.add(c.normal),new THREE.Vector3()).normalize();
 const worldContact=applyWorldContactImpulse(car,contacts,dt);
 const physicalPitch=worldContact.count?car.contactPitchTarget:pitchTerrain,physicalRoll=worldContact.count?car.contactRollTarget:rollTerrain;
 car.surfaceY=surfaceY;car.contactPitch=physicalPitch;car.contactRoll=physicalRoll;car.contactNormal=worldContact.normal||avgNormal;car.wheelContactCount=supported.length;car.lastWorldImpulse=worldContact.impulse||0;car.lastWorldTorque=worldContact.torque||new THREE.Vector3();`;
must(s.includes(oldChunk),'contact state anchor missing');s=s.replace(oldChunk,newChunk);

const oldTarget=`         targetRoll=rollTerrain+dynRoll,targetPitch=pitchTerrain+dynPitch;`;
const newTarget=`         targetRoll=physicalRoll+dynRoll+(car.rollRate||0)*.035,targetPitch=physicalPitch+dynPitch+(car.pitchRate||0)*.035;`;
must(s.includes(oldTarget),'visual slope target anchor missing');s=s.replace(oldTarget,newTarget);

const oldVertical=` if(supported.length>=2){
   const targetY=surfaceY+.04,err=targetY-car.pos.y,maxStep=.035+Math.min(.07,Math.abs(long)*dt*.08);
   car.pos.y+=clamp(err,-maxStep,maxStep)*Math.min(1,dt*12);
   if((car.vy||0)>2.2)car.vy=2.2;
 }`;
const newVertical=` if(supported.length>=2){
   const targetY=surfaceY+.04,err=targetY-car.pos.y;
   const supportGain=clamp(1- Math.abs(car.vy||0)*.08,.18,1),maxStep=.022+Math.min(.045,Math.abs(long)*dt*.05);
   car.pos.y+=clamp(err,-maxStep,maxStep)*Math.min(1,dt*8)*supportGain;
   if(err>0&&car.vy<0)car.vy*=.35;
 }`;
must(s.includes(oldVertical),'vertical follow anchor missing');s=s.replace(oldVertical,newVertical);

const diagAnchor="vehicleContact:()=>({legacyVisibleWheels:(player?.g?.userData?.allWheels||[]).filter(w=>w.userData?.tire?.visible||w.userData?.rim?.visible).length,realWheelCount:realCarWheels.length,contactCount:player?.wheelContactCount||0,pitch:player?.contactPitch||0,roll:player?.contactRoll||0,normal:player?.contactNormal?[player.contactNormal.x,player.contactNormal.y,player.contactNormal.z]:[0,1,0],chassisHalf:[1.12,2.15]}),";
must(s.includes(diagAnchor),'vehicle diagnostic anchor missing');s=s.replace(diagAnchor,"vehicleContact:()=>({legacyVisibleWheels:(player?.g?.userData?.allWheels||[]).filter(w=>w.userData?.tire?.visible||w.userData?.rim?.visible).length,realWheelCount:realCarWheels.length,contactCount:player?.wheelContactCount||0,pitch:player?.contactPitch||0,roll:player?.contactRoll||0,normal:player?.contactNormal?[player.contactNormal.x,player.contactNormal.y,player.contactNormal.z]:[0,1,0],worldImpulse:player?.lastWorldImpulse||0,worldTorque:player?.lastWorldTorque?[player.lastWorldTorque.x,player.lastWorldTorque.y,player.lastWorldTorque.z]:[0,0,0],pitchRate:player?.pitchRate||0,rollRate:player?.rollRate||0,chassisHalf:[1.12,2.15]}),");

s+='\n<!-- v15.5.40 3D triangle-normal contact impulses; tangent friction; contact torque; slope angular response; reduced height snapping -->\n';
for(const x of ['v15.5.40','applyWorldContactImpulse','worldImpulse','worldTorque'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.40 3D world contact impulse applied');
