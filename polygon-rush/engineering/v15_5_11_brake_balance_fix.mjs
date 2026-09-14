import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
must(s.includes('Polygon Rush v15.5.11 Slip Traction + Brake Physics'),'v15.5.11 base missing');
const swaps=[
 ["yawInertiaScale:1.0, steerRackRate:12.0","yawInertiaScale:1.32, steerRackRate:12.0"],
 ["const brakeRearSupport=!front?1+brake*.20:1;\n  const cornerK=WHEEL_PHYS.tireCorner*clamp(loadRatio,.55,1.55)*(front?.97:1.16)*brakeRearSupport;","const brakeRearSupport=!front?1+brake*.24:1;\n  const brakeFrontAuthority=front?clamp(1-brake*.30,.70,1):1;\n  const cornerK=WHEEL_PHYS.tireCorner*clamp(loadRatio,.55,1.55)*(front?.97:1.16)*brakeRearSupport*brakeFrontAuthority;"],
 ["car.yawRate*=Math.exp(-(.86+speedAbs*.007)*dt);","car.yawRate*=Math.exp(-(.86+speedAbs*.007+brake*.38)*dt);"],
 ["brakeHeading:Math.abs(wrapAngle(brakeCar.heading-h)),brakeBodySlip:brakeCar.slip||0,maxBrakeLock","brakeHeading:Math.abs(wrapAngle(brakeCar.heading-h)),brakeBodySlip:brakeCar.slip||0,brakeYaw:Math.abs(brakeCar.yawRate||0),maxBrakeLock"]
];
for(const [a,b] of swaps){must(s.includes(a),'missing brake-balance target: '+a.slice(0,70));s=s.replace(a,b)}
for(const r of ['yawInertiaScale:1.32','brakeFrontAuthority','brake*.38','brakeYaw:'])must(s.includes(r),'brake-balance validation missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.11 brake balance tuning applied');
