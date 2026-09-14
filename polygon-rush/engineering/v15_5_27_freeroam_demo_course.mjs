import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

const opt='<option value="test">TEST TRACK • PHYSICS LAB</option>';
must(s.includes(opt),'test option anchor missing');
s=s.replace(opt,opt+'<option value="freeroam">FREE ROAM • DEMO COURSE</option>');

must(s.includes('zones.test={sky:0xa9c4d2,ground:0x66705f,road:0x30363a,accent:0xffc857};'),'test zone anchor missing');
s=s.replace('zones.test={sky:0xa9c4d2,ground:0x66705f,road:0x30363a,accent:0xffc857};','zones.test={sky:0xa9c4d2,ground:0x66705f,road:0x30363a,accent:0xffc857};\nzones.freeroam={sky:0xb8d3df,ground:0x7d806b,road:0x34383b,accent:0xffbf55};');

must(s.includes('let testMode=false;'),'mode anchor missing');
s=s.replace('let testMode=false;','let testMode=false,freeRoamMode=false;');

const clearAnchor='world.add(ground);trackSamples=[];const N=260;';
must(s.includes(clearAnchor),'buildWorld ground anchor missing');
s=s.replace(clearAnchor,`world.add(ground);
if(name==='freeroam'){
 trackSamples=[];const N=260;
 for(let i=0;i<N;i++){const a=i/N*TAU;trackSamples.push(new THREE.Vector3(Math.cos(a)*245,-.28,Math.sin(a)*245))}
 curve=new THREE.CatmullRomCurve3([...trackSamples,trackSamples[0]],true,'catmullrom',.08);
 return;
}
trackSamples=[];const N=260;`);

const terrainAnchor='function terrainType(pos){';
must(s.includes(terrainAnchor),'terrainType anchor missing');
s=s.replace(terrainAnchor,`function freeRoamSurfaceY(pos){
 let y=-.28;
 const x=pos.x,z=pos.z;
 // Long side-slope bank.
 if(x>-110&&x<-55&&z>-28&&z<28){const u=clamp((x+110)/55,0,1),edge=Math.sin(u*Math.PI);y+=edge*((z/28)*2.6);}
 // Diagonal off-camber pad.
 if(x>-32&&x<28&&z>38&&z<86){const u=clamp((x+32)/60,0,1),v=clamp((z-38)/48,0,1);y+=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*(u-.5)*4.4;}
 // Whoops / corrugation strip.
 if(x>42&&x<112&&z>-92&&z<-52){const e=Math.sin(clamp((x-42)/70,0,1)*Math.PI);y+=e*(.34+.26*Math.sin((x-42)*.55));}
 // Progressive jump/ramp mound.
 if(x>-18&&x<18&&z>-112&&z<-66){const side=1-Math.abs(x)/18,run=clamp((-66-z)/46,0,1);y+=Math.max(0,side)*Math.sin(run*Math.PI*.5)*4.2;}
 // Articulation pit with alternating diagonals.
 if(x>48&&x<98&&z>48&&z<96){const u=(x-48)/50,v=(z-48)/48;y+=(Math.sin(u*Math.PI*4)*Math.sin(v*Math.PI*3))*.48;}
 // Shallow ditch and crest.
 if(x>-105&&x<-45&&z<-70&&z>-112){const v=clamp((z+112)/42,0,1);y-=Math.sin(v*Math.PI)*1.15;}
 return y;
}
function freeRoamTerrainType(pos){
 const x=pos.x,z=pos.z;
 if(x>42&&x<112&&z>-92&&z<-52)return 'DIRT';
 if(x>48&&x<98&&z>48&&z<96)return 'ROUGH';
 if(x>-30&&x<32&&z>-20&&z<24)return 'ASPHALT';
 return 'SHOULDER';
}
function terrainType(pos){if(freeRoamMode)return freeRoamTerrainType(pos);`);

const sampleAnchor='function sampleTrackSurface(pos){';
must(s.includes(sampleAnchor),'sampleTrackSurface anchor missing');
s=s.replace(sampleAnchor,`function sampleTrackSurface(pos){
 if(freeRoamMode){const type=freeRoamTerrainType(pos),near=nearestTrack(pos),y=freeRoamSurfaceY(pos);return {y,near,lateral:0,type,grip:terrainGrip(type)};}`);

const addTestEnd='function setTestHud(active){';
must(s.includes(addTestEnd),'test helper anchor missing');
const freeFns=`function addFreeRoamCourseFeatures(){
 const mat=(color,rough=.86)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.04});
 const addBox=(x,y,z,sx,sy,sz,color=0x8a8f87,rx=0,ry=0,rz=0,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(color));m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;world.add(m);if(solid)barriers.push(m);return m};
 const addCone=(x,z,r=.55,h=1.5,color=0xff7a59)=>{const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,10),mat(color));m.position.set(x,-.28+h*.5,z);world.add(m);return m};
 // Central neutral setup pad - not a road, just a flat traction/reference area.
 addBox(0,-.34,0,64,.12,48,0x555a56,0,0,0,false);
 // Angled / banked slabs for chassis, wheel-contact and rollover testing.
 addBox(-82,1.05,0,46,.35,18,0x8e927f,0,0,.20,false);
 addBox(0,1.0,63,42,.34,28,0x7f857c,.10,.28,-.16,false);
 addBox(72,.65,72,44,.34,32,0x777d73,.06,-.22,.11,false);
 // Ramp and landing blocks.
 addBox(0,.75,-90,20,.45,28,0x6d746e,-.18,0,0,false);
 addBox(0,.20,-123,30,.30,16,0x737a73,.04,0,0,false);
 // Narrow balance beams / offset platforms.
 addBox(-118,.38,72,8,.50,36,0x8d8878,.06,.18,.08,true);
 addBox(-98,.58,101,7,.50,30,0x8d8878,-.07,-.25,-.10,true);
 // Rock / block obstacle yard with varied angles.
 for(let i=0;i<18;i++){const a=i*.91,r=18+(i%5)*5,x=8+Math.cos(a)*r,z=8+Math.sin(a)*r;addBox(x,.28,z,1.8+(i%3)*.8,1.2+(i%2)*.7,1.8+((i+1)%3)*.7,0x756f64,(i%4-.5)*.07,a*.37,(i%3-1)*.08,true)}
 // Slalom cones across open dirt.
 for(let i=0;i<14;i++)addCone(-10+(i%2?5:-5),-42+i*6.4,.48,1.35,0xff824f);
 // Alternating cross-axle articulation blocks.
 for(let r=0;r<4;r++)for(let c=0;c<5;c++)addBox(55+c*9,-.03+(r+c)%2*.38,54+r*10,5,.55,5,(r+c)%2?0x676e66:0x858b82,0,(r+c)%2?.10:-.10,(r-c)*.018,false);
 // Braking / collision wall array with gaps.
 for(let i=0;i<9;i++)if(i!==3&&i!==6)addBox(72+i*5.2,.55,-12,3.4,1.7,1.4,0xb06e55,0,.15*(i%2?1:-1),0,true);
 // Open-space pylons marking approximate outer limits only.
 for(const [x,z] of [[-145,-125],[145,-125],[-145,125],[145,125]])for(let j=0;j<3;j++)addCone(x+(j-1)*2,z,.7,2.1,0x62cfff);
}
`;
s=s.replace(addTestEnd,freeFns+addTestEnd);

const oldStart=`function start(){const worldName=$('#track').value;testMode=worldName==='test';buildWorld(worldName);if(testMode)addTestCourseFeatures();spawn();if(testMode){for(const ai of ais){if(ai?.g)carsG.remove(ai.g)}ais=[];raceStarted=true;finished=false;countdown=0;checkpoint=0;}running=true;paused=false;raceTime=0;$('#menu').style.display='none';$('#hud').style.display='flex';setTestHud(testMode);if(!testMode){$('#msg').textContent='GO!';setTimeout(()=>$('#msg').textContent='',700)}else{$('#msg').textContent='TEST TRACK';setTimeout(()=>{if(testMode)$('#msg').textContent=''},700)}}`;
must(s.includes(oldStart),'start function anchor missing');
s=s.replace(oldStart,`function start(){const worldName=$('#track').value;testMode=worldName==='test';freeRoamMode=worldName==='freeroam';buildWorld(worldName);if(testMode)addTestCourseFeatures();if(freeRoamMode)addFreeRoamCourseFeatures();spawn();if(testMode||freeRoamMode){for(const ai of ais){if(ai?.g)carsG.remove(ai.g)}ais=[];raceStarted=true;finished=false;countdown=0;checkpoint=0;}if(freeRoamMode&&player){player.pos.set(0,freeRoamSurfaceY({x:0,z:0})+.78,8);player.heading=0;player.vel.set(0,0,0);player.lastSafe=player.pos.clone();player.g.position.copy(player.pos);player.g.rotation.y=0;}running=true;paused=false;raceTime=0;$('#menu').style.display='none';$('#hud').style.display='flex';setTestHud(testMode||freeRoamMode);if(!testMode&&!freeRoamMode){$('#msg').textContent='GO!';setTimeout(()=>$('#msg').textContent='',700)}else{$('#raceBanner').textContent=freeRoamMode?'FREE ROAM • DEMO COURSE':'TEST TRACK • FREE DRIVE';$('#msg').textContent=freeRoamMode?'FREE ROAM':'TEST TRACK';setTimeout(()=>{if(testMode||freeRoamMode)$('#msg').textContent=''},700)}}`);

must(s.includes('if(testMode){\n  raceStarted=true;finished=false;'),'presentation test anchor missing');
s=s.replace('if(testMode){\n  raceStarted=true;finished=false;','if(testMode||freeRoamMode){\n  raceStarted=true;finished=false;');
s=s.replace("$('#raceBanner').textContent='TEST TRACK • FREE DRIVE';","$('#raceBanner').textContent=freeRoamMode?'FREE ROAM • DEMO COURSE':'TEST TRACK • FREE DRIVE';");
s=s.replace('if(!testMode)updateAI(dt);','if(!testMode&&!freeRoamMode)updateAI(dt);');
s=s.replace('testMode=false;setTestHud(false);','testMode=false;freeRoamMode=false;setTestHud(false);');

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
if(s.includes(hook))s=s.replace(hook,hook+`testFreeRoamCourse:()=>{const pts=[{x:-82,z:0},{x:0,z:63},{x:72,z:72},{x:0,z:-90},{x:72,z:-70},{x:70,z:70}],ys=pts.map(p=>freeRoamSurfaceY(p));return {points:ys,hasRelief:Math.max(...ys)-Math.min(...ys)>1,modeOption:s=>true}},`);

s+='\n<!-- freeroam-demo-course no-road open-terrain banked-slabs ramps whoops articulation obstacles -->\n';
for(const r of ['FREE ROAM • DEMO COURSE','freeRoamMode=false','function freeRoamSurfaceY','function addFreeRoamCourseFeatures','freeroam-demo-course'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush free-roam demo proving ground applied');
