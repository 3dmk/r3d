import fs from 'node:fs';

const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');

function replaceOnce(oldText,newText,label){
  if(!s.includes(oldText)) throw new Error(`Pass 1 patch missing target: ${label}`);
  s=s.replace(oldText,newText);
}

const marker='function hybridMove(car,controls,dt){';
const shaped=`function moveToward(v,target,rate,dt){
 const d=target-v,m=rate*Math.min(dt,.05);
 return Math.abs(d)<=m?target:v+Math.sign(d)*m;
}
function shapeDriveControls(car,controls,dt){
 const st=car._driveInput||(car._driveInput={throttle:0,brake:0,steer:0,handbrake:0});
 const lv=localVelocity(car),speed=Math.abs(lv.long);
 const steerScale=clamp(1-speed/115,.52,1);
 const targetSteer=clamp(controls.steer||0,-1,1)*steerScale;
 const targetThrottle=clamp(controls.throttle||0,0,1);
 const targetBrake=clamp(controls.brake||0,0,1);
 st.throttle=moveToward(st.throttle,targetThrottle,targetThrottle>st.throttle?4.4:7.5,dt);
 st.brake=moveToward(st.brake,targetBrake,targetBrake>st.brake?7.5:11,dt);
 st.steer=moveToward(st.steer,targetSteer,Math.abs(targetSteer)>Math.abs(st.steer)?5.4:8.5,dt);
 st.handbrake=moveToward(st.handbrake,controls.handbrake?1:0,12,dt);
 if(st.brake>.12)st.throttle*=Math.max(0,1-st.brake*.82);
 return {throttle:st.throttle,brake:st.brake,steer:st.steer,handbrake:st.handbrake,nitro:!!controls.nitro};
}
function hybridMove(car,controls,dt){`;
replaceOnce(marker,shaped,'hybridMove marker');
replaceOnce('function hybridMove(car,controls,dt){\n if(BOX3D.active){\n  box3dApplyControl(car,controls);','function hybridMove(car,controls,dt){\n const shaped=shapeDriveControls(car,controls,dt);\n if(BOX3D.active){\n  box3dApplyControl(car,shaped);','Box3D shaped controls');
replaceOnce(' return applyArcadeMovement(car,controls,dt);\n}',' return applyArcadeMovement(car,shaped,dt);\n}','fallback shaped controls');

s=s.replace('Polygon Rush v14.6 GitHub Box3D','Polygon Rush v14.8 Engineering Pass 1');
s=s.replace('v14.6 • GITHUB BOX3D LIVE','v14.8 • ENGINEERING PASS 1');
s=s.replace('Polygon Rush v14.6\\n','Polygon Rush v14.8\\n');

if(!s.includes('function shapeDriveControls')) throw new Error('Pass 1 control shaper not installed');
if(!s.includes('box3dApplyControl(car,shaped)')) throw new Error('Box3D does not use shaped controls');
if(!s.includes('applyArcadeMovement(car,shaped,dt)')) throw new Error('Arcade fallback does not use shaped controls');
fs.writeFileSync(file,s);
console.log('Polygon Rush v14.8 Engineering Pass 1 patch applied');
