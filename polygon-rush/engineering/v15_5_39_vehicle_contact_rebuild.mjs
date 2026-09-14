import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.38 Real Ramps + Mesh Surface + Lighting','Polygon Rush v15.5.39 Four-Wheel Mesh Contact');
s=s.replaceAll('v15.5.38 • REAL RAMPS + MESH SURFACE + LIGHTING','v15.5.39 • FOUR-WHEEL MESH CONTACT');
s=s.replaceAll("version:'15.5.38'","version:'15.5.39'");

const oldWheelContact=`function wheelContact(car,localX,localZ){
 const c=Math.cos(car.heading),si=Math.sin(car.heading),
       wx=car.pos.x+localX*c+localZ*si,wz=car.pos.z-localX*si+localZ*c;
 const smp=sampleTrackSurface({x:wx,z:wz}),restY=car.pos.y+.58,compression=clamp((smp.y+.58-restY)*2.1+.5,0,1);
 return {x:wx,z:wz,y:smp.y,compression};
}`;
const newWheelContact=`function wheelContact(car,localX,localZ){
 const c=Math.cos(car.heading),si=Math.sin(car.heading),
       wx=car.pos.x+localX*c+localZ*si,wz=car.pos.z-localX*si+localZ*c;
 const smp=sampleTrackSurface({x:wx,z:wz}),normal=(smp.surfaceNormal?.clone?.()||new THREE.Vector3(0,1,0)).normalize();
 const hubY=car.pos.y+.62,travel=Math.max(.18,WHEEL_PHYS.suspensionTravel||.46),gap=hubY-smp.y;
 const compression=clamp((travel+.58-gap)/travel,0,1),supported=gap<1.18&&normal.y>.16;
 return {x:wx,z:wz,y:smp.y,compression,supported,normal,surface:smp};
}`;
must(s.includes(oldWheelContact),'wheelContact anchor missing');s=s.replace(oldWheelContact,newWheelContact);

const suspRe=/function updateSuspension\(car,dt,long,lat\)\{[\s\S]*?return \{surfaceY,front,rear,left,right,avgComp\}\n\}/;
must(suspRe.test(s),'updateSuspension block missing');
s=s.replace(suspRe,`function updateSuspension(car,dt,long,lat){
 const fl=wheelContact(car,-1.42,1.58),fr=wheelContact(car,1.42,1.58),rl=wheelContact(car,-1.42,-1.58),rr=wheelContact(car,1.42,-1.58);
 const contacts=[fl,fr,rl,rr],supported=contacts.filter(c=>c.supported),use=supported.length>=2?supported:contacts;
 const front=(fl.y+fr.y)*.5,rear=(rl.y+rr.y)*.5,left=(fl.y+rl.y)*.5,right=(fr.y+rr.y)*.5;
 const surfaceY=use.reduce((a,c)=>a+c.y,0)/Math.max(1,use.length);
 const pitchTerrain=clamp(Math.atan2(front-rear,3.16),-.48,.48),rollTerrain=clamp(Math.atan2(left-right,2.84),-.40,.40);
 const avgNormal=use.reduce((n,c)=>n.add(c.normal),new THREE.Vector3()).normalize();
 car.surfaceY=surfaceY;car.contactPitch=pitchTerrain;car.contactRoll=rollTerrain;car.contactNormal=avgNormal;car.wheelContactCount=supported.length;
 const wheels=car.g.userData.allWheels||[];
 for(let i=0;i<wheels.length&&i<contacts.length;i++){
   const w=wheels[i],c=contacts[i];w.position.y=.62-(c.compression-.5)*.22;
 }
 const vis=car.g.userData.visual;
 if(vis){
   const dynRoll=clamp(-car.steer*Math.min(Math.abs(long)/30,1)*.10-lat*.006,-.12,.12),
         dynPitch=clamp(-car.longAccel*.004,-.07,.07),
         targetRoll=rollTerrain+dynRoll,targetPitch=pitchTerrain+dynPitch;
   car.g.userData.roll+=(targetRoll-car.g.userData.roll)*Math.min(1,dt*8.0);
   car.g.userData.pitch+=(targetPitch-car.g.userData.pitch)*Math.min(1,dt*8.0);
   vis.rotation.z=car.g.userData.roll;vis.rotation.x=car.g.userData.pitch;
 }
 if(supported.length>=2){
   const targetY=surfaceY+.04,err=targetY-car.pos.y,maxStep=.035+Math.min(.07,Math.abs(long)*dt*.08);
   car.pos.y+=clamp(err,-maxStep,maxStep)*Math.min(1,dt*12);
   if((car.vy||0)>2.2)car.vy=2.2;
 }
 const avgComp=(fl.compression+fr.compression+rl.compression+rr.compression)*.25;car.bottomOut=avgComp>.95;
 return {surfaceY,front,rear,left,right,avgComp,contactCount:supported.length,normal:avgNormal}
}`);

const rideAnchor=`function resolveRideableObjectCollision(car,obj,carRadius=1.35){\n const c=obj?.userData?.collider;if(!c)return false;\n if(c.rideable){const top=objectTopSurface(obj,car.pos);if(top){const support=sampleTrackSurface(car.pos).y;if(top.y<=support+.45||car.pos.y>=top.y-.15)return false}}\n return resolveObjectCollisionOBB(car,obj,carRadius);\n}`;
must(s.includes(rideAnchor),'rideable collision anchor missing');
const chassisFns=`function resolveChassisOBB(car,obj){
 const c=obj?.userData?.collider;if(!c)return false;
 const ahx=1.12,ahz=2.15,bhx=Math.max(.1,c.hx||1),bhz=Math.max(.1,c.hz||1),ay=car.heading||0,by=c.yaw??obj.rotation.y??0;
 const axes=[{x:Math.cos(ay),z:-Math.sin(ay)},{x:Math.sin(ay),z:Math.cos(ay)},{x:Math.cos(by),z:-Math.sin(by)},{x:Math.sin(by),z:Math.cos(by)}];
 const acx=car.pos.x,acz=car.pos.z,bcx=obj.position.x,bcz=obj.position.z,dx=acx-bcx,dz=acz-bcz;
 let minOverlap=Infinity,best=null;
 const ar={r:{x:Math.cos(ay),z:-Math.sin(ay)},f:{x:Math.sin(ay),z:Math.cos(ay)}},br={r:{x:Math.cos(by),z:-Math.sin(by)},f:{x:Math.sin(by),z:Math.cos(by)}};
 for(const axis of axes){const al=Math.hypot(axis.x,axis.z)||1,ux=axis.x/al,uz=axis.z/al,dist=Math.abs(dx*ux+dz*uz),ra=ahx*Math.abs(ar.r.x*ux+ar.r.z*uz)+ahz*Math.abs(ar.f.x*ux+ar.f.z*uz),rb=bhx*Math.abs(br.r.x*ux+br.r.z*uz)+bhz*Math.abs(br.f.x*ux+br.f.z*uz),ov=ra+rb-dist;if(ov<=0)return false;if(ov<minOverlap){minOverlap=ov;const sign=(dx*ux+dz*uz)>=0?1:-1;best={x:ux*sign,z:uz*sign}}}
 if(!best)return false;const push=Math.max(0,minOverlap+.012);car.pos.x+=best.x*push;car.pos.z+=best.z*push;
 const vn=car.vel.x*best.x+car.vel.z*best.z;if(vn<0){car.vel.x-=best.x*vn*1.04;car.vel.z-=best.z*vn*1.04;car.yawRate=(car.yawRate||0)*.86}return true;
}
`;
s=s.replace(rideAnchor,chassisFns+`\nfunction resolveRideableObjectCollision(car,obj,carRadius=1.35){
 const c=obj?.userData?.collider;if(!c)return false;
 if(c.rideable){const top=objectTopSurface(obj,car.pos);if(top){const support=sampleTrackSurface(car.pos).y;if(top.y<=support+.45||car.pos.y>=top.y-.15)return false}}
 return resolveChassisOBB(car,obj);
}`);

const bodyAnchor="body.position.y=.20;body.name='productionCarBody';carRoot.add(body);";
must(s.includes(bodyAnchor),'real car body anchor missing');
s=s.replace(bodyAnchor,bodyAnchor+`\n   const legacyWheels=player.g.userData.allWheels||[];for(const lw of legacyWheels){if(lw.userData.tire)lw.userData.tire.visible=false;if(lw.userData.rim)lw.userData.rim.visible=false}const legacyVisual=player.g.userData.visual;legacyVisual?.traverse(n=>{if(n.isMesh&&n.geometry?.type==='TorusGeometry')n.visible=false});`);

const diagAnchor="rampSurface:()=>rampSurfaceDiagnostics(),";
must(s.includes(diagAnchor),'diagnostic anchor missing');
s=s.replace(diagAnchor,diagAnchor+`vehicleContact:()=>({legacyVisibleWheels:(player?.g?.userData?.allWheels||[]).filter(w=>w.userData?.tire?.visible||w.userData?.rim?.visible).length,realWheelCount:realCarWheels.length,contactCount:player?.wheelContactCount||0,pitch:player?.contactPitch||0,roll:player?.contactRoll||0,normal:player?.contactNormal?[player.contactNormal.x,player.contactNormal.y,player.contactNormal.z]:[0,1,0],chassisHalf:[1.12,2.15]}),`);

s+='\n<!-- v15.5.39 one visible wheel set; four independent mesh contacts; oriented chassis OBB; slope pitch/roll; bounded vertical follow -->\n';
for(const x of ['v15.5.39','resolveChassisOBB','vehicleContact:()=>','legacyVisibleWheels','wheelContactCount'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.39 vehicle contact rebuild applied');
