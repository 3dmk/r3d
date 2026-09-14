import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
must(s.includes('Polygon Rush v15.5.10 Wheel Steering + CG Physics'),'v15.5.10 base missing');

const oldAck=`  const inner=Math.atan(L/Math.max(.25,turnR-T*.5)),outer=Math.atan(L/(turnR+T*.5)),sgn=Math.sign(rack);
  steerLeft=sgn*(sgn>0?inner:outer);steerRight=sgn*(sgn>0?outer:inner);`;
const newAck=`  const ackInner=Math.atan(L/Math.max(.25,turnR-T*.5)),ackOuter=Math.atan(L/(turnR+T*.5)),sgn=Math.sign(rack);
  const inner=absRack+(ackInner-absRack)*.58,outer=absRack+(ackOuter-absRack)*.58;
  steerLeft=sgn*(sgn>0?inner:outer);steerRight=sgn*(sgn>0?outer:inner);`;
must(s.includes(oldAck),'Ackermann block missing');s=s.replace(oldAck,newAck);

must(s.includes("const cornerK=WHEEL_PHYS.tireCorner*clamp(loadRatio,.55,1.55)*(front?1.05:.96);"),'corner balance block missing');
s=s.replace("const cornerK=WHEEL_PHYS.tireCorner*clamp(loadRatio,.55,1.55)*(front?1.05:.96);",
            "const cornerK=WHEEL_PHYS.tireCorner*clamp(loadRatio,.55,1.55)*(front?.90:1.14);");

must(s.includes("car.yawRate*=Math.exp(-(.22+speedAbs*.004)*dt);"),'yaw drag block missing');
s=s.replace("car.yawRate*=Math.exp(-(.22+speedAbs*.004)*dt);",
            "car.yawRate*=Math.exp(-(.78+speedAbs*.007)*dt);");

for(const r of ['ackInner','(front?.90:1.14)','(.78+speedAbs*.007)'])must(s.includes(r),'v15.5.10 tire balance missing '+r);
fs.writeFileSync(file,s);console.log('Polygon Rush v15.5.10 tire balance applied');
