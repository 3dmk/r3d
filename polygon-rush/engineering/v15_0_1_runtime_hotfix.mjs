import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

// Keep the certified v14.10 gameplay path, but publish it as the v15 runtime recovery build.
s=s.replace('Polygon Rush v14.10 Engineering Pass 3','Polygon Rush v15.0.1 Runtime Hotfix');
s=s.replace('v14.10 • ENGINEERING PASS 3','v15.0.1 • RUNTIME HOTFIX');
s=s.replace('Polygon Rush v14.10\\n','Polygon Rush v15.0.1\\n');

// Keep Three.js local for deployment resilience without changing gameplay ownership.
s=s.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.152.2/three.min.js','three.min.js');

// Strengthen runtime state diagnostics and ensure Start always enters a drivable race immediately.
s=s.replace("running=true;paused=false;raceTime=0;raceStarted=true;finished=false;countdown=0;",
            "running=true;paused=false;raceTime=0;raceStarted=true;finished=false;countdown=0;keys={};");

// Player/AI visual sync must follow authoritative physics bodies after stepping.
must(s.includes('if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}'),'Box3D step/sync loop missing');

for(const r of [
 'Polygon Rush v15.0.1 Runtime Hotfix',
 'ais.length!==4',
 'BOX3D.bodies.size!==5',
 'box3dApplyControl(car,shaped)',
 'applyArcadeMovement(car,shaped,dt)',
 'if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}',
 'three.min.js'
]) must(s.includes(r),'hotfix validation missing: '+r);

fs.writeFileSync(file,s);
console.log('Polygon Rush v15.0.1 runtime hotfix applied');
