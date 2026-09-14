import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.5 Drive + Friction Fix','Polygon Rush v15.5.6 Weighted Drive + Steering Fix');
s=s.replaceAll('v15.5.5 • DRIVE + FRICTION FIX','v15.5.6 • WEIGHTED DRIVE + STEERING FIX');
s=s.replaceAll("version:'15.5.5'","version:'15.5.6'");

s=s.replace('driveGrip:1.16, coastFriction:.92, rollingFriction:.58,',
            'driveGrip:1.16, coastFriction:.92, rollingFriction:.58, throttleRise:3.4, throttleFall:5.8, accelWeight:.58, steerCurve:1.72, steerCenter:5.4,');

const oldSteer=` const lv0=localVelocity(car),speedAbs=Math.abs(lv0.long);
 const speedSteer=clamp(1.08-speedAbs/82,.42,1);
 const steerTarget=(controls.steer||0)*WHEEL_PHYS.steerMax*speedSteer;
 car._steerAngle+=(steerTarget-car._steerAngle)*Math.min(1,dt*(WHEEL_PHYS.steerResponse+2.2));`;
const newSteer=` const lv0=localVelocity(car),speedAbs=Math.abs(lv0.long);
 const rawSteer=clamp(controls.steer||0,-1,1);
 const curvedSteer=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),WHEEL_PHYS.steerCurve);
 const speedSteer=clamp(1.08-speedAbs/82,.42,1);
 const steerTarget=curvedSteer*WHEEL_PHYS.steerMax*speedSteer;
 const steerRate=Math.abs(rawSteer)>.02?(WHEEL_PHYS.steerResponse+1.4):WHEEL_PHYS.steerCenter;
 car._steerAngle+=(steerTarget-car._steerAngle)*(1-Math.exp(-steerRate*dt));`;
must(s.includes(oldSteer),'v15.5.5 steering block missing');
s=s.replace(oldSteer,newSteer);

const oldDrive=` const throttle=controls.throttle||0,brake=controls.brake||0,handbrake=controls.handbrake||0;
 const absLong=Math.abs(long),surfaceGrip=clamp(grip,.38,1.3);
 // Driven-wheel traction gives the car a positive push against the road instead of free-sliding acceleration.
 const torqueCurve=clamp(1.16-absLong/92,.46,1.12);
 const baseDrive=(long<-.5?WHEEL_PHYS.reverseForce:WHEEL_PHYS.driveForce)/WHEEL_PHYS.mass;
 const driveAccel=baseDrive*WHEEL_PHYS.driveGrip*surfaceGrip*torqueCurve;
 if(throttle>0)long+=driveAccel*throttle*dt;`;
const newDrive=` const throttle=controls.throttle||0,brake=controls.brake||0,handbrake=controls.handbrake||0;
 car._driveThrottle??=0;car._longAccel??=0;
 const targetThrottle=clamp(throttle,0,1),throttleRate=targetThrottle>car._driveThrottle?WHEEL_PHYS.throttleRise:WHEEL_PHYS.throttleFall;
 car._driveThrottle+=(targetThrottle-car._driveThrottle)*(1-Math.exp(-throttleRate*dt));
 const absLong=Math.abs(long),surfaceGrip=clamp(grip,.38,1.3);
 const torqueCurve=clamp(1.16-absLong/92,.46,1.12);
 const baseDrive=(long<-.5?WHEEL_PHYS.reverseForce:WHEEL_PHYS.driveForce)/WHEEL_PHYS.mass;
 const loadGrip=clamp(1+Math.max(0,car._longAccel)*WHEEL_PHYS.accelWeight*.055,.92,1.18);
 const driveAccel=baseDrive*WHEEL_PHYS.driveGrip*surfaceGrip*torqueCurve*loadGrip;
 const beforeLong=long;
 if(car._driveThrottle>.001)long+=driveAccel*car._driveThrottle*dt;
 car._longAccel+=( ((long-beforeLong)/Math.max(dt,.001))-car._longAccel)*(1-Math.exp(-5.2*dt));`;
must(s.includes(oldDrive),'v15.5.5 drive block missing');
s=s.replace(oldDrive,newDrive);

const oldYaw=` const steer=car._steerAngle;
 const understeer=1/(1+speedAbs*speedAbs*.00024);
 const targetYaw=Math.abs(long)>.35?(long/WHEEL_PHYS.wheelBase)*Math.tan(steer)*understeer:0;
 const yawResponse=(handbrake?3.0:9.5)*clamp(grip,.45,1.25);`;
const newYaw=` const steer=car._steerAngle;
 const speedLoad=clamp(speedAbs/28,0,1);
 const understeer=1/(1+speedAbs*speedAbs*.00034);
 const steerBuild=.72+.28*speedLoad;
 const targetYaw=Math.abs(long)>.35?(long/WHEEL_PHYS.wheelBase)*Math.tan(steer)*understeer*steerBuild:0;
 const yawResponse=(handbrake?3.0:(6.8+2.1*speedLoad))*clamp(grip,.45,1.25);`;
must(s.includes(oldYaw),'v15.5.5 yaw block missing');
s=s.replace(oldYaw,newYaw);

const hook="window.__polygonRush={version:'15.5.6',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testWeightedDrive:()=>{const idx=180,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=()=>({pos:p.clone(),vel:new THREE.Vector3(),heading:h,speed:0,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const d=mk(),samples=[];for(let i=0;i<120;i++){applyArcadeMovement(d,{throttle:1,brake:0,steer:0,handbrake:0,nitro:false},1/60);if(i===5||i===30||i===90)samples.push(Math.abs(localVelocity(d).long))}return {s6:samples[0],s31:samples[1],s91:samples[2],throttle:d._driveThrottle,accel:d._longAccel}},testSteerCurve:()=>{const idx=200,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=()=>({pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*22,0,Math.cos(h)*22),heading:h,speed:22,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const small=mk(),full=mk();for(let i=0;i<60;i++){applyArcadeMovement(small,{throttle:.35,brake:0,steer:.25,handbrake:0,nitro:false},1/60);applyArcadeMovement(full,{throttle:.35,brake:0,steer:1,handbrake:0,nitro:false},1/60)}return {small:Math.abs(wrapAngle(small.heading-h)),full:Math.abs(wrapAngle(full.heading-h)),smallAngle:Math.abs(small._steerAngle),fullAngle:Math.abs(full._steerAngle)}} ,`);

for(const r of ['Polygon Rush v15.5.6 Weighted Drive + Steering Fix','throttleRise:3.4','accelWeight:.58','steerCurve:1.72','testWeightedDrive:()=>','testSteerCurve:()=>'])must(s.includes(r),'v15.5.6 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.6 weighted drive + steering fix applied');
