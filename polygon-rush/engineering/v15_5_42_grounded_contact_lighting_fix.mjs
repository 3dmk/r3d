import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.41 Single Wheel Set','Polygon Rush v15.5.42 Grounded Contact + Lighting');
s=s.replaceAll('v15.5.41 • SINGLE WHEEL SET','v15.5.42 • GROUNDED CONTACT + LIGHTING');
s=s.replaceAll("version:'15.5.41'","version:'15.5.42'");

const oldLight="renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('#game').appendChild(renderer.domElement);\nconst hemi=new THREE.HemisphereLight(0xeaf8ff,0x332b24,.78);scene.add(hemi);const sun=new THREE.DirectionalLight(0xffefd0,3.35);sun.position.set(-82,118,58);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-190;sun.shadow.camera.right=190;sun.shadow.camera.top=190;sun.shadow.camera.bottom=-190;sun.shadow.camera.near=1;sun.shadow.camera.far=360;sun.shadow.bias=-.00025;sun.shadow.normalBias=.025;sun.target.position.set(0,0,0);scene.add(sun.target);scene.add(sun);";
const newLight="renderer.toneMappingExposure=.92;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('#game').appendChild(renderer.domElement);\nconst hemi=new THREE.HemisphereLight(0xddeeff,0x4b4034,.46);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff1d6,2.25);sun.position.set(-64,96,48);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.camera.near=1;sun.shadow.camera.far=260;sun.shadow.bias=-.00008;sun.shadow.normalBias=.012;sun.target.position.set(0,0,0);scene.add(sun.target);scene.add(sun);const fill=new THREE.DirectionalLight(0xbfd8ff,.28);fill.position.set(56,38,-64);fill.castShadow=false;scene.add(fill);";
must(s.includes(oldLight),'lighting anchor missing');s=s.replace(oldLight,newLight);

const oldImpulse=/function applyWorldContactImpulse\(car,contacts,dt\)\{[\s\S]*?return \{count:hits.length,normal:n,impulse,torque\};\n\}/;
must(oldImpulse.test(s),'world impulse function missing');
s=s.replace(oldImpulse,`function applyWorldContactImpulse(car,contacts,dt){
 const hits=contacts.filter(c=>c.supported);if(!hits.length)return {count:0,normal:new THREE.Vector3(0,1,0),impulse:0,torque:new THREE.Vector3()};
 let n=hits.reduce((a,c)=>a.add(c.normal),new THREE.Vector3()).normalize();if(n.y<.12)n.y=.12;n.normalize();
 const v=new THREE.Vector3(car.vel.x,car.vy||car.vel.y||0,car.vel.z),vn=v.dot(n);
 let impulse=0;
 // Ground and ramp contacts are support constraints, not bouncy ball impacts.
 if(vn<0){const restitution=Math.abs(vn)>8?.025:0;const remove=-(1+restitution)*vn;v.addScaledVector(n,remove);impulse=remove*(car.mass||1180)}
 // Tire/chassis friction acts only in the surface tangent plane.
 const tangent=v.clone().addScaledVector(n,-v.dot(n)),tLen=tangent.length();
 if(tLen>1e-5){const groundedGrip=hits.length>=3?.92:.72,drop=Math.min(tLen,9.81*groundedGrip*dt);v.addScaledVector(tangent,-drop/tLen)}
 // Prevent tiny vertical residuals from making the chassis hover after contact.
 if(hits.length>=2&&Math.abs(v.y)<1.25)v.y*=Math.max(0,1-dt*18);
 car.vel.x=v.x;car.vel.z=v.z;car.vy=v.y;car.vel.y=v.y;
 const forward=new THREE.Vector3(Math.sin(car.heading),0,Math.cos(car.heading)),right=new THREE.Vector3(Math.cos(car.heading),0,-Math.sin(car.heading));
 car.contactPitchTarget=-Math.asin(clamp(n.dot(forward),-.88,.88));car.contactRollTarget=Math.asin(clamp(n.dot(right),-.88,.88));
 const center=new THREE.Vector3(car.pos.x,car.pos.y+.42,car.pos.z),cp=hits.reduce((a,c)=>a.add(new THREE.Vector3(c.x,c.y,c.z)),new THREE.Vector3()).multiplyScalar(1/hits.length),r=cp.sub(center);
 const force=n.clone().multiplyScalar(impulse/Math.max(dt,.001)),torque=r.cross(force),inertia=Math.max(700,(car.mass||1180)*2.8);
 car.pitchRate=clamp((car.pitchRate||0)+torque.x/inertia*dt,-1.15,1.15);car.rollRate=clamp((car.rollRate||0)+torque.z/inertia*dt,-1.05,1.05);car.yawRate+=(torque.y/inertia)*dt*.12;
 car.pitchRate*=Math.exp(-7.5*dt);car.rollRate*=Math.exp(-7.5*dt);
 return {count:hits.length,normal:n,impulse,torque};
}`);

const oldVertical=` if(supported.length>=2){
   const targetY=surfaceY+.04,err=targetY-car.pos.y;
   const supportGain=clamp(1- Math.abs(car.vy||0)*.08,.18,1),maxStep=.022+Math.min(.045,Math.abs(long)*dt*.05);
   car.pos.y+=clamp(err,-maxStep,maxStep)*Math.min(1,dt*8)*supportGain;
   if(err>0&&car.vy<0)car.vy*=.35;
 }`;
const newVertical=` if(supported.length>=2){
   const wheelRadius=.41,rideHeight=.54,targetY=surfaceY+rideHeight,err=targetY-car.pos.y;
   const grounded=supported.length>=3&&Math.abs(err)<.42;
   const maxCorrection=grounded?.024:.012;
   car.pos.y+=clamp(err,-maxCorrection,maxCorrection)*Math.min(1,dt*(grounded?14:6));
   if(grounded){if(car.vy<0)car.vy*=.18;if(Math.abs(car.vy)<.32)car.vy=0;car.airborne=false}
 }`;
must(s.includes(oldVertical),'vertical support anchor missing');s=s.replace(oldVertical,newVertical);

const visualTarget="         targetRoll=physicalRoll+dynRoll+(car.rollRate||0)*.035,targetPitch=physicalPitch+dynPitch+(car.pitchRate||0)*.035;";
const visualNew="         targetRoll=clamp(physicalRoll+dynRoll+(car.rollRate||0)*.018,-.38,.38),targetPitch=clamp(physicalPitch+dynPitch+(car.pitchRate||0)*.018,-.46,.46);";
must(s.includes(visualTarget),'visual target anchor missing');s=s.replace(visualTarget,visualNew);

const diag="singleWheelSet:()=>({dedicatedVisible:realCarWheels.filter(w=>w.visible!==false).length,embeddedHidden:realCarVisual?.getObjectByName('productionCarBody')?.userData?.embeddedWheelMeshesHidden||0,totalDedicated:realCarWheels.length}),";
must(s.includes(diag),'diagnostic anchor missing');s=s.replace(diag,diag+"groundedContact:()=>({contacts:player?.wheelContactCount||0,vy:player?.vy||0,airborne:!!player?.airborne,normal:player?.contactNormal?[player.contactNormal.x,player.contactNormal.y,player.contactNormal.z]:[0,1,0],pitch:player?.contactPitch||0,roll:player?.contactRoll||0,exposure:renderer.toneMappingExposure,hemi:hemi.intensity,sun:sun.intensity}),");

s+='\n<!-- v15.5.42 grounded non-ball contact; near-zero restitution; tangent grip; anti-hover support; cleaner restrained lighting/shadows -->\n';
for(const x of ['v15.5.42','groundedContact:()=>','restitution=Math.abs(vn)>8?.025:0','renderer.toneMappingExposure=.92'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.42 grounded contact + lighting applied');
