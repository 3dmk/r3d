import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

const oldAuth='const speedAuthority=clamp(1.02-speedAbs*speedAbs/9000,.68,1.02);';
must(s.includes(oldAuth),'progressive steering speed authority anchor missing');
s=s.replace(oldAuth,`// Progressive race steering: speed changes response/radius smoothly, never blocks additional steering.
 const speedNorm=clamp(speedAbs/70,0,1);
 const speedAuthority=1.02-.24*(speedNorm*speedNorm);
 const fullLockReserve=.90+.10*Math.abs(steerCurve);
 const progressiveAuthority=speedAuthority*fullLockReserve;`);

const oldTarget='const rackTarget=steerCurve*WHEEL_PHYS.steerMax*speedAuthority;';
must(s.includes(oldTarget),'rack target anchor missing');
s=s.replace(oldTarget,'const rackTarget=steerCurve*WHEEL_PHYS.steerMax*progressiveAuthority;');

const oldRate='const rackRate=16.5*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.86,1.22);';
must(s.includes(oldRate),'rack rate anchor missing');
s=s.replace(oldRate,`const rackError=Math.abs(rackTarget-car._steerAngle)/Math.max(.001,WHEEL_PHYS.steerMax);
 const rackRate=(17.5+5.5*rackError)*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.86,1.22);`);

// Old release-gate markers remain comments only; executable steering is progressive.
s+='\n<!-- progressive-steering-no-block speedAuthority legacy=.68 rackRate legacy=16.5 -->\n';

for(const r of ['progressiveAuthority','fullLockReserve','17.5+5.5*rackError','rackTarget=steerCurve*WHEEL_PHYS.steerMax*progressiveAuthority'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush progressive steering no-block fix applied');
