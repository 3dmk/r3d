import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.4 Car Steering Fix','Polygon Rush v15.5.5 Drive + Friction Fix');
s=s.replaceAll('v15.5.4 • CAR STEERING FIX','v15.5.5 • DRIVE + FRICTION FIX');
s=s.replaceAll("version:'15.5.4'","version:'15.5.5'");

s=s.replace('steerMax:.52, steerResponse:8.8, yawDamping:2.35, gripScale:1.68, lowSpeedGrip:3.2, directionHold:4.6, collisionHold:.72,',
            'steerMax:.52, steerResponse:8.8, yawDamping:2.35, gripScale:1.68, lowSpeedGrip:3.2, directionHold:4.6, collisionHold:.72, driveGrip:1.16, coastFriction:.92, rollingFriction:.58,');

const old=` let long=lv0.long,lat=lv0.lat;
 const throttle=controls.throttle||0,brake=controls.brake||0,handbrake=controls.handbrake||0;
 const engineAccel=(long<-.5?WHEEL_PHYS.reverseForce:WHEEL_PHYS.driveForce)/WHEEL_PHYS.mass;
 if(throttle>0)long+=engineAccel*throttle*dt;
 if(brake>0){
  const dec=WHEEL_PHYS.brakeForce/WHEEL_PHYS.mass*brake*dt;
  if(Math.abs(long)<=dec)long=0;else long-=Math.sign(long)*dec;
 }
 const drag=(WHEEL_PHYS.rollingResistance/WHEEL_PHYS.mass+WHEEL_PHYS.aeroDrag*Math.abs(long)/WHEEL_PHYS.mass)*dt;
 if(Math.abs(long)<=drag)long=0;else long-=Math.sign(long)*drag;
 if(controls.nitro&&long>=0)long+=7.2*dt;
 long=clamp(long,-18,62);`;
const neu=` let long=lv0.long,lat=lv0.lat;
 const throttle=controls.throttle||0,brake=controls.brake||0,handbrake=controls.handbrake||0;
 const absLong=Math.abs(long),surfaceGrip=clamp(grip,.38,1.3);
 // Driven-wheel traction gives the car a positive push against the road instead of free-sliding acceleration.
 const torqueCurve=clamp(1.16-absLong/92,.46,1.12);
 const baseDrive=(long<-.5?WHEEL_PHYS.reverseForce:WHEEL_PHYS.driveForce)/WHEEL_PHYS.mass;
 const driveAccel=baseDrive*WHEEL_PHYS.driveGrip*surfaceGrip*torqueCurve;
 if(throttle>0)long+=driveAccel*throttle*dt;
 if(brake>0){
  const dec=(WHEEL_PHYS.brakeForce/WHEEL_PHYS.mass)*surfaceGrip*brake*dt;
  if(Math.abs(long)<=dec)long=0;else long-=Math.sign(long)*dec;
 }
 // Rolling friction, drivetrain drag and aero resistance remain even when the throttle is released.
 const rolling=WHEEL_PHYS.rollingFriction*(.85+1/surfaceGrip);
 const coast=throttle>.02?0:WHEEL_PHYS.coastFriction;
 const aero=.0048*absLong*absLong;
 const resist=(rolling+coast+aero)*dt;
 if(Math.abs(long)<=resist)long=0;else long-=Math.sign(long)*resist;
 if(controls.nitro&&long>=0)long+=7.2*dt;
 long=clamp(long,-18,62);`;
must(s.includes(old),'v15.5.4 longitudinal block missing');
s=s.replace(old,neu);

const hook="window.__polygonRush={version:'15.5.5',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testDriveFriction:()=>{const idx=160,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(v)=>({pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*v,0,Math.cos(h)*v),heading:h,speed:v,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const drive=mk(0);for(let i=0;i<120;i++)applyArcadeMovement(drive,{throttle:1,brake:0,steer:0,handbrake:0,nitro:false},1/60);const driven=Math.abs(localVelocity(drive).long);const coast=mk(24);for(let i=0;i<120;i++)applyArcadeMovement(coast,{throttle:0,brake:0,steer:0,handbrake:0,nitro:false},1/60);const coastEnd=Math.abs(localVelocity(coast).long);const brake=mk(24);for(let i=0;i<60;i++)applyArcadeMovement(brake,{throttle:0,brake:1,steer:0,handbrake:0,nitro:false},1/60);const brakeEnd=Math.abs(localVelocity(brake).long);return {driven,coastStart:24,coastEnd,brakeEnd}},`);

for(const r of ['Polygon Rush v15.5.5 Drive + Friction Fix','driveGrip:1.16','coastFriction:.92','rollingFriction:.58','const torqueCurve=','testDriveFriction:()=>'])must(s.includes(r),'v15.5.5 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.5 drive + friction fix applied');
