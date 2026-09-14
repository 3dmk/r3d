import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const rep=(a,b)=>{must(s.includes(a),'missing '+a.slice(0,90));s=s.replace(a,b)};

rep('Polygon Rush v15.5.32 Real Surface Collisions','Polygon Rush v15.5.33 Acceleration Response');
rep('v15.5.32 • REAL RAMP + SLOPE COLLISIONS','v15.5.33 • ACCELERATION RESPONSE');
s=s.replaceAll("version:'15.5.32'","version:'15.5.33'");

// Stronger drivetrain response. Keep top-speed behavior controlled by aero/torque falloff.
rep('cornerStiffness:13200, rollingResistance:34, aeroDrag:.38,','cornerStiffness:13200, rollingResistance:28, aeroDrag:.34,');
rep('wheelInertia:6.5, driveWheelTorque:2700, brakeWheelTorque:2600, longSlipStiffness:6.0, absSlip:.12, tcSlip:.24,',
    'wheelInertia:5.4, driveWheelTorque:4200, brakeWheelTorque:2600, longSlipStiffness:6.6, absSlip:.12, tcSlip:.30,');
rep('tireMu:1.34, tireCorner:14500, tireLong:11800, drivetrain:1.14,',
    'tireMu:1.38, tireCorner:14500, tireLong:13200, drivetrain:1.22,');

rep('const throttleRate=Math.abs(driveInput)>Math.abs(car._driveThrottle)?15.5:7.0;',
    'const throttleRate=Math.abs(driveInput)>Math.abs(car._driveThrottle)?28.0:9.5;');
rep('const torqueCurve=clamp(1.20-Math.abs(vLong)/94,.46,1.12);',
    'const launchBoost=1+.34*(1-clamp(Math.abs(vLong)/18,0,1));\n   const midPull=1+.18*(1-Math.abs(clamp((Math.abs(vLong)-24)/34,-1,1)));\n   const torqueCurve=clamp(1.42-Math.abs(vLong)/112,.56,1.34)*launchBoost*midPull;');

// Avoid power-on corner drag consuming the acceleration gain.
rep('const steerLoad=clamp(Math.abs(rawSteer),0,1),powerKeep=clamp(1-steerLoad*car._driveThrottle*.38,.72,1);',
    'const steerLoad=clamp(Math.abs(rawSteer),0,1),powerKeep=clamp(1-steerLoad*Math.max(0,car._driveThrottle)*.20,.86,1);');

// Add deterministic acceleration diagnostic without adding free acceleration to runtime.
const hook='testRealSurfaceCollisions:()=>';
must(s.includes(hook),'diagnostic hook missing');
const insert=`testAccelerationResponse:()=>{\n const idx=236,p=trackSamples[idx].clone(),h=trackHeading(idx),mk=()=>({mass:1180,pos:p.clone(),vel:new THREE.Vector3(),heading:h,speed:0,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}});\n const a=mk();for(let i=0;i<60;i++)applyArcadeMovement(a,{throttle:1,reverse:0,brake:0,steer:0,handbrake:0,nitro:false},1/60);const v1=Math.abs(localVelocity(a).long);for(let i=0;i<60;i++)applyArcadeMovement(a,{throttle:1,reverse:0,brake:0,steer:0,handbrake:0,nitro:false},1/60);const v2=Math.abs(localVelocity(a).long);\n const c=mk();c.vel.set(Math.sin(h)*16,0,Math.cos(h)*16);const start=Math.abs(localVelocity(c).long);for(let i=0;i<60;i++)applyArcadeMovement(c,{throttle:.9,reverse:0,brake:0,steer:.62,handbrake:0,nitro:false},1/60);const end=Math.abs(localVelocity(c).long);return {v1,v2,cornerStart:start,cornerEnd:end,heading:Math.abs(wrapAngle(c.heading-h))};\n},`;
s=s.replace(hook,insert+hook,1);

s+='\n<!-- v15.5.33 acceleration-response launch-torque mid-pull reduced-power-drag -->\n';
for(const x of ['v15.5.33','driveWheelTorque:4200','throttleRate=Math.abs(driveInput)>Math.abs(car._driveThrottle)?28.0:9.5','testAccelerationResponse'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.33 acceleration response applied');
