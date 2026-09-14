import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

must(s.includes('counterSteerYawBrake:13.5, counterSteerLatAlign:7.8, counterSteerMinSpeed:10.0, counterSteerSlipGate:.055,'),'race controller config anchor missing');
s=s.replace(
 'counterSteerYawBrake:13.5, counterSteerLatAlign:7.8, counterSteerMinSpeed:10.0, counterSteerSlipGate:.055,',
 'counterSteerYawBrake:14.5, counterSteerLatAlign:8.8, counterSteerMinSpeed:9.0, counterSteerSlipGate:.045, raceEntryYawRate:12.5, raceCornerYawRate:9.2, raceStraightAlign:5.6, raceCornerAlign:2.1, raceRecoveryAlign:10.5, raceSlipLimit:.24, raceYawErrorGate:.22,'
);

const oldBlock=` const counterSteering=Math.abs(rawSteer)>.08&&speedAbs>WHEEL_PHYS.counterSteerMinSpeed&&Math.sign(rawSteer)!==Math.sign(car.yawRate)&&Math.abs(car.yawRate)>.035;
 if(Math.abs(rawSteer)>.015&&!handbrake){
  const yawFollow=clamp(1-bodySlip/WHEEL_PHYS.yawFollowSlip,.18,1);
  const yawRate=counterSteering?WHEEL_PHYS.counterSteerYawBrake:WHEEL_PHYS.cornerYawResponse;
  car.yawRate+=(desiredYawRate-car.yawRate)*(1-Math.exp(-yawRate*dt))*yawFollow;
 }
 if(counterSteering&&bodySlip>WHEEL_PHYS.counterSteerSlipGate&&!handbrake){
  const rx=Math.cos(car.heading),rz=-Math.sin(car.heading);
  const lateral=car.vel.x*rx+car.vel.z*rz;
  const align=1-Math.exp(-WHEEL_PHYS.counterSteerLatAlign*dt*clamp(speedAbs/22,.55,1.35));
  car.vel.x-=rx*lateral*align;
  car.vel.z-=rz*lateral*align;
 }
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 const steerReleaseExtra=Math.abs(rawSteer)<.04?WHEEL_PHYS.steeringYawRelease:0;
 const counterYawDamp=counterSteering?2.8:0;
 car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+brakeYawExtra+steerReleaseExtra+counterYawDamp)*dt);`;
must(s.includes(oldBlock),'race controller yaw block missing');
s=s.replace(oldBlock,` const counterSteering=Math.abs(rawSteer)>.08&&speedAbs>WHEEL_PHYS.counterSteerMinSpeed&&Math.sign(rawSteer)!==Math.sign(car.yawRate)&&Math.abs(car.yawRate)>.035;
 const yawError=Math.abs(desiredYawRate-car.yawRate);
 let raceState='STRAIGHT';
 if(handbrake)raceState='DRIFT';
 else if(counterSteering||bodySlip>WHEEL_PHYS.raceSlipLimit)raceState='RECOVERY';
 else if(Math.abs(rawSteer)<.055)raceState='STRAIGHT';
 else if(yawError>WHEEL_PHYS.raceYawErrorGate)raceState='ENTRY';
 else raceState='CORNER';
 car._raceState=raceState;
 const rx=Math.cos(car.heading),rz=-Math.sin(car.heading);
 const lateral=car.vel.x*rx+car.vel.z*rz;
 if(raceState==='STRAIGHT'){
  car.yawRate*=Math.exp(-(WHEEL_PHYS.yawDampBase+speedAbs*WHEEL_PHYS.yawDampSpeed+2.6)*dt);
  const a=1-Math.exp(-WHEEL_PHYS.raceStraightAlign*dt);
  car.vel.x-=rx*lateral*a;car.vel.z-=rz*lateral*a;
 }else if(raceState==='ENTRY'){
  const follow=1-Math.exp(-WHEEL_PHYS.raceEntryYawRate*dt);
  car.yawRate+=(desiredYawRate-car.yawRate)*follow;
  const a=1-Math.exp(-WHEEL_PHYS.raceCornerAlign*dt);
  car.vel.x-=rx*lateral*a;car.vel.z-=rz*lateral*a;
 }else if(raceState==='CORNER'){
  const follow=1-Math.exp(-WHEEL_PHYS.raceCornerYawRate*dt);
  car.yawRate+=(desiredYawRate-car.yawRate)*follow;
  const a=1-Math.exp(-WHEEL_PHYS.raceCornerAlign*dt*.55);
  car.vel.x-=rx*lateral*a;car.vel.z-=rz*lateral*a;
 }else if(raceState==='RECOVERY'){
  const follow=1-Math.exp(-WHEEL_PHYS.counterSteerYawBrake*dt);
  car.yawRate+=(desiredYawRate-car.yawRate)*follow;
  car.yawRate*=Math.exp(-3.4*dt);
  const a=1-Math.exp(-WHEEL_PHYS.raceRecoveryAlign*dt*clamp(speedAbs/20,.65,1.45));
  car.vel.x-=rx*lateral*a;car.vel.z-=rz*lateral*a;
 }
 const brakeYawExtra=(brake>.001&&!handbrake)?WHEEL_PHYS.brakeYawDamp*brake*clamp(bodySlip/.18,.35,1.4):0;
 if(raceState!=='DRIFT'&&brakeYawExtra>0)car.yawRate*=Math.exp(-brakeYawExtra*dt);`);

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testRaceStability:()=>{const i=236,p=trackSamples[i].clone(),h=trackHeading(i),mk=(v=30)=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*v,0,Math.cos(h)*v),heading:h,speed:v,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});const c=mk();let maxSlip=0;for(let k=0;k<50;k++){applyArcadeMovement(c,{throttle:.72,brake:0,steer:.62,handbrake:0,nitro:false},1/60);maxSlip=Math.max(maxSlip,c.slip||0)}const cornerState=c._raceState;for(let k=0;k<22;k++)applyArcadeMovement(c,{throttle:.72,brake:0,steer:-.62,handbrake:0,nitro:false},1/60);const recoveryState=c._raceState;for(let k=0;k<45;k++)applyArcadeMovement(c,{throttle:.72,brake:0,steer:0,handbrake:0,nitro:false},1/60);return {speed:Math.hypot(c.vel.x,c.vel.z),slip:c.slip||0,maxSlip,cornerState,recoveryState,finalState:c._raceState,yaw:Math.abs(c.yawRate||0)}} ,`);

for(const r of ['raceEntryYawRate:12.5','raceCornerYawRate:9.2','raceStraightAlign:5.6','raceRecoveryAlign:10.5',"raceState='STRAIGHT'","raceState='ENTRY'","raceState='CORNER'","raceState='RECOVERY'",'testRaceStability:()=>'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush race-purpose stability controller applied');
