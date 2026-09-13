import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const rep=(a,b,l)=>{must(s.includes(a),`v15.2 missing target: ${l}`);s=s.replace(a,b)};

// One clean version identity, directly from v14.6 source. No cumulative patch stack.
s=s.replaceAll('Polygon Rush v14.6 GitHub Box3D','Polygon Rush v15.2 Clean Arcade Runtime');
s=s.replaceAll('v14.6 • GITHUB BOX3D LIVE','v15.2 • CLEAN ARCADE RUNTIME');
s=s.replaceAll('Polygon Rush v14.6\\n','Polygon Rush v15.2\\n');

// Local dependency for reliable Pages startup.
s=s.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.152.2/three.min.js','three.min.js');

// Fixed visible 5-car grid near the same part of the circuit.
rep('clear(carsG);ais=[];const start=trackSamples[0],h=trackHeading(0);',
    'clear(carsG);ais=[];const playerIdx=248,start=trackSamples[playerIdx],h=trackHeading(playerIdx);',
    'player grid');
rep('const colors=[0x4dd599,0x4ea3ff,0xffc857,0xa875ff],lanes=[-4.2,4.0,-1.8,2.2];\n for(let i=0;i<4;i++){\n  const idx=(trackSamples.length-10-i*8+trackSamples.length)%trackSamples.length,p=trackSamples[idx].clone(),hh=trackHeading(idx),',
    'const colors=[0x4dd599,0x4ea3ff,0xffc857,0xa875ff],lanes=[-3.2,3.2,-3.2,3.2],gridIdx=[250,252,254,256];\n for(let i=0;i<4;i++){\n  const idx=gridIdx[i],p=trackSamples[idx].clone(),hh=trackHeading(idx),',
    'AI grid');

// One vehicle authority only: the proven arcade solver. No Box3D control/sync ownership.
const hs=s.indexOf('function hybridMove(car,controls,dt){');
const he=s.indexOf('\nconst MOVE={',hs);
must(hs>=0&&he>hs,'hybridMove bounds');
s=s.slice(0,hs)+`function hybridMove(car,controls,dt){\n return applyArcadeMovement(car,controls,dt);\n}`+s.slice(he);

// Simple start: build, spawn exactly 5 racers, show countdown. Nothing rebuilds physics bodies.
const oldStart="function start(){buildWorld($('#track').value);spawn();running=true;paused=false;raceTime=0;$('#menu').style.display='none';$('#hud').style.display='flex';$('#msg').textContent='GO!';setTimeout(()=>$('#msg').textContent='',700)}";
const newStart=`function start(){
 const menu=$('#menu'),hud=$('#hud'),msg=$('#msg');
 try{
  buildWorld($('#track').value||'coast');spawn();
  if(!player||ais.length!==4)throw new Error('Expected player + 4 opponents');
  keys={};running=true;paused=false;raceTime=0;raceStarted=false;finished=false;countdown=3.2;lapGate=false;wrongWayTime=0;
  if(menu)menu.style.display='none';if(hud)hud.style.display='flex';if(msg)msg.textContent='3';
  $('#box3dHud').textContent='ARCADE';
 }catch(e){console.error('START FAILED',e);running=false;if(menu)menu.style.display='block';if(hud)hud.style.display='none';if(msg)msg.textContent='START ERROR';}
}`;
rep(oldStart,newStart,'start');

// Player updates every frame; before GO physicsPlayer receives zero controls through canDrive.
// AI remains still until GO. Remove Box3D stepping/sync completely.
rep('  physicsPlayer(dt);\n  updateAI(dt);\n  if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}\n  updateCamera(dt);',
    '  physicsPlayer(dt);\n  if(raceStarted&&!finished)updateAI(dt);\n  updateCamera(dt);',
    'main loop');

// Only one R recovery action.
s=s.replace("if(e.code==='KeyR'&&player)respawnPlayer();",'');

// Do not initialize Box3D at page startup. Keep bridge code out of gameplay entirely.
rep('})();\n</script></body></html>', '})();\n</script></body></html>', 'document end');
s=s.replace('buildWorld(\'coast\');cam.position.set(0,165,205);cam.lookAt(0,0,0);initBox3D();requestAnimationFrame(loop);',
            "buildWorld('coast');cam.position.set(0,165,205);cam.lookAt(0,0,0);BOX3D.active=false;BOX3D.ready=false;$('#box3dHud').textContent='ARCADE';requestAnimationFrame(loop);");

// Accurate debug text.
s=s.replace("Physics backend: ${BOX3D.active?'BOX3D LIVE':'ARCADE FALLBACK'}","Physics backend: ARCADE");
s=s.replace('BOX3D WASM: bundled + runtime initialized\\nOWNERSHIP: Box3D rigid bodies/collisions when LIVE','BOX3D: disabled for racer gameplay\\nOWNERSHIP: arcade solver owns all racer movement');

// Make GO message slightly longer and explicit.
s=s.replace("if(countdown<=0){raceStarted=true;player.checkpoint=0;$('#raceBanner').textContent='RACE';setTimeout(()=>{if(raceStarted&&!player.wrongWay)$('#msg').textContent=''},650)}",
            "if(countdown<=0){raceStarted=true;player.checkpoint=0;$('#raceBanner').textContent='GO!';$('#msg').textContent='GO!';setTimeout(()=>{if(raceStarted&&!player.wrongWay)$('#msg').textContent=''},900)}");

for(const r of ['Polygon Rush v15.2 Clean Arcade Runtime','playerIdx=248','gridIdx=[250,252,254,256]','countdown=3.2','Physics backend: ARCADE','return applyArcadeMovement(car,controls,dt);'])must(s.includes(r),'v15.2 validation '+r);
must(!s.includes('if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}'),'Box3D step/sync remains in gameplay loop');
must(!s.includes('box3dApplyControl(car,controls);'),'Box3D still controls racers');
must(!s.includes('initBox3D();requestAnimationFrame(loop);'),'Box3D still initializes at startup');
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.2 single runtime rebuild applied');
