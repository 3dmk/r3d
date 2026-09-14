import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

const cfg='driveMomentumSlipGate:.34,';
must(s.includes(cfg),'differential config anchor missing');
s=s.replace(cfg,'driveMomentumSlipGate:.34, diffTurnBias:.22, diffMinInside:.72, diffOutsideMax:1.28,');

const drive=`   driveTorque=car._driveThrottle*WHEEL_PHYS.driveWheelTorque*torqueCurve;`;
must(s.includes(drive),'rear drive torque anchor missing');
s=s.replace(drive,`   // Steering-aware rear differential. Ackermann controls front wheel angles;
   // this controls rear wheel speed/torque freedom so the axle does not resist the turn.
   const diffTurn=clamp(Math.abs(rack)/Math.max(.001,WHEEL_PHYS.steerMax),0,1);
   const turningLeft=rack>0;
   const outsideWheel=diffTurn>.001?(turningLeft?!left:left):false;
   const diffBias=WHEEL_PHYS.diffTurnBias*diffTurn;
   const diffTorqueScale=diffTurn>.001
     ? (outsideWheel?Math.min(WHEEL_PHYS.diffOutsideMax,1+diffBias):Math.max(WHEEL_PHYS.diffMinInside,1-diffBias))
     : 1;
   driveTorque=car._driveThrottle*WHEEL_PHYS.driveWheelTorque*torqueCurve*diffTorqueScale;`);

const push=`wheelStates.push({vLong,vLat,slipAngle,slipRatio,longForce,latForce,normalForce:normal,gripLimit:maxForce,steer:wheelSteer,spin:omega,compression:comp,surface:sample.type,rx,rz,driveTorque,brakeTorque});`;
must(s.includes(push),'wheel telemetry anchor missing');
s=s.replace(push,`wheelStates.push({vLong,vLat,slipAngle,slipRatio,longForce,latForce,normalForce:normal,gripLimit:maxForce,steer:wheelSteer,spin:omega,compression:comp,surface:sample.type,rx,rz,driveTorque,brakeTorque,diffScale:(!front&&car._driveThrottle>.001)?diffTorqueScale:1});`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'differential diagnostic hook missing');
s=s.replace(hook,hook+`testTurningDifferential:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),c={mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*18,0,Math.cos(h)*18),heading:h,speed:18,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};for(let k=0;k<30;k++)applyArcadeMovement(c,{throttle:.75,brake:0,steer:.72,handbrake:0,nitro:false},1/60);const w=c._wheelPhysics||[],lr=w[0]||{},rr=w[2]||{};return {leftRearTorque:lr.driveTorque||0,rightRearTorque:rr.driveTorque||0,leftScale:lr.diffScale||1,rightScale:rr.diffScale||1,leftOmega:lr.spin||0,rightOmega:rr.spin||0,steer:c._steerAngle||0,differential:(rr.diffScale||1)>(lr.diffScale||1)}},`);

for(const r of ['diffTurnBias:.22','diffMinInside:.72','diffOutsideMax:1.28','diffTorqueScale','testTurningDifferential:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush steering-aware rear differential applied');
