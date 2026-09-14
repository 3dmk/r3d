import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.13 Grip Cornering Dynamics','Polygon Rush v15.5.14 Steering Acceleration Balance');
s=s.replaceAll('v15.5.13 • GRIP CORNERING DYNAMICS','v15.5.14 • STEERING ACCELERATION BALANCE');
s=s.replaceAll("version:'15.5.13'","version:'15.5.14'");

s=s.replace(
 'gripSlipStart:.10, gripSlipFull:.24, gripAssistG:.72, rearStability:1.18,',
 'gripSlipStart:.10, gripSlipFull:.24, gripAssistG:.72, rearStability:1.18, cornerCombinedGrip:1.16, drivenLongPriority:.82,'
);

const oldCombined=`  const combined=Math.hypot(longForce,latForce),combinedScale=combined>maxForce?maxForce/combined:1;\n  longForce*=combinedScale;latForce*=combinedScale;`;
const newCombined=`  const combinedLimit=maxForce*(handbrake?1:(front?1.05:WHEEL_PHYS.cornerCombinedGrip));
  if(!front&&driveTorque>0&&!handbrake){
   const signedLong=longForce;
   const keepLong=Math.min(Math.abs(signedLong),maxForce*WHEEL_PHYS.drivenLongPriority);
   const latCap=Math.sqrt(Math.max(0,combinedLimit*combinedLimit-keepLong*keepLong));
   latForce=clamp(latForce,-latCap,latCap);
  }
  const combined=Math.hypot(longForce,latForce),combinedScale=combined>combinedLimit?combinedLimit/combined:1;
  longForce*=combinedScale;latForce*=combinedScale;`;
must(s.includes(oldCombined),'v15.5.14 combined grip anchor missing');
s=s.replace(oldCombined,newCombined);

const hook="window.__polygonRush={version:'15.5.14',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'v15.5.14 diagnostic hook missing');
s=s.replace(hook,hook+`testSteeringAcceleration:()=>{const idx=236,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=()=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*8,0,Math.cos(h)*8),heading:h,speed:8,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const run=(steer)=>{const car=mk();let minDrive=1e9,maxSlip=0;for(let i=0;i<90;i++){applyArcadeMovement(car,{throttle:.82,brake:0,steer,handbrake:0,nitro:false},1/60);for(const w of car._wheelPhysics||[]){if(w.driveTorque>0)minDrive=Math.min(minDrive,Math.abs(w.longForce||0));maxSlip=Math.max(maxSlip,Math.abs(w.slipRatio||0))}}return {speed:Math.hypot(car.vel.x,car.vel.z),long:Math.abs(localVelocity(car).long),slip:car.slip||0,minDrive:minDrive===1e9?0:minDrive,maxSlip,heading:Math.abs(wrapAngle(car.heading-h))}};const straight=run(0),turn=run(.42);return {straightSpeed:straight.speed,turnSpeed:turn.speed,turnLong:turn.long,speedRatio:turn.speed/Math.max(.01,straight.speed),turnSlip:turn.slip,maxDriveSlip:turn.maxSlip,turnHeading:turn.heading,minDriveForce:turn.minDrive}},`);

for(const r of ['Polygon Rush v15.5.14 Steering Acceleration Balance','cornerCombinedGrip:1.16','drivenLongPriority:.82','combinedLimit','testSteeringAcceleration:()=>'])must(s.includes(r),'v15.5.14 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.14 steering acceleration balance applied');
