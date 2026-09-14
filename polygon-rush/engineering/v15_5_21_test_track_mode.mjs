import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const replaceFunction=(name,newCode)=>{
 const start=s.indexOf(`function ${name}(`);must(start>=0,`missing ${name}`);
 let i=s.indexOf('{',start),depth=0,end=-1;
 for(;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'&&--depth===0){end=i+1;break}}
 must(end>start,`unterminated ${name}`);s=s.slice(0,start)+newCode+s.slice(end);
};

const worldOpt='<option value="alpine">Alpine Skyway</option>';
must(s.includes(worldOpt)||s.includes('value="test"'),'world selector anchor missing');
if(!s.includes('value="test"'))s=s.replace(worldOpt,worldOpt+'<option value="test">TEST TRACK • PHYSICS LAB</option>');

const zoneAnchor='const zones={coast:{sky:0x8dcde1,ground:0x73ad71,road:0x343c42,accent:0xffd166},forest:{sky:0x88b5c6,ground:0x4d774d,road:0x343a3d,accent:0xffbd5c},canyon:{sky:0xdabf99,ground:0xc7834d,road:0x443e39,accent:0x6ce0d6},neon:{sky:0x17263c,ground:0x243341,road:0x1a2027,accent:0xff5fd2},alpine:{sky:0xaed2e0,ground:0xb8c5c9,road:0x394147,accent:0xff716b}};';
must(s.includes(zoneAnchor)||s.includes('zones.test='),'zones anchor missing');
if(!s.includes('zones.test='))s=s.replace(zoneAnchor,zoneAnchor+'\nzones.test={sky:0xa9c4d2,ground:0x66705f,road:0x30363a,accent:0xffc857};');

const globals='let curve,trackSamples=[],running=false,paused=false,last=performance.now(),keys={},player=null,ais=[],raceTime=0,frameCount=0,fps=0,fpsStamp=performance.now(),nearestIdx=0,lapGate=false,countdown=0,raceStarted=false,finished=false,checkpoint=0,cameraShake=0,wrongWayTime=0,pickups=[],barriers=[];';
must(s.includes(globals)||s.includes('let testMode=false'),'global state anchor missing');
if(!s.includes('let testMode=false'))s=s.replace(globals,globals+'\nlet testMode=false;');

const trackGen='trackSamples=[];const N=260;for(let i=0;i<N;i++){const a=i/N*TAU,r=115+17*Math.sin(a*3)+8*Math.sin(a*5+1.1),x=Math.cos(a)*r,zp=Math.sin(a)*r,y=1.25+2.4*Math.sin(a*2-.4)+1.15*Math.sin(a*5+.8);trackSamples.push(new THREE.Vector3(x,y,zp))}';
must(s.includes(trackGen)||s.includes("if(name==='test')"),'track generation anchor missing');
if(!s.includes("if(name==='test')"))s=s.replace(trackGen,`trackSamples=[];const N=260;
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

const testFns=`function addTestCourseFeatures(){
 const addBox=(x,y,z,sx,sy,sz,color=0xffc857,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshStandardMaterial({color,roughness:.82}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;world.add(m);if(solid)barriers.push(m);return m};
 const addRamp=(x,z,rot=0,w=7,h=1.4,l=12)=>{const r=addBox(x,.35,z,w,h,l,0x6b7278,false);r.rotation.x=-.12;r.rotation.y=rot;return r};
 for(let i=0;i<10;i++)addBox(-46+(i%2?5:-5),.8,-72+i*13,1.1,1.6,1.1,0xff7a59,true);
 for(let i=0;i<7;i++)addBox(54+i*3.1,.9,-28,1.7,1.8,1.7,0xe35d6a,true);
 addBox(73,.9,-19,2.2,1.8,9,0xf5a65b,true);addBox(73,.9,-3,2.2,1.8,9,0xf5a65b,true);
 addRamp(-77,35,.18,8,1.8,13);addRamp(-49,59,-.12,7,1.3,10);addRamp(-20,72,.05,9,2.0,14);
 addBox(20,.8,66,2,1.6,18,0x99a3ad,true);addBox(35,.8,51,2,1.6,18,0x99a3ad,true);addBox(48,.8,35,2,1.6,18,0x99a3ad,true);
 for(let i=0;i<14;i++){const a=i*.83,r=16+(i%4)*4;addBox(10+Math.cos(a)*r,.7,-5+Math.sin(a)*r,1.6+(i%3),1.4,1.6+(i%2)*1.4,0x7f8b94,true)}
 for(let i=0;i<8;i++){addBox(-105+i*14,.55,-104,.55,1.1,.55,0x62cfff,false);addBox(-105+i*14,.55,-94,.55,1.1,.55,0x62cfff,false)}
}
function setTestHud(active){
 for(const id of ['pos','lap','gateHud']){const e=$('#'+id);if(e&&e.closest('.hud'))e.closest('.hud').style.display=active?'none':''}
 if(active){$('#raceBanner').textContent='TEST TRACK • FREE DRIVE';$('#msg').textContent='';}
}
`;
if(!s.includes('function addTestCourseFeatures()')){
 const startPos=s.indexOf('function start(){');must(startPos>=0,'start function missing');
 s=s.slice(0,startPos)+testFns+s.slice(startPos);
}
replaceFunction('start',`function start(){const worldName=$('#track').value;testMode=worldName==='test';buildWorld(worldName);if(testMode)addTestCourseFeatures();spawn();if(testMode){for(const ai of ais){if(ai?.g)carsG.remove(ai.g)}ais=[];raceStarted=true;finished=false;countdown=0;checkpoint=0;}running=true;paused=false;raceTime=0;$('#menu').style.display='none';$('#hud').style.display='flex';setTestHud(testMode);if(!testMode){$('#msg').textContent='GO!';setTimeout(()=>$('#msg').textContent='',700)}else{$('#msg').textContent='TEST TRACK';setTimeout(()=>{if(testMode)$('#msg').textContent=''},700)}}`);

const presentation='function updateRacePresentation(dt){\n if(!running)return;';
must(s.includes(presentation)||s.includes("if(testMode){\n  raceStarted=true;finished=false;"),'race presentation anchor missing');
if(!s.includes("if(testMode){\n  raceStarted=true;finished=false;"))s=s.replace(presentation,`function updateRacePresentation(dt){
 if(!running)return;
 if(testMode){
  raceStarted=true;finished=false;
  $('#raceBanner').textContent='TEST TRACK • FREE DRIVE';
  $('#healthHud').textContent=Math.round(player?.health||0)+'%';
  if(player&&player.health<=0){respawnPlayer();player.health=100;}
  cameraShake=Math.max(0,cameraShake-dt*2.8);
  return;
 }`);

if(!s.includes('if(!testMode)updateAI(dt);')){
 const aiPattern=/([\t ]*)updateAI\(dt\);/;
 must(aiPattern.test(s),'AI loop anchor missing');
 s=s.replace(aiPattern,'$1if(!testMode)updateAI(dt);');
}

const quitOld="$('#quit').onclick=()=>{running=false;paused=false;$('#pause').style.display='none';$('#hud').style.display='none';$('#menu').style.display='block';buildWorld($('#track').value);cam.position.set(0,165,205);cam.lookAt(0,0,0)};";
if(s.includes(quitOld))s=s.replace(quitOld,"$('#quit').onclick=()=>{running=false;paused=false;testMode=false;setTestHud(false);$('#pause').style.display='none';$('#hud').style.display='none';$('#menu').style.display='block';buildWorld($('#track').value);cam.position.set(0,165,205);cam.lookAt(0,0,0)};");
else must(s.includes('testMode=false;setTestHud(false);'),'quit anchor missing');

if(!s.includes('test-track-mode single-player'))s+='\n<!-- test-track-mode single-player free-drive no-laps no-finish slalom jumps elevation braking obstacles -->\n';
for(const r of ['TEST TRACK • PHYSICS LAB','let testMode=false','function addTestCourseFeatures()','TEST TRACK • FREE DRIVE','if(!testMode)updateAI(dt)','test-track-mode single-player'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush dedicated single-player test track mode applied');
