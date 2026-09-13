import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const replaceFunction=(name,newCode)=>{
 const start=s.indexOf(`function ${name}(`); must(start>=0,`missing function ${name}`);
 let i=s.indexOf('{',start),depth=0,end=-1;
 for(;i<s.length;i++){
  if(s[i]==='{')depth++;
  else if(s[i]==='}'&&--depth===0){end=i+1;break}
 }
 must(end>start,`unterminated function ${name}`);
 s=s.slice(0,start)+newCode+s.slice(end);
};

// Version + dependency cleanup.
s=s.replaceAll('Polygon Rush v14.6 GitHub Box3D','Polygon Rush v15.4 Core Drive Rebuild');
s=s.replaceAll('v14.6 • GITHUB BOX3D LIVE','v15.4 • CORE DRIVE REBUILD');
s=s.replaceAll('Polygon Rush v14.6\\n','Polygon Rush v15.4\\n');
s=s.replace('<script src="box3d_bridge.js"></script>\n','');
s=s.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.152.2/three.min.js','three.min.js');

// Fixed, close, visible five-car start grid.
s=s.replace('clear(carsG);ais=[];const start=trackSamples[0],h=trackHeading(0);','clear(carsG);ais=[];const playerIdx=248,start=trackSamples[playerIdx],h=trackHeading(playerIdx);');
s=s.replace(
 'const colors=[0x4dd599,0x4ea3ff,0xffc857,0xa875ff],lanes=[-4.2,4.0,-1.8,2.2];\n for(let i=0;i<4;i++){\n  const idx=(trackSamples.length-10-i*8+trackSamples.length)%trackSamples.length,p=trackSamples[idx].clone(),hh=trackHeading(idx),',
 'const colors=[0x4dd599,0x4ea3ff,0xffc857,0xa875ff],lanes=[-3.0,3.0,-3.0,3.0],gridIdx=[250,251,253,254];\n for(let i=0;i<4;i++){\n  const idx=gridIdx[i],p=trackSamples[idx].clone(),hh=trackHeading(idx),'
);

// Single movement authority.
replaceFunction('hybridMove',`function hybridMove(car,controls,dt){
 return applyArcadeMovement(car,controls,dt);
}`);

// Small, deterministic player controller. No Box3D and no secondary authority.
replaceFunction('physicsPlayer',`function physicsPlayer(dt){
 if(!player)return;
 ensureMoveState(player);
 const canDrive=raceStarted&&!finished;
 const throttle=canDrive&&(keys.KeyW||keys.ArrowUp)?1:0;
 const brake=canDrive&&(keys.KeyS||keys.ArrowDown)?1:0;
 const steer=canDrive?((keys.KeyA||keys.ArrowLeft?1:0)-(keys.KeyD||keys.ArrowRight?1:0)):0;
 const handbrake=canDrive&&keys.Space?1:0;
 const nitro=canDrive&&(keys.ShiftLeft||keys.ShiftRight)&&player.nitro>0;
 if(nitro)player.nitro=Math.max(0,player.nitro-dt*22);else player.nitro=Math.min(100,player.nitro+dt*4.5);
 const controls={throttle,brake,steer,handbrake,nitro};
 const r=applyArcadeMovement(player,controls,dt),lv=r.lv,near=r.near;
 nearestIdx=near.idx;
 player.g.position.copy(player.pos);player.g.rotation.y=player.heading;
 animateBuggy(player,lv.long,lv.lat,dt);derivedActions(player,controls,dt,true);
 for(const ai of ais)resolveCarCollision(player,ai);
 for(const o of destructibles)resolveWorldCollision(player,o,2.1,true);
 for(const b of barriers)resolveWorldCollision(player,b,2.0,true);
 $('#surface').textContent=r.surface;
 $('#speed').textContent=Math.round(Math.abs(lv.long)*3.6);
 $('#gear').textContent=lv.long<-1?'R':Math.abs(lv.long)<1?'N':String(clamp(Math.floor(Math.abs(lv.long)/10)+1,1,6));
 $('#susp').textContent=Math.round((1-player.suspensionDamage)*100)+'%';
 $('#traction').textContent=player.slip>.28?'SLIDE':player.slip>.14?'LOOSE':'GRIP';
 $('#nitroHud').textContent=Math.round(player.nitro)+'%';$('#healthHud').textContent=Math.round(player.health)+'%';
}`);

// Small route-following AI. Every opponent uses exactly the same arcade solver as the player.
replaceFunction('updateAI',`function updateAI(dt){
 if(!raceStarted||finished)return;
 const N=trackSamples.length;
 for(let i=0;i<ais.length;i++){
  const ai=ais[i];ensureMoveState(ai);
  let near=nearestTrack(ai.pos),lv=localVelocity(ai);
  const look=10+i*2,target=routeLookahead(near.idx,look,ai.lane||0);
  const desired=Math.atan2(target.x-ai.pos.x,target.z-ai.pos.z);
  const err=wrapAngle(desired-ai.heading);
  const steer=clamp(err*1.8,-1,1);
  const corner=cornerSeverity((near.idx+14)%N);
  const targetSpeed=clamp((ai.pace||44)*(1-corner*.55),20,48);
  const controls={throttle:lv.long<targetSpeed?1:0,brake:lv.long>targetSpeed+3?.45:0,steer,handbrake:corner>.55&&lv.long>28?.18:0,nitro:false};
  const r=applyArcadeMovement(ai,controls,dt);lv=r.lv;near=r.near;
  ai.speed=lv.long;ai.progress=projectedProgress(ai.pos);
  ai.g.position.copy(ai.pos);ai.g.rotation.y=ai.heading;animateBuggy(ai,lv.long,lv.lat,dt);
  derivedActions(ai,controls,dt,false);
 }
 for(let i=0;i<ais.length;i++)for(let j=i+1;j<ais.length;j++)resolveCarCollision(ais[i],ais[j]);
}`);

// Remove any Box3D reset dependency from recovery.
s=s.replace(';box3dResetCar(player);',';');

// Clean start with five-racer invariant and countdown.
replaceFunction('start',`function start(){
 const menu=$('#menu'),hud=$('#hud'),msg=$('#msg');
 try{
  buildWorld($('#track').value||'coast');spawn();
  if(!player||ais.length!==4)throw new Error('START invariant failed: expected 1 player + 4 opponents');
  keys={};running=true;paused=false;raceTime=0;raceStarted=false;finished=false;countdown=3.2;lapGate=false;wrongWayTime=0;
  if(menu)menu.style.display='none';if(hud)hud.style.display='flex';if(msg)msg.textContent='3';
  $('#box3dHud').textContent='ARCADE';
  window.__polygonRush={version:'15.4',racers:5,solver:'arcade',startOk:true};
 }catch(e){console.error('START FAILED',e);running=false;window.__polygonRush={version:'15.4',startOk:false,error:String(e)};if(menu)menu.style.display='block';if(hud)hud.style.display='none';if(msg)msg.textContent='START ERROR';}
}`);

// Countdown gate and GO message.
s=s.replace("if(countdown<=0){raceStarted=true;player.checkpoint=0;$('#raceBanner').textContent='RACE';setTimeout(()=>{if(raceStarted&&!player.wrongWay)$('#msg').textContent=''},650)}",
            "if(countdown<=0){raceStarted=true;player.checkpoint=0;$('#raceBanner').textContent='GO!';$('#msg').textContent='GO!';window.__polygonRush.go=true;setTimeout(()=>{if(raceStarted&&!player.wrongWay)$('#msg').textContent=''},900)}");

// Main loop: player can update during countdown with zero controls; AI begins only after GO. No physics backend step exists.
s=s.replace('  physicsPlayer(dt);\n  updateAI(dt);\n  if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}\n  updateCamera(dt);',
            '  physicsPlayer(dt);\n  if(raceStarted&&!finished)updateAI(dt);\n  updateCamera(dt);');

// Remove duplicate recovery and disable Box3D initialization.
s=s.replace("if(e.code==='KeyR'&&player)respawnPlayer();",'');
s=s.replace("buildWorld('coast');cam.position.set(0,165,205);cam.lookAt(0,0,0);initBox3D();requestAnimationFrame(loop);",
            "buildWorld('coast');cam.position.set(0,165,205);cam.lookAt(0,0,0);BOX3D.active=false;BOX3D.ready=false;$('#box3dHud').textContent='ARCADE';window.__polygonRush={version:'15.4',boot:true,solver:'arcade'};requestAnimationFrame(loop);");
s=s.replace("Physics backend: ${BOX3D.active?'BOX3D LIVE':'ARCADE FALLBACK'}","Physics backend: ARCADE");
s=s.replace('BOX3D WASM: bundled + runtime initialized\\nOWNERSHIP: Box3D rigid bodies/collisions when LIVE','BOX3D: removed from browser gameplay\\nOWNERSHIP: arcade solver owns player + AI movement');

// Startup solver self-test: proves throttle changes position using the same solver before promotion.
const insert='function applyImpactDamage(car,severity,kind=\'collision\'){';
const selfTest=`function runArcadeSolverSelfTest(){
 const idx=32,p=trackSamples[idx].clone(),dummy={pos:p,vel:new THREE.Vector3(),heading:trackHeading(idx),speed:0,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,g:{userData:{pitch:0,roll:0,visual:null}}};
 const x0=dummy.pos.x,z0=dummy.pos.z;
 for(let i=0;i<90;i++)applyArcadeMovement(dummy,{throttle:1,brake:0,steer:0,handbrake:0,nitro:false},1/60);
 const dist=Math.hypot(dummy.pos.x-x0,dummy.pos.z-z0);
 if(!(dist>2))throw new Error('Arcade solver self-test failed: '+dist.toFixed(3));
 return dist;
}
`;
must(s.includes(insert),'self-test insertion point missing');s=s.replace(insert,selfTest+insert);
// Run the test after the initial world exists, before the loop begins.
s=s.replace("window.__polygonRush={version:'15.4',boot:true,solver:'arcade'};requestAnimationFrame(loop);",
            "window.__polygonRush={version:'15.4',boot:true,solver:'arcade'};window.__polygonRush.selfTestDistance=runArcadeSolverSelfTest();requestAnimationFrame(loop);");

for(const r of ['Polygon Rush v15.4 Core Drive Rebuild','gridIdx=[250,251,253,254]','function runArcadeSolverSelfTest','window.__polygonRush.selfTestDistance','return applyArcadeMovement(car,controls,dt);','START invariant failed: expected 1 player + 4 opponents'])must(s.includes(r),'v15.4 validation missing '+r);
for(const bad of ['<script src="box3d_bridge.js"></script>','if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}','initBox3D();requestAnimationFrame(loop);'])must(!s.includes(bad),'v15.4 forbidden runtime path '+bad);

fs.writeFileSync(file,s);
console.log('Polygon Rush v15.4 core drive rebuild applied');
