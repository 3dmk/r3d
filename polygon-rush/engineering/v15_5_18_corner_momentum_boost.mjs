import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v15.5.17 Corner Drive + Steering Response','Polygon Rush v15.5.18 Corner Momentum Boost');
s=s.replaceAll('v15.5.17 • CORNER DRIVE + STEERING RESPONSE','v15.5.18 • CORNER MOMENTUM BOOST');
s=s.replaceAll("version:'15.5.17'","version:'15.5.18'");

must(s.includes('cornerCombinedGrip:1.28, drivenLongPriority:.90, steeringDriveAssist:.38, steeringYawRelease:2.4,'),'v15.5.18 grip anchor missing');
s=s.replace(
 'cornerCombinedGrip:1.28, drivenLongPriority:.90, steeringDriveAssist:.38, steeringYawRelease:2.4,',
 'cornerCombinedGrip:1.34, drivenLongPriority:.95, steeringDriveAssist:.24, steeringYawRelease:2.4, cornerMomentumAssist:.16,'
);

must(s.includes(' const throttleRate=throttle>car._driveThrottle?11.5:14.0;'),'v15.5.18 throttle response anchor missing');
s=s.replace(
 ' const throttleRate=throttle>car._driveThrottle?11.5:14.0;',
 ' const throttleRate=throttle>car._driveThrottle?13.2:15.0;'
);

must(s.includes('  const inputReserve=clamp(1-brake*.18-car._driveThrottle*WHEEL_PHYS.steeringDriveAssist,.56,1);'),'v15.5.18 input reserve anchor missing');
s=s.replace(
 '  const inputReserve=clamp(1-brake*.18-car._driveThrottle*WHEEL_PHYS.steeringDriveAssist,.56,1);',
 '  const inputReserve=clamp(1-brake*.18-car._driveThrottle*WHEEL_PHYS.steeringDriveAssist,.68,1);'
);

const reserveAnchor=`   const reservedLong=Math.min(Math.abs(requestedLong),maxForce*WHEEL_PHYS.drivenLongPriority);\n   if(Math.abs(longForce)<reservedLong)longForce=Math.sign(requestedLong||1)*reservedLong;`;
must(s.includes(reserveAnchor),'v15.5.18 longitudinal reserve anchor missing');
s=s.replace(reserveAnchor,`   const steerMomentum=clamp(Math.abs(rawSteer)*car._driveThrottle,0,1);
   const reservedLong=Math.min(Math.abs(requestedLong),maxForce*clamp(WHEEL_PHYS.drivenLongPriority+steerMomentum*WHEEL_PHYS.cornerMomentumAssist,0,1));
   if(Math.abs(longForce)<reservedLong)longForce=Math.sign(requestedLong||1)*reservedLong;`);

const hook="window.__polygonRush={version:'15.5.18',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'v15.5.18 diagnostic hook missing');

for(const r of ['Polygon Rush v15.5.18 Corner Momentum Boost','cornerCombinedGrip:1.34','drivenLongPriority:.95','steeringDriveAssist:.24','cornerMomentumAssist:.16','throttleRate=throttle>car._driveThrottle?13.2:15.0','steerMomentum=clamp(Math.abs(rawSteer)*car._driveThrottle'])must(s.includes(r),'v15.5.18 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.18 corner momentum boost applied');
