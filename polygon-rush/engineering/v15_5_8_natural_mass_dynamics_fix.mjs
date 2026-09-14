import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.7 Corner Inertia + Alignment Fix','Polygon Rush v15.5.8 Natural Mass Dynamics');
s=s.replaceAll('v15.5.7 • CORNER INERTIA + ALIGNMENT FIX','v15.5.8 • NATURAL MASS DYNAMICS');
s=s.replaceAll("version:'15.5.7'","version:'15.5.8'");

s=s.replace('throttleRise:3.4, throttleFall:5.8, accelWeight:.58, steerCurve:1.72, steerCenter:5.4, cornerInertia:.72, tireAlign:8.6, alignRelease:9.8,',
            'throttleRise:3.4, throttleFall:5.8, accelWeight:.58, steerCurve:1.72, steerCenter:5.4, cornerInertia:.72, tireAlign:8.6, alignRelease:9.8, massRef:1180, loadTransfer:.18, steerInertia:.76, velocityAlign:6.4, highSpeedGrip:.58,');

const oldSteer=` const lv0=localVelocity(car),speedAbs=Math.abs(lv0.long);
 const rawSteer=clamp(controls.steer||0,-1,1);
 const curvedSteer=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),WHEEL_PHYS.steerCurve);
 const speedSteer=clamp(1.08-speedAbs/82,.42,1);
 const steerTarget=curvedSteer*WHEEL_PHYS.steerMax*speedSteer;
 const steerRate=Math.abs(rawSteer)>.02?(WHEEL_PHYS.steerResponse+1.4):WHEEL_PHYS.steerCenter;
 car._steerAngle+=(steerTarget-car._steerAngle)*(1-Math.exp(-steerRate*dt));`;
const newSteer=` const lv0=localVelocity(car),speedAbs=Math.abs(lv0.long);
 const effectiveMass=clamp(car.mass||WHEEL_PHYS.mass,760,2200),massRatio=effectiveMass/WHEEL_PHYS.mass;
 const massResponse=clamp(1/Math.sqrt(massRatio),.72,1.18);
 const rawSteer=clamp(controls.steer||0,-1,1);
 const curvedSteer=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),WHEEL_PHYS.steerCurve);
 const speedSteer=clamp(1.04-(speedAbs*speedAbs)/2200,.28,1);
 const steerTarget=curvedSteer*WHEEL_PHYS.steerMax*speedSteer;
 const steerRate=(Math.abs(rawSteer)>.02?(WHEEL_PHYS.steerResponse+1.0):WHEEL_PHYS.steerCenter)*massResponse*WHEEL_PHYS.steerInertia;
 car._steerAngle+=(steerTarget-car._steerAngle)*(1-Math.exp(-steerRate*dt));`;
must(s.includes(oldSteer),'v15.5.7 steering block missing');
s=s.replace(oldSteer,newSteer);

const oldDrive=` const throttle=controls.throttle||0,brake=controls.brake||0,handbrake=controls.handbrake||0;
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
const newDrive=` const throttle=controls.throttle||0,brake=controls.brake||0,handbrake=controls.handbrake||0;
 car._driveThrottle??=0;car._longAccel??=0;
 const targetThrottle=clamp(throttle,0,1),throttleRate=(targetThrottle>car._driveThrottle?WHEEL_PHYS.throttleRise:WHEEL_PHYS.throttleFall)*massResponse;
 car._driveThrottle+=(targetThrottle-car._driveThrottle)*(1-Math.exp(-throttleRate*dt));
 const absLong=Math.abs(long),surfaceGrip=clamp(grip,.38,1.3);
 const torqueCurve=clamp(1.18-absLong/88,.42,1.12);
 const baseDrive=(long<-.5?WHEEL_PHYS.reverseForce:WHEEL_PHYS.driveForce)/effectiveMass;
 const accelLoad=clamp(1-Math.max(0,car._longAccel)*WHEEL_PHYS.loadTransfer*.018,.84,1.04);
 const driveAccel=baseDrive*WHEEL_PHYS.driveGrip*surfaceGrip*torqueCurve*accelLoad;
 const beforeLong=long;
 if(car._driveThrottle>.001)long+=driveAccel*car._driveThrottle*dt;
 car._longAccel+=( ((long-beforeLong)/Math.max(dt,.001))-car._longAccel)*(1-Math.exp(-4.4*massResponse*dt));`;
must(s.includes(oldDrive),'v15.5.7 drive block missing');
s=s.replace(oldDrive,newDrive);

const oldYaw=` const steer=car._steerAngle;
 const speedLoad=clamp(speedAbs/28,0,1);
 const understeer=1/(1+speedAbs*speedAbs*.00034);
 const steerBuild=.72+.28*speedLoad;
 const targetYaw=Math.abs(long)>.35?(long/WHEEL_PHYS.wheelBase)*Math.tan(steer)*understeer*steerBuild:0;
 const yawResponse=(handbrake?3.0:(6.8+2.1*speedLoad))*clamp(grip,.45,1.25);`;
const newYaw=` const steer=car._steerAngle;
 const speedLoad=clamp(speedAbs/30,0,1);
 const understeer=1/(1+speedAbs*speedAbs*(.00030+.00011*massRatio));
 const steerBuild=.68+.32*speedLoad;
 const targetYaw=Math.abs(long)>.35?(long/WHEEL_PHYS.wheelBase)*Math.tan(steer)*understeer*steerBuild:0;
 const yawResponse=(handbrake?2.7:(6.2+2.0*speedLoad))*clamp(grip,.45,1.25)*massResponse;`;
must(s.includes(oldYaw),'v15.5.7 yaw block missing');
s=s.replace(oldYaw,newYaw);

const oldLat=` // Corner inertia lets momentum push the chassis outward in a turn, then tire grip realigns it.
 const steerLoad=clamp(Math.abs(car._steerAngle)/Math.max(.001,WHEEL_PHYS.steerMax),0,1);
 const cornerAccel=-long*car.yawRate*WHEEL_PHYS.cornerInertia*steerLoad;
 lat+=cornerAccel*dt;
 const releasing=Math.abs(controls.steer||0)<.035;
 const lateralRate=(handbrake?1.35:(releasing?WHEEL_PHYS.alignRelease:WHEEL_PHYS.tireAlign))*clamp(grip,.42,1.35);
 lat*=Math.exp(-lateralRate*dt);
 if(!handbrake&&releasing&&Math.abs(lat)<.012)lat=0;`;
const newLat=` // Mass, speed and tire loading determine outward corner drift and how quickly tires recover it.
 const steerLoad=clamp(Math.abs(car._steerAngle)/Math.max(.001,WHEEL_PHYS.steerMax),0,1);
 const speedLoadSq=clamp((speedAbs*speedAbs)/(34*34),0,2.2);
 const cornerAccel=-long*car.yawRate*WHEEL_PHYS.cornerInertia*steerLoad*(.72+.28*massRatio);
 lat+=cornerAccel*dt;
 const releasing=Math.abs(controls.steer||0)<.035;
 const loadLoss=clamp(1-Math.abs(cornerAccel)*WHEEL_PHYS.loadTransfer*.008,.72,1);
 const speedGrip=clamp(1-speedLoadSq*WHEEL_PHYS.highSpeedGrip*.22,.58,1);
 const alignBase=releasing?WHEEL_PHYS.alignRelease:WHEEL_PHYS.tireAlign;
 const lateralRate=(handbrake?1.28:alignBase*massResponse*loadLoss*speedGrip)*clamp(grip,.42,1.35);
 lat*=Math.exp(-lateralRate*dt);
 const velocityAlign=handbrake?0:WHEEL_PHYS.velocityAlign*massResponse*clamp(grip,.45,1.25)*(.68+.32*(1-speedLoadSq*.25));
 lat*=Math.exp(-Math.max(0,velocityAlign)*dt);
 if(!handbrake&&releasing&&Math.abs(lat)<.012)lat=0;`;
must(s.includes(oldLat),'v15.5.7 lateral block missing');
s=s.replace(oldLat,newLat);

const hook="window.__polygonRush={version:'15.5.8',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testNaturalDynamics:()=>{const idx=230,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=(mass,v=0)=>({mass,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*v,0,Math.cos(h)*v),heading:h,speed:v,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const light=mk(950,0),heavy=mk(1650,0);for(let i=0;i<90;i++){applyArcadeMovement(light,{throttle:1,brake:0,steer:0,handbrake:0,nitro:false},1/60);applyArcadeMovement(heavy,{throttle:1,brake:0,steer:0,handbrake:0,nitro:false},1/60)}const lightAccel=Math.abs(localVelocity(light).long),heavyAccel=Math.abs(localVelocity(heavy).long);const low=mk(1180,10),high=mk(1180,34);for(let i=0;i<75;i++){applyArcadeMovement(low,{throttle:.25,brake:0,steer:.7,handbrake:0,nitro:false},1/60);applyArcadeMovement(high,{throttle:.25,brake:0,steer:.7,handbrake:0,nitro:false},1/60)}const lowTurn=Math.abs(wrapAngle(low.heading-h)),highTurn=Math.abs(wrapAngle(high.heading-h)),highLat=Math.abs(localVelocity(high).lat),highSlip=high.slip||0;const releaseBefore=highLat;for(let i=0;i<90;i++)applyArcadeMovement(high,{throttle:.15,brake:0,steer:0,handbrake:0,nitro:false},1/60);const releaseAfter=Math.abs(localVelocity(high).lat);return {lightAccel,heavyAccel,lowTurn,highTurn,highLat,highSlip,releaseBefore,releaseAfter}},`);

for(const r of ['Polygon Rush v15.5.8 Natural Mass Dynamics','massRef:1180','loadTransfer:.18','steerInertia:.76','velocityAlign:6.4','highSpeedGrip:.58','testNaturalDynamics:()=>'])must(s.includes(r),'v15.5.8 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.8 natural mass dynamics applied');
