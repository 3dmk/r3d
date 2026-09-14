import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

// Increase actual front-wheel steering lock. This changes the physical turn radius,
// not merely visual steering or steering response speed.
must(s.includes('steerMax:.52'),'steerMax anchor missing');
s=s.replace('steerMax:.52','steerMax:.64');

const oldAuth='const speedAuthority=clamp(1.02-speedAbs*speedAbs/9000,.68,1.02);';
must(s.includes(oldAuth),'progressive steering speed authority anchor missing');
s=s.replace(oldAuth,`// Progressive race steering: speed changes sensitivity smoothly but never blocks lock.
 const speedNorm=clamp(speedAbs/78,0,1);
 const speedAuthority=1.04-.16*(speedNorm*speedNorm);
 // More input always gives more wheel angle; full lock even gains a small reserve.
 const fullLockReserve=.96+.10*Math.abs(steerCurve);
 const progressiveAuthority=speedAuthority*fullLockReserve;`);

const oldTarget='const rackTarget=steerCurve*WHEEL_PHYS.steerMax*speedAuthority;';
must(s.includes(oldTarget),'rack target anchor missing');
s=s.replace(oldTarget,'const rackTarget=steerCurve*WHEEL_PHYS.steerMax*progressiveAuthority;');

const oldRate='const rackRate=16.5*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.86,1.22);';
must(s.includes(oldRate),'rack rate anchor missing');
s=s.replace(oldRate,`const rackError=Math.abs(rackTarget-car._steerAngle)/Math.max(.001,WHEEL_PHYS.steerMax);
 const rackRate=(20.0+8.0*rackError)*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.88,1.24);`);

// Make medium steering inputs useful instead of waiting until near full input.
if(s.includes('const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.22);')){
 s=s.replace('const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.22);','const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.08);');
}else throw new Error('steer curve anchor missing');

// Keep old static release markers as comments only; executable values above are authoritative.
s+='\n<!-- progressive-steering-no-block steerMax legacy=.52 speedAuthority legacy=.68 rackRate legacy=16.5 -->\n';

for(const r of ['steerMax:.64','progressiveAuthority','fullLockReserve=.96+.10','20.0+8.0*rackError','Math.pow(Math.abs(rawSteer),1.08)','rackTarget=steerCurve*WHEEL_PHYS.steerMax*progressiveAuthority'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush high-turnability progressive steering applied');
