import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const rep=(a,b,l)=>{must(s.includes(a),`v15.1 clean missing target: ${l}`);s=s.replace(a,b)};

// Version: this build deliberately removes competing drive authorities.
s=s.replace('Polygon Rush v15.0.2 Drive + Countdown Fix','Polygon Rush v15.1 Clean Runtime');
s=s.replace('v15.0.2 • DRIVE + COUNTDOWN FIX','v15.1 • CLEAN RUNTIME');
s=s.replace('Polygon Rush v15.0.2\\n','Polygon Rush v15.1\\n');

// Start the player just before the line, with all four opponents visibly ahead in a staggered grid.
rep('clear(carsG);ais=[];const start=trackSamples[0],h=trackHeading(0);',
    'clear(carsG);ais=[];const playerIdx=250,start=trackSamples[playerIdx],h=trackHeading(playerIdx);',
    'player start grid');
rep('const colors=[0x4dd599,0x4ea3ff,0xffc857,0xa875ff],lanes=[-4.2,4.0,-1.8,2.2],gridIdx=[2,258,4,256];',
    'const colors=[0x4dd599,0x4ea3ff,0xffc857,0xa875ff],lanes=[-3.4,3.4,-3.4,3.4],gridIdx=[252,254,256,258];',
    'opponent visible start grid');

// SINGLE AUTHORITATIVE DRIVE PATH.
// Box3D remains loadable/compiled for later collision integration, but it no longer owns racer transforms.
rep("if(BOX3D.active){box3dDestroyAll();box3dClearStatics();box3dBuildTrackWorld();box3dCreateVehicle(player);for(const ai of ais)box3dCreateVehicle(ai);if(BOX3D.bodies.size!==5)throw new Error('Box3D racer body creation failed: '+BOX3D.bodies.size+'/5')}",
`if(BOX3D.active){
 box3dDestroyAll();box3dClearStatics();BOX3D.active=false;
 BOX3D.driveFallbackReason='Clean runtime: arcade solver is authoritative';
 const ph=$('#box3dHud');if(ph)ph.textContent='ARCADE DRIVE';
}`,
'remove Box3D racer authority');

// Hybrid move is now intentionally simple: one solver, one state owner, one transform source.
const hybridStart='function hybridMove(car,controls,dt){\n const shaped=shapeDriveControls(car,controls,dt);';
must(s.includes(hybridStart),'hybridMove start missing');
const startIdx=s.indexOf(hybridStart);
const endMarker='\nconst MOVE={';
const endIdx=s.indexOf(endMarker,startIdx);
must(endIdx>startIdx,'hybridMove end missing');
const cleanHybrid=`function hybridMove(car,controls,dt){
 const shaped=shapeDriveControls(car,controls,dt);
 return applyArcadeMovement(car,shaped,dt);
}`;
s=s.slice(0,startIdx)+cleanHybrid+s.slice(endIdx);

// One R-key recovery path only. Avoid double reset/reposition on a single key press.
s=s.replace("if(e.code==='KeyR')recover();",'');

// Countdown is the only launch gate. Keep both player and AI still until GO.
rep('if(running&&!paused){\n  raceTime+=dt;\n  physicsPlayer(dt);\n  if(raceStarted&&!finished)updateAI(dt);\n  if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}\n  updateCamera(dt);',
`if(running&&!paused){
  raceTime+=dt;
  physicsPlayer(dt);
  if(raceStarted&&!finished)updateAI(dt);
  updateCamera(dt);`,
'clean main loop ownership');

// Player state must always drive the visible transform in arcade mode.
// This keeps render state explicit even if a future backend is loaded in the background.
rep('const r=hybridMove(player,controls,dt),lv=r.lv,near=r.near;nearestIdx=near.idx;\n player.g.position.copy(player.pos);player.g.rotation.y=player.heading;animateBuggy(player,lv.long,lv.lat,dt);',
`const r=hybridMove(player,controls,dt),lv=r.lv,near=r.near;nearestIdx=near.idx;
 player.g.position.copy(player.pos);player.g.rotation.y=player.heading;animateBuggy(player,lv.long,lv.lat,dt);`,
'player transform authority');

// Clear any stale Box3D body ownership when a race begins.
rep('running=true;paused=false;raceTime=0;raceStarted=false;finished=false;countdown=3.15;keys={};',
    "running=true;paused=false;raceTime=0;raceStarted=false;finished=false;countdown=3.15;keys={};BOX3D.bodies.clear();BOX3D.bodyOwners?.clear?.();",
    'clean start state');

// Accurate diagnostics: do not say Box3D owns gameplay when this clean build intentionally uses arcade drive.
s=s.replace("Physics backend: ${BOX3D.active?'BOX3D LIVE':'ARCADE FALLBACK'}",
            "Physics backend: ARCADE AUTHORITATIVE");
s=s.replace("BOX3D WASM: bundled + runtime initialized\\nOWNERSHIP: Box3D rigid bodies/collisions when LIVE",
            "BOX3D WASM: bundled + runtime available\\nOWNERSHIP: arcade vehicle solver owns racer movement");

for(const r of [
 'Polygon Rush v15.1 Clean Runtime',
 'playerIdx=250',
 'gridIdx=[252,254,256,258]',
 "Clean runtime: arcade solver is authoritative",
 'return applyArcadeMovement(car,shaped,dt);',
 'Physics backend: ARCADE AUTHORITATIVE',
 'countdown=3.15'
]) must(s.includes(r),'v15.1 validation missing: '+r);

must(!s.includes('box3dApplyControl(car,shaped);'),'Box3D still owns hybrid racer movement');
must(!s.includes("if(e.code==='KeyR')recover();"),'duplicate R recovery still present');
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.1 clean runtime applied');
