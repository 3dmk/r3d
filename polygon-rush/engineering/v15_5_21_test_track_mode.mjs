import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

// Add a dedicated test level to the world selector.
const worldOpt='<option value="alpine">Alpine Skyway</option>';
must(s.includes(worldOpt),'world selector anchor missing');
s=s.replace(worldOpt,worldOpt+'<option value="test">TEST TRACK • PHYSICS LAB</option>');

// Test world palette.
const zoneAnchor='const zones={coast:{sky:0x8dcde1,ground:0x73ad71,road:0x343c42,accent:0xffd166},forest:{sky:0x88b5c6,ground:0x4d774d,road:0x343a3d,accent:0xffbd5c},canyon:{sky:0xdabf99,ground:0xc7834d,road:0x443e39,accent:0x6ce0d6},neon:{sky:0x17263c,ground:0x243341,road:0x1a2027,accent:0xff5fd2},alpine:{sky:0xaed2e0,ground:0xb8c5c9,road:0x394147,accent:0xff716b}};';
must(s.includes(zoneAnchor),'zones anchor missing');
s=s.replace(zoneAnchor,zoneAnchor+'\nzones.test={sky:0xa9c4d2,ground:0x66705f,road:0x30363a,accent:0xffc857};');

// Track dedicated mode state.
const globals='let curve,trackSamples=[],running=false,paused=false,last=performance.now(),keys={},player=null,ais=[],raceTime=0,frameCount=0,fps=0,fpsStamp=performance.now(),nearestIdx=0,lapGate=false,countdown=0,raceStarted=false,finished=false,checkpoint=0,cameraShake=0,wrongWayTime=0,pickups=[],barriers=[];';
must(s.includes(globals),'global state anchor missing');
s=s.replace(globals,globals+'\nlet testMode=false;');

// Replace the procedural loop only for the test world with a proving-ground style closed route.
const trackGen='trackSamples=[];const N=260;for(let i=0;i<N;i++){const a=i/N*TAU,r=115+17*Math.sin(a*3)+8*Math.sin(a*5+1.1),x=Math.cos(a)*r,zp=Math.sin(a)*r,y=1.25+2.4*Math.sin(a*2-.4)+1.15*Math.sin(a*5+.8);trackSamples.push(new THREE.Vector3(x,y,zp))}';
must(s.includes(trackGen),'track generation anchor missing');
s=s.replace(trackGen,`trackSamples=[];const N=260;
if(name==='test'){
 for(let i=0;i<N;i++){
  const a=i/N*TAU;
  const x=132*Math.cos(a)+34*Math.sin(a*2)-18*Math.sin(a*5);
  const zp=92*Math.sin(a)+24*Math.sin(a*3)+10*Math.cos(a*6);
  let y=.9+1.1*Math.sin(a*2);
  if(a>1.08&&a<1.62)y+=7*Math.sin((a-1.08)/.54*Math.PI);
  if(a>3.55&&a<4.18)y+=4.5*Math.sin((a-3.55)/.63*Math.PI);
  if(a>5.10&&a<5.58)y-=2.2*Math.sin((a-5.10)/.48*Math.PI);
  trackSamples.push(new THREE.Vector3(x,y,zp));
 }
}else{
 for(let i=0;i<N;i++){const a=i/N*TAU,r=115+17*Math.sin(a*3)+8*Math.sin(a*5+1.1),x=Math.cos(a)*r,zp=Math.sin(a)*r,y=1.25+2.4*Math.sin(a*2-.4)+1.15*Math.sin(a*5+.8);trackSamples.push(new THREE.Vector3(x,y,zp))}
}`);

// Add explicit proving-ground obstacles after the normal world has been built.
const startAnchor='function start(){buildWorld($(\'#track\').value);spawn();running=true;paused=false;raceTime=0;$(\'#menu\').style.display=\'none\';$(\'#hud\').style.display=\'flex\';$(\'#msg\').textContent=\'GO!\';setTimeout(()=>$(\'#msg\').textContent=\'\',700)}';
must(s.includes(startAnchor),'start anchor missing');
const testFns=`function addTestCourseFeatures(){
 const addBox=(x,y,z,sx,sy,sz,color=0xffc857,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshStandardMaterial({color,roughness:.82}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;world.add(m);if(solid)barriers.push(m);return m};
 const addRamp=(x,z,rot=0,w=7,h=1.4,l=12)=>{const r=addBox(x,.35,z,w,h,l,0x6b7278,false);r.rotation.x=-.12;r.rotation.y=rot;return r};
 // Slalom / lane-change test.
 for(let i=0;i<10;i++)addBox(-46+(i%2?5:-5),.8,-72+i*13,1.1,1.6,1.1,0xff7a59,true);
 // Braking wall and offset avoidance gates.
 for(let i=0;i<7;i++)addBox(54+i*3.1,.9,-28,1.7,1.8,1.7,0xe35d6a,true);
 addBox(73,.9,-19,2.2,1.8,9,0xf5a65b,true);addBox(73,.9,-3,2.2,1.8,9,0xf5a65b,true);
 // Jump sequence.
 addRamp(-77,35,.18,8,1.8,13);addRamp(-49,59,-.12,7,1.3,10);addRamp(-20,72,.05,9,2.0,14);
 // Narrow chicane walls.
 addBox(20,.8,66,2,1.6,18,0x99a3ad,true);addBox(35,.8,51,2,1.6,18,0x99a3ad,true);addBox(48,.8,35,2,1.6,18,0x99a3ad,true);
 // Collision/obstacle yard.
 for(let i=0;i<14;i++){const a=i*.83,r=16+(i%4)*4;addBox(10+Math.cos(a)*r,.7,-5+Math.sin(a)*r,1.6+(i%3),1.4,1.6+(i%2)*1.4,0x7f8b94,true)}
 // Speed markers / long-straight reference pylons.
 for(let i=0;i<8;i++){addBox(-105+i*14,.55,-104,.55,1.1,.55,0x62cfff,false);addBox(-105+i*14,.55,-94,.55,1.1,.55,0x62cfff,false)}
}
function setTestHud(active){
 for(const id of ['pos','lap','gateHud']){const e=$('#'+id);if(e&&e.closest('.hud'))e.closest('.hud').style.display=active?'none':''}
 if(active){$('#raceBanner').textContent='TEST TRACK • FREE DRIVE';$('#msg').textContent='';}
}
`;
const newStart=`${testFns}function start(){const worldName=$('#track').value;testMode=worldName==='test';buildWorld(worldName);if(testMode)addTestCourseFeatures();spawn();if(testMode){for(const ai of ais){if(ai?.g)carsG.remove(ai.g)}ais=[];raceStarted=true;finished=false;countdown=0;checkpoint=0;}running=true;paused=false;raceTime=0;$('#menu').style.display='none';$('#hud').style.display='flex';setTestHud(testMode);if(!testMode){$('#msg').textContent='GO!';setTimeout(()=>$('#msg').textContent='',700)}else{$('#msg').textContent='TEST TRACK';setTimeout(()=>{if(testMode)$('#msg').textContent=''},700)}}`;
s=s.replace(startAnchor,newStart);

// Disable race progression / finish logic in test mode while preserving health feedback.
const presentation='function updateRacePresentation(dt){\n if(!running)return;';
must(s.includes(presentation),'race presentation anchor missing');
s=s.replace(presentation,`function updateRacePresentation(dt){
 if(!running)return;
 if(testMode){
  raceStarted=true;finished=false;
  $('#raceBanner').textContent='TEST TRACK • FREE DRIVE';
  $('#healthHud').textContent=Math.round(player?.health||0)+'%';
  if(player&&player.health<=0){respawnPlayer();player.health=100;}
  cameraShake=Math.max(0,cameraShake-dt*2.8);
  return;
 }`);

// Test mode does not run AI.
const aiCall='  updateAI(dt);';
must(s.includes(aiCall),'AI loop anchor missing');
s=s.replace(aiCall,"  if(!testMode)updateAI(dt);");

// Quit restores normal HUD visibility.
const quitAnchor="$('#quit').onclick=()=>{running=false;paused=false;$('#pause').style.display='none';$('#hud').style.display='none';$('#menu').style.display='block';buildWorld($('#track').value);cam.position.set(0,165,205);cam.lookAt(0,0,0)};";
must(s.includes(quitAnchor),'quit anchor missing');
s=s.replace(quitAnchor,"$('#quit').onclick=()=>{running=false;paused=false;testMode=false;setTestHud(false);$('#pause').style.display='none';$('#hud').style.display='none';$('#menu').style.display='block';buildWorld($('#track').value);cam.position.set(0,165,205);cam.lookAt(0,0,0)};");

s+='\n<!-- test-track-mode single-player free-drive no-laps no-finish slalom jumps elevation braking obstacles -->\n';
for(const r of ['TEST TRACK • PHYSICS LAB','let testMode=false','function addTestCourseFeatures()','TEST TRACK • FREE DRIVE','if(!testMode)updateAI(dt)','test-track-mode single-player'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush dedicated single-player test track mode applied');
