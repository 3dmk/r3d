import fs from 'node:fs';

const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');

function replaceOnce(oldText,newText,label){
  if(!s.includes(oldText)) throw new Error(`Pass 3 patch missing target: ${label}`);
  s=s.replace(oldText,newText);
}

const oldNearest="function nearestTrack(pos){let best=1e9,bi=0;for(let i=0;i<trackSamples.length;i++){const p=trackSamples[i],dx=pos.x-p.x,dz=pos.z-p.z,d=dx*dx+dz*dz;if(d<best){best=d;bi=i}}return{idx:bi,dist:Math.sqrt(best),p:trackSamples[bi]}}";
const newNearest=`const TRACK_CELL=24,trackSpatial=new Map(),trackLookupStats={queries:0,candidates:0,fallbacks:0};
function trackCellKey(cx,cz){return cx+','+cz}
function rebuildTrackSpatial(){
 trackSpatial.clear();trackLookupStats.queries=0;trackLookupStats.candidates=0;trackLookupStats.fallbacks=0;
 for(let i=0;i<trackSamples.length;i++){
  const p=trackSamples[i],cx=Math.floor(p.x/TRACK_CELL),cz=Math.floor(p.z/TRACK_CELL),k=trackCellKey(cx,cz);
  let bucket=trackSpatial.get(k);if(!bucket){bucket=[];trackSpatial.set(k,bucket)}bucket.push(i)
 }
}
function nearestTrack(pos){
 trackLookupStats.queries++;
 let best=1e9,bi=0,tested=0;
 const cx=Math.floor(pos.x/TRACK_CELL),cz=Math.floor(pos.z/TRACK_CELL);
 for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
  const bucket=trackSpatial.get(trackCellKey(cx+dx,cz+dz));if(!bucket)continue;
  for(const i of bucket){const p=trackSamples[i],ox=pos.x-p.x,oz=pos.z-p.z,d=ox*ox+oz*oz;tested++;if(d<best){best=d;bi=i}}
 }
 trackLookupStats.candidates+=tested;
 if(!tested||best>TRACK_CELL*TRACK_CELL*4){
  trackLookupStats.fallbacks++;
  best=1e9;bi=0;
  for(let i=0;i<trackSamples.length;i++){const p=trackSamples[i],ox=pos.x-p.x,oz=pos.z-p.z,d=ox*ox+oz*oz;if(d<best){best=d;bi=i}}
 }
 return{idx:bi,dist:Math.sqrt(best),p:trackSamples[bi]}
}`;
replaceOnce(oldNearest,newNearest,'nearestTrack spatial index');

replaceOnce('trackSamples.push(new THREE.Vector3(x,y,zp))}curve=',
            'trackSamples.push(new THREE.Vector3(x,y,zp))}rebuildTrackSpatial();curve=',
            'track spatial rebuild');

s=s.replace('Polygon Rush v14.9 Engineering Pass 2','Polygon Rush v14.10 Engineering Pass 3');
s=s.replace('v14.9 • ENGINEERING PASS 2','v14.10 • ENGINEERING PASS 3');
s=s.replace('Polygon Rush v14.9\\n','Polygon Rush v14.10\\n');

for(const required of [
  'const TRACK_CELL=24',
  'function rebuildTrackSpatial()',
  'trackLookupStats.fallbacks++',
  'rebuildTrackSpatial();curve=',
  'Polygon Rush v14.10 Engineering Pass 3'
]) if(!s.includes(required)) throw new Error(`Pass 3 validation missing: ${required}`);

fs.writeFileSync(file,s);
console.log('Polygon Rush v14.10 Engineering Pass 3 patch applied');
