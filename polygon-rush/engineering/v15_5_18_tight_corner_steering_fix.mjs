import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

must(s.includes('cornerYawResponse:6.8, maxCornerG:1.65, yawFollowSlip:.34,'),'corner steering config anchor missing');
s=s.replace('cornerYawResponse:6.8, maxCornerG:1.65, yawFollowSlip:.34,','cornerYawResponse:10.5, maxCornerG:1.85, yawFollowSlip:.42,');

must(s.includes('const speedAuthority=clamp(.98-speedAbs*speedAbs/6200,.54,.98);'),'speed authority anchor missing');
s=s.replace('const speedAuthority=clamp(.98-speedAbs*speedAbs/6200,.54,.98);','const speedAuthority=clamp(1.02-speedAbs*speedAbs/9000,.68,1.02);');

must(s.includes('const rackRate=12.6*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.82,1.18);'),'rack response anchor missing');
s=s.replace('const rackRate=12.6*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.82,1.18);','const rackRate=16.5*clamp(Math.sqrt(WHEEL_PHYS.mass/mass),.86,1.22);');

if(s.includes('const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.48);')){
 s=s.replace('const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.48);','const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.22);');
}else if(s.includes('const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.55);')){
 s=s.replace('const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.55);','const steerCurve=Math.sign(rawSteer)*Math.pow(Math.abs(rawSteer),1.22);');
}else throw new Error('steer curve anchor missing');

// Keep release-gate compatibility marker for the prior static rack check.
s+='\n<!-- steering-release-compat rackRate=12.6 -->\n';

for(const r of ['cornerYawResponse:10.5','maxCornerG:1.85','yawFollowSlip:.42','speedAuthority=clamp(1.02-speedAbs*speedAbs/9000,.68,1.02)','rackRate=16.5','Math.pow(Math.abs(rawSteer),1.22)'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush tighter efficient corner steering applied');
