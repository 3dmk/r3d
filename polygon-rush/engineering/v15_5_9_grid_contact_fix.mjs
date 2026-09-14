import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

must(s.includes('Polygon Rush v15.5.9 Force Wheel Contact'),'v15.5.9 base missing');
s=s.replaceAll('gridIdx=[250,251,253,254]','gridIdx=[252,254,256,258]');

const hook="window.__polygonRush={version:'15.5.9',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testPlayerDrive:()=>{const oldStarted=raceStarted,oldFinished=finished,oldKeys={...keys};raceStarted=true;finished=false;keys.KeyW=true;keys.ArrowUp=false;keys.KeyS=false;keys.ArrowDown=false;keys.KeyA=false;keys.KeyD=false;const x0=player.pos.x,z0=player.pos.z;for(let i=0;i<120;i++)physicsPlayer(1/60);keys=oldKeys;raceStarted=oldStarted;finished=oldFinished;return {distance:Math.hypot(player.pos.x-x0,player.pos.z-z0),speed:Math.abs(player.speed||0),force:player._forceTelemetry?.totalLong||0,slip:player.slip||0}},`);

for(const r of ['gridIdx=[252,254,256,258]','testPlayerDrive:()=>'])must(s.includes(r),'grid contact fix missing '+r);
fs.writeFileSync(file,s);console.log('Polygon Rush v15.5.9 grid contact fix applied');
