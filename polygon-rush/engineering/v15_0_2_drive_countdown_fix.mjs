import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const rep=(a,b,l)=>{must(s.includes(a),`v15.0.2 missing target: ${l}`);s=s.replace(a,b)};

// Version.
s=s.replace('Polygon Rush v15.0.1 Runtime Hotfix','Polygon Rush v15.0.2 Drive + Countdown Fix');
s=s.replace('v15.0.1 • RUNTIME HOTFIX','v15.0.2 • DRIVE + COUNTDOWN FIX');
s=s.replace('Polygon Rush v15.0.1\\n','Polygon Rush v15.0.2\\n');

// Put all four opponents on a visible staggered start grid around the player.
rep("const colors=[0x4dd599,0x4ea3ff,0xffc857,0xa875ff],lanes=[-4.2,4.0,-1.8,2.2];\n for(let i=0;i<4;i++){\n  const idx=(trackSamples.length-10-i*8+trackSamples.length)%trackSamples.length,p=trackSamples[idx].clone(),hh=trackHeading(idx),",
"const colors=[0x4dd599,0x4ea3ff,0xffc857,0xa875ff],lanes=[-4.2,4.0,-1.8,2.2],gridIdx=[2,258,4,256];\n for(let i=0;i<4;i++){\n  const idx=gridIdx[i]%trackSamples.length,p=trackSamples[idx].clone(),hh=trackHeading(idx),",
'visible AI start grid');

// Box3D drive watchdog. If controls are being applied but the rigid body remains immobile,
// fail safely to the proven arcade solver instead of keeping the race frozen.
rep("function box3dApplyControl(car,controls){\n if(!BOX3D.active)return false;",
`function forceArcadeFallback(reason='Box3D drive stall'){
 if(!BOX3D.active)return;
 console.warn(reason+' — switching to arcade movement fallback');
 BOX3D.active=false;BOX3D.failed=true;BOX3D.driveFallbackReason=reason;
 const hud=$('#box3dHud');if(hud)hud.textContent='ARCADE SAFE';
 for(const car of [player,...ais])if(car){car._driveInput={throttle:0,brake:0,steer:0,handbrake:0}}
}
function box3dApplyControl(car,controls){
 if(!BOX3D.active)return false;`, 'drive fallback helper');

rep(" const throttle=(controls.throttle||0),brake=(controls.brake||0),steer=(controls.steer||0),nitro=controls.nitro?1:0;\n m._pr_b3_apply_vehicle_control(BOX3D.world,id,throttle,brake,steer,controls.handbrake||0,nitro,terrainGrip(terrainType(car.pos)),lv.long);\n return true;",
` const throttle=(controls.throttle||0),brake=(controls.brake||0),steer=(controls.steer||0),nitro=controls.nitro?1:0;
 m._pr_b3_apply_vehicle_control(BOX3D.world,id,throttle,brake,steer,controls.handbrake||0,nitro,terrainGrip(terrainType(car.pos)),lv.long);
 if(car===player&&raceStarted&&throttle>.35&&brake<.1){
   car._driveStall=(Math.abs(lv.long)<.25)?(car._driveStall||0)+1:0;
   if(car._driveStall>75){forceArcadeFallback('Box3D accepted throttle but produced no forward speed');return false}
 }else if(car===player)car._driveStall=0;
 return true;`, 'Box3D drive watchdog');

// A real countdown: race is frozen until GO.
rep("running=true;paused=false;raceTime=0;raceStarted=true;finished=false;countdown=0;keys={};",
"running=true;paused=false;raceTime=0;raceStarted=false;finished=false;countdown=3.15;keys={};",
'countdown start state');
rep("if(msg)msg.textContent='GO!';setTimeout(()=>{if(msg)msg.textContent=''},700)",
"if(msg)msg.textContent='3'",
'initial countdown message');

// AI must not leave the grid during 3-2-1.
rep("  updateAI(dt);\n  if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}",
"  if(raceStarted&&!finished)updateAI(dt);\n  if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}",
'freeze AI until GO');

// Make GO state explicit and reset any accumulated control state so both player and AI launch cleanly.
rep("if(countdown<=0){raceStarted=true;player.checkpoint=0;$('#raceBanner').textContent='RACE';setTimeout(()=>{if(raceStarted&&!player.wrongWay)$('#msg').textContent=''},650)}",
"if(countdown<=0){raceStarted=true;player.checkpoint=0;player._driveStall=0;for(const r of [player,...ais])if(r)r._driveInput={throttle:0,brake:0,steer:0,handbrake:0};$('#raceBanner').textContent='GO!';$('#msg').textContent='GO!';setTimeout(()=>{if(raceStarted&&!player.wrongWay)$('#msg').textContent=''},850)}",
'GO launch reset');

// Diagnostics expose fallback reason if it occurs.
s=s.replace("Physics backend: ${BOX3D.active?'BOX3D LIVE':'ARCADE FALLBACK'}\\nBox3D bodies:",
            "Physics backend: ${BOX3D.active?'BOX3D LIVE':'ARCADE FALLBACK'}\\nDrive fallback: ${BOX3D.driveFallbackReason||'none'}\\nBox3D bodies:");

for(const r of ['Polygon Rush v15.0.2 Drive + Countdown Fix','gridIdx=[2,258,4,256]','function forceArcadeFallback','countdown=3.15','if(raceStarted&&!finished)updateAI(dt)','Box3D accepted throttle but produced no forward speed'])must(s.includes(r),'v15.0.2 validation missing: '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.0.2 drive + countdown fix applied');
