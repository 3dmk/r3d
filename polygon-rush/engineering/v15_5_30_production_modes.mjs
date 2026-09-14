import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(x,m)=>{if(!s.includes(x))throw new Error(m)};
const one=(a,b,m)=>{must(a,m||('missing '+a));s=s.replace(a,b)};

for(const [a,b] of [
 ['Polygon Rush v15.5.29 Steer Under Power','Polygon Rush v15.5.30 Test + Free Roam'],
 ['v15.5.29 • STEER UNDER POWER','v15.5.30 • TEST + FREE ROAM'],
 ["version:'15.5.29'","version:'15.5.30'"]
]) one(a,b);

one('<option value="alpine">Alpine Skyway</option>','<option value="alpine">Alpine Skyway</option><option value="test">TEST TRACK • PHYSICS LAB</option><option value="freeroam">FREE ROAM • DEMO COURSE</option>');

const zone='const zones={coast:{sky:0x8dcde1,ground:0x73ad71,road:0x343c42,accent:0xffd166},forest:{sky:0x88b5c6,ground:0x4d774d,road:0x343a3d,accent:0xffbd5c},canyon:{sky:0xdabf99,ground:0xc7834d,road:0x443e39,accent:0x6ce0d6},neon:{sky:0x17263c,ground:0x243341,road:0x1a2027,accent:0xff5fd2},alpine:{sky:0xaed2e0,ground:0xb8c5c9,road:0x394147,accent:0xff716b}};';
one(zone,zone+'\nzones.test={sky:0xa9c4d2,ground:0x66705f,road:0x30363a,accent:0xffc857};\nzones.freeroam={sky:0xb8d3df,ground:0x7d806b,road:0x34383b,accent:0xffbf55};');

const globals='let curve,trackSamples=[],running=false,paused=false,last=performance.now(),keys={},player=null,ais=[],raceTime=0,frameCount=0,fps=0,fpsStamp=performance.now(),nearestIdx=0,lapGate=false,countdown=0,raceStarted=false,finished=false,checkpoint=0,cameraShake=0,wrongWayTime=0,pickups=[],barriers=[];';
one(globals,globals+'\nlet testMode=false,freeRoamMode=false;');

const gen='trackSamples=[];const N=260;for(let i=0;i<N;i++){const a=i/N*TAU,r=115+17*Math.sin(a*3)+8*Math.sin(a*5+1.1),x=Math.cos(a)*r,zp=Math.sin(a)*r,y=1.25+2.4*Math.sin(a*2-.4)+1.15*Math.sin(a*5+.8);trackSamples.push(new THREE.Vector3(x,y,zp))}';
one(gen,`trackSamples=[];const N=260;
if(name==='test'){
 for(let i=0;i<N;i++){const a=i/N*TAU,x=132*Math.cos(a)+34*Math.sin(a*2)-18*Math.sin(a*5),zp=92*Math.sin(a)+24*Math.sin(a*3)+10*Math.cos(a*6);let y=.9+1.1*Math.sin(a*2);if(a>1.08&&a<1.62)y+=7*Math.sin((a-1.08)/.54*Math.PI);if(a>3.55&&a<4.18)y+=4.5*Math.sin((a-3.55)/.63*Math.PI);if(a>5.10&&a<5.58)y-=2.2*Math.sin((a-5.10)/.48*Math.PI);trackSamples.push(new THREE.Vector3(x,y,zp))}
}else{for(let i=0;i<N;i++){const a=i/N*TAU,r=115+17*Math.sin(a*3)+8*Math.sin(a*5+1.1),x=Math.cos(a)*r,zp=Math.sin(a)*r,y=1.25+2.4*Math.sin(a*2-.4)+1.15*Math.sin(a*5+.8);trackSamples.push(new THREE.Vector3(x,y,zp))}}`);

one('world.add(ground);trackSamples=[];const N=260;',`world.add(ground);
if(name==='freeroam'){trackSamples=[];const N=260;for(let i=0;i<N;i++){const a=i/N*TAU;trackSamples.push(new THREE.Vector3(Math.cos(a)*245,-.28,Math.sin(a)*245))}curve=new THREE.CatmullRomCurve3([...trackSamples,trackSamples[0]],true,'catmullrom',.08);return;}
trackSamples=[];const N=260;`);

one('function terrainType(pos){',`function freeRoamSurfaceY(pos){let y=-.28,x=pos.x,z=pos.z;if(x>-110&&x<-55&&z>-28&&z<28){const u=clamp((x+110)/55,0,1);y+=Math.sin(u*Math.PI)*(z/28)*2.6}if(x>-32&&x<28&&z>38&&z<86){const u=clamp((x+32)/60,0,1),v=clamp((z-38)/48,0,1);y+=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*(u-.5)*4.4}if(x>42&&x<112&&z>-92&&z<-52){const e=Math.sin(clamp((x-42)/70,0,1)*Math.PI);y+=e*(.34+.26*Math.sin((x-42)*.55))}if(x>-18&&x<18&&z>-112&&z<-66){const side=1-Math.abs(x)/18,run=clamp((-66-z)/46,0,1);y+=Math.max(0,side)*Math.sin(run*Math.PI*.5)*4.2}if(x>48&&x<98&&z>48&&z<96){const u=(x-48)/50,v=(z-48)/48;y+=Math.sin(u*Math.PI*4)*Math.sin(v*Math.PI*3)*.48}if(x>-105&&x<-45&&z<-70&&z>-112){const v=clamp((z+112)/42,0,1);y-=Math.sin(v*Math.PI)*1.15}return y}
function freeRoamTerrainType(pos){const x=pos.x,z=pos.z;if(x>42&&x<112&&z>-92&&z<-52)return 'DIRT';if(x>48&&x<98&&z>48&&z<96)return 'ROUGH';if(x>-30&&x<32&&z>-20&&z<24)return 'ASPHALT';return 'SHOULDER'}
function terrainType(pos){if(freeRoamMode)return freeRoamTerrainType(pos);`);
one('function sampleTrackSurface(pos){',`function sampleTrackSurface(pos){if(freeRoamMode){const type=freeRoamTerrainType(pos),near=nearestTrack(pos),y=freeRoamSurfaceY(pos);return {y,near,lateral:0,type,grip:terrainGrip(type)}}`);

const helpers=`function addTestCourseFeatures(){
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.82}),addBox=(x,y,z,sx,sy,sz,c=0xffc857,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;world.add(m);if(solid)barriers.push(m);return m};
 for(let i=0;i<10;i++)addBox(-46+(i%2?5:-5),.8,-72+i*13,1.1,1.6,1.1,0xff7a59,true);for(let i=0;i<7;i++)addBox(54+i*3.1,.9,-28,1.7,1.8,1.7,0xe35d6a,true);addBox(73,.9,-19,2.2,1.8,9,0xf5a65b,true);addBox(73,.9,-3,2.2,1.8,9,0xf5a65b,true);for(const q of [[-77,35,.18,8,1.8,13],[-49,59,-.12,7,1.3,10],[-20,72,.05,9,2,14]]){const r=addBox(q[0],.35,q[1],q[3],q[4],q[5],0x6b7278,false);r.rotation.x=-.12;r.rotation.y=q[2]}for(let i=0;i<14;i++){const a=i*.83,r=16+(i%4)*4;addBox(10+Math.cos(a)*r,.7,-5+Math.sin(a)*r,1.6+(i%3),1.4,1.6+(i%2)*1.4,0x7f8b94,true)}
}
function addFreeRoamCourseFeatures(){
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.86,metalness:.04}),addBox=(x,y,z,sx,sy,sz,c=0x8a8f87,rx=0,ry=0,rz=0,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(c));m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;world.add(m);if(solid)barriers.push(m);return m};
 addBox(0,-.34,0,64,.12,48,0x555a56,0,0,0,false);addBox(-82,1.05,0,46,.35,18,0x8e927f,0,0,.20,false);addBox(0,1,63,42,.34,28,0x7f857c,.10,.28,-.16,false);addBox(72,.65,72,44,.34,32,0x777d73,.06,-.22,.11,false);addBox(0,.75,-90,20,.45,28,0x6d746e,-.18,0,0,false);addBox(0,.20,-123,30,.30,16,0x737a73,.04,0,0,false);for(let r=0;r<4;r++)for(let c=0;c<5;c++)addBox(55+c*9,-.03+(r+c)%2*.38,54+r*10,5,.55,5,(r+c)%2?0x676e66:0x858b82,0,(r+c)%2?.10:-.10,(r-c)*.018,false);for(let i=0;i<9;i++)if(i!==3&&i!==6)addBox(72+i*5.2,.55,-12,3.4,1.7,1.4,0xb06e55,0,.15*(i%2?1:-1),0,true)
}
function setCourseHud(active,label=''){for(const id of ['pos','lap','gateHud']){const e=$('#'+id);if(e&&e.closest('.hud'))e.closest('.hud').style.display=active?'none':''}if(active){$('#raceBanner').textContent=label;$('#msg').textContent=''}}
function ensureCourseMenuOptions(){const sel=$('#track');if(!sel)return false;for(const [v,t] of [['test','TEST TRACK • PHYSICS LAB'],['freeroam','FREE ROAM • DEMO COURSE']]){let o=[...sel.options].find(x=>x.value===v);if(!o){o=document.createElement('option');o.value=v;sel.appendChild(o)}o.textContent=t}return [...sel.options].some(o=>o.value==='test')&&[...sel.options].some(o=>o.value==='freeroam')}
ensureCourseMenuOptions();setTimeout(ensureCourseMenuOptions,0);
`;
const sp=s.indexOf('function start(){');if(sp<0)throw new Error('start missing');s=s.slice(0,sp)+helpers+s.slice(sp);

one("function start(){\n const menu=$('#menu'),hud=$('#hud'),msg=$('#msg');\n try{\n  buildWorld($('#track').value||'coast');spawn();", "function start(){\n const menu=$('#menu'),hud=$('#hud'),msg=$('#msg');\n const worldName=$('#track').value||'coast';testMode=worldName==='test';freeRoamMode=worldName==='freeroam';\n try{\n  buildWorld(worldName);if(testMode)addTestCourseFeatures();if(freeRoamMode)addFreeRoamCourseFeatures();spawn();if(testMode||freeRoamMode){for(const ai of ais){if(ai?.g)carsG.remove(ai.g)}ais=[];}if(freeRoamMode&&player){player.pos.set(0,freeRoamSurfaceY({x:0,z:8})+.78,8);player.heading=0;player.vel.set(0,0,0);player.lastSafe=player.pos.clone();player.g.position.copy(player.pos);player.g.rotation.y=0;}");
one('keys={};running=true;paused=false;raceTime=0;raceStarted=false;finished=false;countdown=3.2;lapGate=false;wrongWayTime=0;','keys={};running=true;paused=false;raceTime=0;raceStarted=(testMode||freeRoamMode);finished=false;countdown=(testMode||freeRoamMode)?0:3.2;lapGate=false;wrongWayTime=0;setCourseHud(testMode||freeRoamMode,freeRoamMode?\'FREE ROAM • DEMO COURSE\':testMode?\'TEST TRACK • FREE DRIVE\':\'\');');
one('function updateRacePresentation(dt){\n if(!running)return;','function updateRacePresentation(dt){\n if(!running)return;\n if(testMode||freeRoamMode){raceStarted=true;finished=false;$(\'#raceBanner\').textContent=freeRoamMode?\'FREE ROAM • DEMO COURSE\':\'TEST TRACK • FREE DRIVE\';$(\'#healthHud\').textContent=Math.round(player?.health||0)+\'%\';cameraShake=Math.max(0,cameraShake-dt*2.8);return;}');
one('if(raceStarted&&!finished)updateAI(dt);','if(raceStarted&&!finished&&!testMode&&!freeRoamMode)updateAI(dt);');
one("$('#quit').onclick=()=>{running=false;paused=false;$('#pause').style.display='none';","$('#quit').onclick=()=>{running=false;paused=false;testMode=false;freeRoamMode=false;setCourseHud(false);$('#pause').style.display='none';");

const hook="window.__polygonRush={version:'15.5.30',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
one(hook,hook+"testCourseMenu:()=>{ensureCourseMenuOptions();const values=[...$('#track').options].map(o=>o.value);return {values,ok:values.includes('test')&&values.includes('freeroam')}},modeState:()=>({testMode,freeRoamMode,aiCount:ais.length,banner:$('#raceBanner').textContent,player:[player?.pos.x||0,player?.pos.y||0,player?.pos.z||0],surface:player?terrainType(player.pos):null}),");
s+='\n<!-- v15.5.30 production-modes test-track freeroam menu-self-heal -->\n';
for(const r of ['TEST TRACK • PHYSICS LAB','FREE ROAM • DEMO COURSE','function addTestCourseFeatures()','function addFreeRoamCourseFeatures()','testCourseMenu:()=>','modeState:()=>'])must(r,'missing '+r);
fs.writeFileSync(file,s);
fs.writeFileSync('polygon-rush/production/VERSION.txt','Polygon Rush v15.5.30 Test + Free Roam\n');
console.log('v15.5.30 production modes migrated');
