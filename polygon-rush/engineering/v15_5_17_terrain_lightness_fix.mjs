import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(x,m)=>{if(!x)throw new Error(m)};
const replaceFunction=(name,newCode)=>{
 const start=s.indexOf(`function ${name}(`);must(start>=0,`missing ${name}`);
 let i=s.indexOf('{',start),depth=0,end=-1;
 for(;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'&&--depth===0){end=i+1;break}}
 must(end>start,`unterminated ${name}`);s=s.slice(0,start)+newCode+s.slice(end);
};

replaceFunction('sampleTrackSurface',`function sampleTrackSurface(pos){
 const near=nearestTrack(pos),N=trackSamples.length,i=near.idx,p=trackSamples[i],n=trackSamples[(i+1)%N],
       prev=trackSamples[(i-1+N)%N],tx=n.x-prev.x,tz=n.z-prev.z,l=Math.hypot(tx,tz)||1,
       rx=tz/l,rz=-tx/l,dx=pos.x-p.x,dz=pos.z-p.z,lateral=dx*rx+dz*rz;
 const shoulder=Math.abs(lateral),type=terrainType(pos),worldFloorY=-.28,trackSurfaceY=p.y+.175;
 let y=trackSurfaceY;
 if(shoulder>9&&shoulder<=15.4)y=trackSurfaceY-clamp((shoulder-9)*.045,0,.30);
 else if(shoulder>15.4&&shoulder<20){
  const edgeY=trackSurfaceY-.30,t=clamp((shoulder-15.4)/4.6,0,1);
  y=edgeY+(worldFloorY-edgeY)*(t*t*(3-2*t));
 }else if(shoulder>=20)y=worldFloorY;
 const amp=type==='ASPHALT'?.018:type==='SHOULDER'?.045:type==='DIRT'?.075:.028;
 const bump=(Math.sin(pos.x*.21)+Math.cos(pos.z*.17)+Math.sin((pos.x+pos.z)*.11))*amp;
 y+=bump;
 if(type==='ROUGH')y=Math.max(worldFloorY,y);
 return {y,near,lateral,type,grip:terrainGrip(type)};
}`);

must(/rollingResistance:[0-9.]+/.test(s),'rolling resistance missing');
s=s.replace(/rollingResistance:[0-9.]+/,'rollingResistance:27');
must(/aeroDrag:[0-9.]+/.test(s),'aero drag missing');
s=s.replace(/aeroDrag:[0-9.]+/,'aeroDrag:.36');

const physMarker='physicsHz:180,';
must(s.includes(physMarker),'physics config marker missing');
s=s.replace(physMarker,'physicsHz:180, responseMassScale:.84, terrainFloorY:-.28,');

const accel=' const ax=fx/mass,az=fz/mass;car.vel.x+=ax*dt;car.vel.z+=az*dt;';
must(s.includes(accel),'acceleration integration anchor missing');
s=s.replace(accel,' const responseMass=mass*WHEEL_PHYS.responseMassScale,ax=fx/responseMass,az=fz/responseMass;car.vel.x+=ax*dt;car.vel.z+=az*dt;');

s+='\n<!-- terrain-contact-fix worldFloorY=-.28 responseMassScale:.84 rollingResistance:27 aeroDrag:.36 -->\n';
for(const r of ['worldFloorY=-.28','responseMassScale:.84','rollingResistance:27','aeroDrag:.36'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.17 terrain contact + lighter response fix applied');
