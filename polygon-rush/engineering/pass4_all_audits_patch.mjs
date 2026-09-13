import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(cond,msg)=>{if(!cond)throw new Error(msg)};
const rep=(a,b,label)=>{must(s.includes(a),`all-audits patch missing target: ${label}`);s=s.replace(a,b)};
const repRe=(re,b,label)=>{must(re.test(s),`all-audits regex missing target: ${label}`);s=s.replace(re,b)};

// Deploy-local dependency: workflow downloads the pinned Three.js build beside index.html.
s=s.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.152.2/three.min.js','three.min.js');

// Lower-value wide shadow coverage was wasting resolution. Keep a tighter useful race envelope.
s=s.replace('sun.shadow.camera.left=-170;sun.shadow.camera.right=170;sun.shadow.camera.top=170;sun.shadow.camera.bottom=-170;',
            'sun.shadow.camera.left=-95;sun.shadow.camera.right=95;sun.shadow.camera.top=95;sun.shadow.camera.bottom=-95;sun.shadow.camera.near=10;sun.shadow.camera.far=260;');

// Shared runtime quality/telemetry state.
rep('let curve,trackSamples=[],running=false,paused=false,last=performance.now(),keys={},player=null,ais=[],raceTime=0,frameCount=0,fps=0,fpsStamp=performance.now(),nearestIdx=0,lapGate=false,countdown=0,raceStarted=false,finished=false,checkpoint=0,cameraShake=0,wrongWayTime=0,pickups=[],barriers=[];',
`let curve,trackSamples=[],running=false,paused=false,last=performance.now(),keys={},player=null,ais=[],raceTime=0,frameCount=0,fps=0,fpsStamp=performance.now(),nearestIdx=0,lapGate=false,countdown=0,raceStarted=false,finished=false,checkpoint=0,cameraShake=0,wrongWayTime=0,pickups=[],barriers=[];
let uiFrame=0,lastIdleRender=0;
const PERF={frames:0,sum:0,max:0,physics:0,ai:0,render:0,p95:0,samples:[]};
const SCR={a:new THREE.Vector3(),b:new THREE.Vector3(),c:new THREE.Vector3(),d:new THREE.Vector3()};
const HANDLING={arcade:{grip:1,steer:1,brake:1},grippy:{grip:1.22,steer:.92,brake:1.08},drift:{grip:.72,steer:1.12,brake:.94}};
function handlingProfile(){return HANDLING[$('#handling')?.value]||HANDLING.arcade}
function recordFrame(ms){PERF.frames++;PERF.sum+=ms;PERF.max=Math.max(PERF.max,ms);PERF.samples.push(ms);if(PERF.samples.length>240)PERF.samples.shift();if(PERF.frames%30===0){const a=[...PERF.samples].sort((x,y)=>x-y);PERF.p95=a[Math.floor(a.length*.95)]||0}}
`, 'runtime telemetry state');

// Pooled FX: reusable meshes/materials instead of allocate/dispose churn during racing.
repRe(/const dustParticles=\[\],skidMarks=\[\],destructibles=\[\];[\s\S]*?function updateDust\(dt\)\{[\s\S]*?\n\}/,
`const dustParticles=[],skidMarks=[],destructibles=[],exhaustPuffs=[];
const FX={dustPool:[],exhaustPool:[],skidPool:[]};
const fxGeo={dust:new THREE.SphereGeometry(.25,6,4),exhaust:new THREE.SphereGeometry(.14,6,4),skid:new THREE.PlaneGeometry(.3,1.2)};
const fxMat={dust:new THREE.MeshBasicMaterial({color:0xb89a70,transparent:true,opacity:.32,depthWrite:false}),exhaust:new THREE.MeshBasicMaterial({color:0x8e949a,transparent:true,opacity:.22,depthWrite:false}),skid:new THREE.MeshBasicMaterial({color:0x211b18,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide})};
function takeFx(pool,geo,mat){const p=pool.pop()||new THREE.Mesh(geo,mat.clone());p.visible=true;fxG.add(p);return p}
function releaseFx(pool,p){p.visible=false;fxG.remove(p);pool.push(p)}
function spawnSkid(pos,heading,intensity=1,color=0x211b18){if(skidMarks.length>260)return;const q=takeFx(FX.skidPool,fxGeo.skid,fxMat.skid);q.material.color.setHex(color);q.material.opacity=.34;q.scale.set(.75+intensity*.45,1+intensity*.55,1);q.rotation.set(-Math.PI/2,0,-heading);q.position.copy(pos);q.position.y+=.012;q.userData.life=3.8;skidMarks.push(q)}
function updateSkids(dt){for(let i=skidMarks.length-1;i>=0;i--){const q=skidMarks[i];q.userData.life-=dt;q.material.opacity=Math.max(0,q.userData.life*.09);if(q.userData.life<=0){releaseFx(FX.skidPool,q);skidMarks[i]=skidMarks[skidMarks.length-1];skidMarks.pop()}}}
function spawnExhaust(car){if(exhaustPuffs.length>96)return;const f=SCR.a.set(Math.sin(car.heading),0,Math.cos(car.heading)),r=SCR.b.set(f.z,0,-f.x),p=takeFx(FX.exhaustPool,fxGeo.exhaust,fxMat.exhaust);p.scale.setScalar(.8+Math.random()*.7);p.material.opacity=.22;p.position.copy(car.pos).addScaledVector(f,-2.25).addScaledVector(r,.45);p.position.y+=.75;p.userData.life=.35+Math.random()*.25;p.userData.vel||(p.userData.vel=new THREE.Vector3());p.userData.vel.copy(f).multiplyScalar(-1.5);p.userData.vel.y=.55;exhaustPuffs.push(p)}
function updateExhaust(dt){for(let i=exhaustPuffs.length-1;i>=0;i--){const p=exhaustPuffs[i];p.userData.life-=dt;p.position.addScaledVector(p.userData.vel,dt);p.scale.multiplyScalar(1+dt*2.2);p.material.opacity=Math.max(0,p.userData.life*.35);if(p.userData.life<=0){releaseFx(FX.exhaustPool,p);exhaustPuffs[i]=exhaustPuffs[exhaustPuffs.length-1];exhaustPuffs.pop()}}}
function spawnDust(pos,vel,intensity=1){if(dustParticles.length>180)return;const p=takeFx(FX.dustPool,fxGeo.dust,fxMat.dust);p.material.opacity=.32;p.position.copy(pos);p.position.y+=.15;p.scale.setScalar((.8+Math.random()*.8)*intensity);p.userData.life=.45+Math.random()*.55;p.userData.vel||(p.userData.vel=new THREE.Vector3());p.userData.vel.copy(vel).multiplyScalar(-.08);p.userData.vel.x+=(Math.random()-.5)*1.5;p.userData.vel.y=1+Math.random();p.userData.vel.z+=(Math.random()-.5)*1.5;dustParticles.push(p)}
function updateDust(dt){for(let i=dustParticles.length-1;i>=0;i--){const p=dustParticles[i];p.userData.life-=dt;p.position.addScaledVector(p.userData.vel,dt);p.userData.vel.y+=.6*dt;p.scale.multiplyScalar(1+dt*1.9);p.material.opacity=Math.max(0,p.userData.life*.45);if(p.userData.life<=0){releaseFx(FX.dustPool,p);dustParticles[i]=dustParticles[dustParticles.length-1];dustParticles.pop()}}}`,
'FX pool conversion');

// Handling selector is now real and influences both Box3D intent and fallback physics.
rep('m._pr_b3_apply_vehicle_control(BOX3D.world,id,throttle,brake,steer,controls.handbrake||0,nitro,terrainGrip(terrainType(car.pos)),lv.long);',
`const hp=handlingProfile();
 m._pr_b3_apply_vehicle_control(BOX3D.world,id,throttle,brake*hp.brake,steer*hp.steer,controls.handbrake||0,nitro,terrainGrip(terrainType(car.pos))*hp.grip,lv.long);`, 'Box3D handling modes');
rep('const before=localVelocity(car),speedAbs=Math.abs(before.long),surface=terrainType(car.pos),surfaceGrip=terrainGrip(surface);',
'const before=localVelocity(car),speedAbs=Math.abs(before.long),surface=terrainType(car.pos),hp=handlingProfile(),surfaceGrip=terrainGrip(surface)*hp.grip;', 'fallback handling grip');
rep('const steer=(controls.steer||0)*MOVE.steerRate*steerAuthority;',
'const steer=(controls.steer||0)*MOVE.steerRate*steerAuthority*hp.steer;', 'fallback handling steer');
rep('const b=MOVE.brake*brakeHealth*(controls.brake||0)*dt;',
'const b=MOVE.brake*brakeHealth*hp.brake*(controls.brake||0)*dt;', 'fallback handling brake');

// Reuse scratch vectors in fallback collision resolution.
repRe(/function resolveCarCollision\(a,b\)\{[\s\S]*?\n\}/,
`function resolveCarCollision(a,b){
 const dvec=SCR.a.copy(a.pos).sub(b.pos);dvec.y=0;const d=dvec.length(),r=MOVE.collisionRadius;if(d<=.001||d>=r)return;
 const n=dvec.multiplyScalar(1/d),pen=r-d,rel=SCR.b.copy(a.vel).sub(b.vel).dot(n);a.pos.addScaledVector(n,pen*.5);b.pos.addScaledVector(n,-pen*.5);
 if(rel<0){const impulse=-rel*.58;a.vel.addScaledVector(n,impulse);b.vel.addScaledVector(n,-impulse);a.heading+=SCR.c.set(Math.cos(a.heading),0,-Math.sin(a.heading)).dot(n)*impulse*.018;b.heading-=SCR.d.set(Math.cos(b.heading),0,-Math.sin(b.heading)).dot(n)*impulse*.018;applyImpactDamage(a,Math.abs(rel)/22,'collision');applyImpactDamage(b,Math.abs(rel)/22,'collision')}
}`, 'collision scratch vectors');
repRe(/function resolveWorldCollision\(car,obj,radius=1\.9,breakable=false\)\{[\s\S]*?\n\}/,
`function resolveWorldCollision(car,obj,radius=1.9,breakable=false){if(!obj.visible)return;const dvec=SCR.a.copy(car.pos).sub(obj.position);dvec.y=0;const d=dvec.length();if(d<=.001||d>radius)return;const n=dvec.multiplyScalar(1/d),speed=car.vel.length();if(breakable&&speed>14){obj.visible=false;obj.userData.alive=false;car.vel.multiplyScalar(.9);applyImpactDamage(car,speed/48,'collision');return}car.pos.addScaledVector(n,radius-d+.02);const vn=car.vel.dot(n);if(vn<0)car.vel.addScaledVector(n,-vn*1.35);applyImpactDamage(car,speed/52,'collision')}`, 'world collision scratch vector');

// AI keeps a longer staged recovery period before a hard reset, reducing visible teleporting.
s=s.replace('if(near.dist>45||ai.stuck>3.2){','if(near.dist>55||ai.stuck>5.0){');

// Safer player recovery: reset to last known safe track position, clear vertical motion and rebuild the rigid body.
repRe(/function recover\(\)\{[^\n]+\}/,
`function recover(){if(!player)return;const src=player.lastSafe||player.pos,n=nearestTrack(src);player.pos.copy(n.p);player.pos.y=sampleTrackSurface(player.pos).y+.18;player.vel.set(0,0,0);player.vy=0;player.airborne=false;player.heading=trackHeading(n.idx);player.g.position.copy(player.pos);player.g.rotation.y=player.heading;wrongWayTime=0;box3dResetCar(player)}`, 'safe recovery');

// Lightweight WebAudio engine layer; created only after a user gesture and reused for the session.
const audioCode=`\nconst AUDIO={ctx:null,osc:null,gain:null};
function initAudio(){if(AUDIO.ctx)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;AUDIO.ctx=new C();AUDIO.osc=AUDIO.ctx.createOscillator();AUDIO.gain=AUDIO.ctx.createGain();AUDIO.osc.type='sawtooth';AUDIO.gain.gain.value=.018;AUDIO.osc.connect(AUDIO.gain).connect(AUDIO.ctx.destination);AUDIO.osc.start()}catch(e){console.warn('Audio init skipped',e)}}
function updateAudio(){if(!AUDIO.ctx||!AUDIO.osc||!player)return;const sp=Math.abs(player.speed||0),active=running&&!paused;AUDIO.osc.frequency.setTargetAtTime(55+sp*6,AUDIO.ctx.currentTime,.035);AUDIO.gain.gain.setTargetAtTime(active?.014+Math.min(.025,sp*.00035):0,AUDIO.ctx.currentTime,.08)}
`;
rep('function start(){',audioCode+'function start(){initAudio();', 'audio startup');

// Optional LAN/WebSocket presentation interface. It is dormant unless ?ws=ws://host:port is supplied.
const netCode=`\nconst NET={ws:null,connected:false,lastSnapshot:0};
function initOptionalNetwork(){const u=new URL(location.href).searchParams.get('ws');if(!u)return;try{const ws=new WebSocket(u);NET.ws=ws;ws.onopen=()=>{NET.connected=true};ws.onclose=()=>{NET.connected=false};ws.onerror=()=>{NET.connected=false};ws.onmessage=e=>{NET.lastSnapshot=performance.now();try{const m=JSON.parse(e.data);if(m.type==='state'&&Array.isArray(m.cars))window.__polygonRushNetworkState=m}catch{}}}catch(e){console.warn('Optional LAN client unavailable',e)}}
function networkTick(){if(!NET.connected||!NET.ws||NET.ws.readyState!==1||!player)return;if((networkTick.t=(networkTick.t||0)+1)%3)return;NET.ws.send(JSON.stringify({type:'input',t:performance.now(),x:player.pos.x,z:player.pos.z,h:player.heading,s:player.speed}))}
initOptionalNetwork();\n`;
rep('function debugText(){',netCode+'function debugText(){', 'optional network interface');

// HUD slow-changing fields at 20Hz-ish, not every rendered frame.
rep(" $('#surface').textContent=r.surface;$('#speed').textContent=Math.round(Math.abs(lv.long)*3.6);$('#gear').textContent=lv.long<-1?'R':Math.abs(lv.long)<1?'N':String(clamp(Math.floor(Math.abs(lv.long)/10)+1,1,6));\n $('#susp').textContent=Math.round((1-player.suspensionDamage)*100)+'%';$('#traction').textContent=player.slip>.28?'SLIDE':player.slip>.14?'LOOSE':'GRIP';\n $('#nitroHud').textContent=Math.round(player.nitro)+'%';$('#healthHud').textContent=Math.round(player.health)+'%';",
` if(++uiFrame%3===0){$('#surface').textContent=r.surface;$('#speed').textContent=Math.round(Math.abs(lv.long)*3.6);$('#gear').textContent=lv.long<-1?'R':Math.abs(lv.long)<1?'N':String(clamp(Math.floor(Math.abs(lv.long)/10)+1,1,6));$('#susp').textContent=Math.round((1-player.suspensionDamage)*100)+'%';$('#traction').textContent=player.slip>.28?'SLIDE':player.slip>.14?'LOOSE':'GRIP';$('#nitroHud').textContent=Math.round(player.nitro)+'%';$('#healthHud').textContent=Math.round(player.health)+'%'};`, 'HUD cadence');

// Lower allocation camera path.
repRe(/function updateCamera\(dt\)\{[^\n]+\}/,
`function updateCamera(dt){if(!player)return;const fwd=SCR.a.set(Math.sin(player.heading),0,Math.cos(player.heading)),target=SCR.b.copy(player.pos);target.y+=1.1;const desired=SCR.c.copy(target).addScaledVector(fwd,-8.5);desired.y+=4.2;cam.position.lerp(desired,1-Math.pow(.00035,dt));const look=SCR.d.copy(target).addScaledVector(fwd,6.2);cam.lookAt(look)}`, 'camera scratch vectors');

// Extend diagnostics with performance, route lookup, pools and optional network state.
rep('FPS: ${fps}\\nSpeed m/s:', 'FPS: ${fps}\\nFrame avg/p95/max ms: ${PERF.frames?(PERF.sum/PERF.frames).toFixed(2):0}/${PERF.p95.toFixed(2)}/${PERF.max.toFixed(2)}\\nPhysics/AI/Render ms: ${PERF.physics.toFixed(2)}/${PERF.ai.toFixed(2)}/${PERF.render.toFixed(2)}\\nRoute queries/candidates/fallbacks: ${trackLookupStats.queries}/${trackLookupStats.candidates}/${trackLookupStats.fallbacks}\\nFX pools dust/exhaust/skid: ${FX.dustPool.length}/${FX.exhaustPool.length}/${FX.skidPool.length}\\nNetwork: ${NET.connected?\'CONNECTED\':\'OFFLINE\'}\\nSpeed m/s:', 'debug telemetry');

// Whole-frame timings and low-power idle/pause rendering. Gameplay remains requestAnimationFrame-driven.
repRe(/function loop\(now\)\{[\s\S]*?\n\}/,
`function loop(now){
 requestAnimationFrame(loop);const frameStart=performance.now(),dt=Math.min(.033,(now-last)/1000||.016);last=now;
 const active=running&&!paused;
 if(active){raceTime+=dt;let t=performance.now();physicsPlayer(dt);PERF.physics=performance.now()-t;t=performance.now();updateAI(dt);PERF.ai=performance.now()-t;if(BOX3D.active){box3dStep(dt);box3dSyncAllCars()}updateCamera(dt);networkTick();updateAudio()}
 updateRacePresentation(dt);updateDust(dt);updateSkids(dt);updateExhaust(dt);
 if(active||now-lastIdleRender>33){const rt=performance.now();renderer.render(scene,cam);PERF.render=performance.now()-rt;lastIdleRender=now}
 const frameMs=performance.now()-frameStart;recordFrame(frameMs);frameCount++;
 if(now-fpsStamp>500){fps=Math.round(frameCount*1000/(now-fpsStamp));frameCount=0;fpsStamp=now;if($('#debug').classList.contains('open'))$('#debug').textContent=debugText()}
}`, 'instrumented loop');

// Avoid double recover on R: respawnPlayer is the authoritative path.
s=s.replace("if(e.code==='KeyR'&&player)respawnPlayer();",'');

s=s.replace('Polygon Rush v14.10 Engineering Pass 3','Polygon Rush v15.0 Consolidated Engineering');
s=s.replace('v14.10 • ENGINEERING PASS 3','v15.0 • CONSOLIDATED ENGINEERING');
s=s.replace('Polygon Rush v14.10\\n','Polygon Rush v15.0\\n');

for(const required of ['three.min.js','Frame avg/p95/max ms','const FX={dustPool:[]','handlingProfile()','Optional LAN client','Polygon Rush v15.0 Consolidated Engineering'])must(s.includes(required),`all-audits validation missing: ${required}`);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.0 consolidated all-audits patch applied');
