import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.6 Weighted Drive + Steering Fix','Polygon Rush v15.5.7 Corner Inertia + Alignment Fix');
s=s.replaceAll('v15.5.6 • WEIGHTED DRIVE + STEERING FIX','v15.5.7 • CORNER INERTIA + ALIGNMENT FIX');
s=s.replaceAll("version:'15.5.6'","version:'15.5.7'");

s=s.replace('throttleRise:3.4, throttleFall:5.8, accelWeight:.58, steerCurve:1.72, steerCenter:5.4,',
            'throttleRise:3.4, throttleFall:5.8, accelWeight:.58, steerCurve:1.72, steerCenter:5.4, cornerInertia:1.72, tireAlign:7.4, alignRelease:9.2,');

const old=` // Tire side force: normal driving strongly removes lateral velocity; handbrake intentionally releases rear grip.
 const lateralRate=(handbrake?1.45:11.5)*clamp(grip,.42,1.35);
 lat*=Math.exp(-lateralRate*dt);
 if(!handbrake&&Math.abs(lat)<.015)lat=0;`;
const neu=` // Corner inertia lets momentum push the chassis outward in a turn, then tire grip realigns it.
 const steerLoad=clamp(Math.abs(car._steerAngle)/Math.max(.001,WHEEL_PHYS.steerMax),0,1);
 const cornerAccel=-long*car.yawRate*WHEEL_PHYS.cornerInertia*steerLoad;
 lat+=cornerAccel*dt;
 const releasing=Math.abs(controls.steer||0)<.035;
 const lateralRate=(handbrake?1.35:(releasing?WHEEL_PHYS.alignRelease:WHEEL_PHYS.tireAlign))*clamp(grip,.42,1.35);
 lat*=Math.exp(-lateralRate*dt);
 if(!handbrake&&releasing&&Math.abs(lat)<.012)lat=0;`;
must(s.includes(old),'v15.5.6 lateral block missing');
s=s.replace(old,neu);

const hook="window.__polygonRush={version:'15.5.7',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testCornerInertia:()=>{const idx=220,p=trackSamples[idx].clone(),h=trackHeading(idx),d={pos:p.clone(),vel:new THREE.Vector3(Math.sin(h)*26,0,Math.cos(h)*26),heading:h,speed:26,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};let peakLat=0,turnSlip=0;for(let i=0;i<72;i++){applyArcadeMovement(d,{throttle:.35,brake:0,steer:.72,handbrake:0,nitro:false},1/60);const lv=localVelocity(d);peakLat=Math.max(peakLat,Math.abs(lv.lat));turnSlip=Math.max(turnSlip,d.slip||0)}const beforeRelease=Math.abs(localVelocity(d).lat);for(let i=0;i<72;i++)applyArcadeMovement(d,{throttle:.25,brake:0,steer:0,handbrake:0,nitro:false},1/60);const afterRelease=Math.abs(localVelocity(d).lat);return {peakLat,turnSlip,beforeRelease,afterRelease,yawRate:Math.abs(d.yawRate),speed:Math.abs(localVelocity(d).long)}},`);

for(const r of ['Polygon Rush v15.5.7 Corner Inertia + Alignment Fix','cornerInertia:1.72','tireAlign:7.4','alignRelease:9.2','const cornerAccel=-long*car.yawRate','testCornerInertia:()=>'])must(s.includes(r),'v15.5.7 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.7 corner inertia + alignment fix applied');
