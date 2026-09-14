import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.2 Grip + Collision Fix','Polygon Rush v15.5.3 Direction Stability Fix');
s=s.replaceAll('v15.5.2 • GRIP + COLLISION FIX','v15.5.3 • DIRECTION STABILITY FIX');
s=s.replaceAll("version:'15.5.2'","version:'15.5.3'");

s=s.replace('steerMax:.54, steerResponse:8.5, yawDamping:1.95, gripScale:1.62, lowSpeedGrip:2.4,',
            'steerMax:.52, steerResponse:8.8, yawDamping:2.35, gripScale:1.68, lowSpeedGrip:3.2, directionHold:4.6, collisionHold:.72,');

s=s.replace('car.yawRate+=torqueY/WHEEL_PHYS.inertiaY*dt;\n car.yawRate*=Math.exp(-WHEEL_PHYS.yawDamping*dt);',
`car.yawRate+=torqueY/WHEEL_PHYS.inertiaY*dt;
 const steerAbs=Math.abs(controls.steer||0),hold=WHEEL_PHYS.directionHold*(1-steerAbs*.62);
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDamping+hold*.28)*dt);
 if(!(controls.handbrake||0)){
  const lvHold=localVelocity(car),latHold=lvHold.lat,keep=1-Math.exp(-hold*dt);
  const rx=Math.cos(car.heading),rz=-Math.sin(car.heading);
  car.vel.x-=rx*latHold*keep;car.vel.z-=rz*latHold*keep;
 }
 car.yawRate*=1;`);

// Stabilize post-collision motion so impact response is immediate but does not leave the car
// travelling sideways while its chassis keeps pointing elsewhere.
const insertAfter=`function stabilizeAfterCollision(car,strength=WHEEL_PHYS.collisionHold){
 const lv=localVelocity(car),forward=Math.sin(car.heading),forwardZ=Math.cos(car.heading),right=Math.cos(car.heading),rightZ=-Math.sin(car.heading);
 const lat=lv.lat,long=lv.long;
 const keptLat=lat*(1-strength);
 car.vel.x=keptLat*right+long*forward;
 car.vel.z=keptLat*rightZ+long*forwardZ;
 car.yawRate=(car.yawRate||0)*(1-strength*.55);
}\n`;
const marker='function resolveCarCollision(a,b){';
must(s.includes(marker),'collision marker missing');
s=s.replace(marker,insertAfter+marker);

s=s.replace("if(iter===0){applyImpactDamage(a,Math.abs(rel)/24,'collision');applyImpactDamage(b,Math.abs(rel)/24,'collision')}",
            "if(iter===0){stabilizeAfterCollision(a);stabilizeAfterCollision(b);applyImpactDamage(a,Math.abs(rel)/24,'collision');applyImpactDamage(b,Math.abs(rel)/24,'collision')}");
s=s.replace("car.vel.multiplyScalar(.965);applyImpactDamage(car,speed/55,'collision');return true;",
            "car.vel.multiplyScalar(.965);stabilizeAfterCollision(car,.58);applyImpactDamage(car,speed/55,'collision');return true;");

const hook="window.__polygonRush={version:'15.5.3',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testSteeringGrip:()=>{const idx=100,p=trackSamples[idx].clone(),h=trackHeading(idx),dummy={pos:p,vel:new THREE.Vector3(Math.sin(h)*20,0,Math.cos(h)*20),heading:h,speed:20,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};const h0=dummy.heading;for(let i=0;i<90;i++)applyArcadeMovement(dummy,{throttle:.55,brake:0,steer:.55,handbrake:0,nitro:false},1/60);const lv=localVelocity(dummy),slip=Math.atan2(Math.abs(lv.lat),Math.abs(lv.long)+.25);return {headingChange:Math.abs(wrapAngle(dummy.heading-h0)),slip,long:lv.long,lat:lv.lat}},testDirectionHold:()=>{const mk=(x,z,vx,vz,h)=>({pos:new THREE.Vector3(x,0,z),vel:new THREE.Vector3(vx,0,vz),heading:h,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,yawRate:.7});const a=mk(-1,0,12,3,Math.PI/2),b=mk(1,0,-8,-2,-Math.PI/2);resolveCarCollision(a,b);const a0=a.heading,b0=b.heading;for(let i=0;i<60;i++){applyArcadeMovement(a,{throttle:0,brake:0,steer:0,handbrake:0,nitro:false},1/60);applyArcadeMovement(b,{throttle:0,brake:0,steer:0,handbrake:0,nitro:false},1/60)}const la=localVelocity(a),lb=localVelocity(b);return {aSlip:Math.atan2(Math.abs(la.lat),Math.abs(la.long)+.25),bSlip:Math.atan2(Math.abs(lb.lat),Math.abs(lb.long)+.25),aHeadingDrift:Math.abs(wrapAngle(a.heading-a0)),bHeadingDrift:Math.abs(wrapAngle(b.heading-b0))}},`);

for(const r of ['Polygon Rush v15.5.3 Direction Stability Fix','directionHold:4.6','collisionHold:.72','function stabilizeAfterCollision','testSteeringGrip:()=>','testDirectionHold:()=>'])must(s.includes(r),'v15.5.3 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.3 direction stability fix applied');
