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

s=s.replaceAll('Polygon Rush v15.5.1 Wheel Axis Fix','Polygon Rush v15.5.2 Grip + Collision Fix');
s=s.replaceAll('v15.5.1 • WHEEL AXIS FIX','v15.5.2 • GRIP + COLLISION FIX');
s=s.replaceAll("version:'15.5.1'","version:'15.5.2'");

// Stronger but still progressive tire model. More usable lateral authority on asphalt,
// with a soft saturation curve instead of immediately living on the friction limit.
s=s.replace('cornerStiffness:7600, rollingResistance:42, aeroDrag:.46,',
            'cornerStiffness:13200, rollingResistance:46, aeroDrag:.46,');
s=s.replace('steerMax:.58, steerResponse:7.5, yawDamping:1.55,',
            'steerMax:.54, steerResponse:8.5, yawDamping:1.95, gripScale:1.62, lowSpeedGrip:2.4,');
s=s.replace('const maxF=Math.max(1200,normal*(1.15*grip));',
            'const maxF=Math.max(1800,normal*(WHEEL_PHYS.gripScale*grip));');
s=s.replace('let latForce=-vLat*WHEEL_PHYS.cornerStiffness*(front?1.05:.95);',
            'let latForce=-Math.tanh(vLat*0.72)*WHEEL_PHYS.cornerStiffness*(front?1.08:.98);');

// Add a small low-speed lateral stabilizer after total force integration. This removes
// hovercraft drift without preventing high-speed slip or handbrake rotation.
s=s.replace('car.vel.x+=fx/WHEEL_PHYS.mass*dt;car.vel.z+=fz/WHEEL_PHYS.mass*dt;\n car.yawRate+=torqueY/WHEEL_PHYS.inertiaY*dt;',
`car.vel.x+=fx/WHEEL_PHYS.mass*dt;car.vel.z+=fz/WHEEL_PHYS.mass*dt;
 const bodyRightX=Math.cos(car.heading),bodyRightZ=-Math.sin(car.heading);
 const bodyLat=car.vel.x*bodyRightX+car.vel.z*bodyRightZ;
 if(!(controls.handbrake||0)){
  const gripDamp=1-Math.exp(-WHEEL_PHYS.lowSpeedGrip*dt*clamp(1.35-Math.hypot(car.vel.x,car.vel.z)/70,.45,1.25));
  car.vel.x-=bodyRightX*bodyLat*gripDamp;car.vel.z-=bodyRightZ*bodyLat*gripDamp;
 }
 car.yawRate+=torqueY/WHEEL_PHYS.inertiaY*dt;`);

replaceFunction('resolveCarCollision',`function resolveCarCollision(a,b){
 const r=MOVE.collisionRadius;
 for(let iter=0;iter<2;iter++){
  const dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z,d=Math.hypot(dx,dz);if(d<=.0001||d>=r)break;
  const nx=dx/d,nz=dz/d,pen=r-d;
  const invA=1/WHEEL_PHYS.mass,invB=1/WHEEL_PHYS.mass,invSum=invA+invB;
  const correction=Math.max(0,pen-.01)*.88;
  a.pos.x+=nx*correction*(invA/invSum);a.pos.z+=nz*correction*(invA/invSum);
  b.pos.x-=nx*correction*(invB/invSum);b.pos.z-=nz*correction*(invB/invSum);
  const rvx=a.vel.x-b.vel.x,rvz=a.vel.z-b.vel.z,rel=rvx*nx+rvz*nz;
  if(rel<0){
   const restitution=.14,impulse=-(1+restitution)*rel/invSum;
   a.vel.x+=nx*impulse*invA;a.vel.z+=nz*impulse*invA;
   b.vel.x-=nx*impulse*invB;b.vel.z-=nz*impulse*invB;
   const tangentX=-nz,tangentZ=nx,relT=rvx*tangentX+rvz*tangentZ;
   const friction=clamp(-relT/invSum,-Math.abs(impulse)*.42,Math.abs(impulse)*.42);
   a.vel.x+=tangentX*friction*invA;a.vel.z+=tangentZ*friction*invA;
   b.vel.x-=tangentX*friction*invB;b.vel.z-=tangentZ*friction*invB;
   a.yawRate=(a.yawRate||0)+clamp(relT*.018,-.8,.8);b.yawRate=(b.yawRate||0)-clamp(relT*.018,-.8,.8);
   if(iter===0){applyImpactDamage(a,Math.abs(rel)/24,'collision');applyImpactDamage(b,Math.abs(rel)/24,'collision')}
  }
 }
}`);

replaceFunction('resolveWorldCollision',`function resolveWorldCollision(car,obj,radius=1.9,breakable=false){
 if(!obj.visible)return false;
 const dx=car.pos.x-obj.position.x,dz=car.pos.z-obj.position.z,d=Math.hypot(dx,dz);if(d<=.0001||d>radius)return false;
 const nx=dx/d,nz=dz/d,speed=Math.hypot(car.vel.x,car.vel.z);
 if(breakable&&speed>14){obj.visible=false;obj.userData.alive=false;car.vel.multiplyScalar(.88);car.yawRate+=(Math.random()-.5)*.25;applyImpactDamage(car,speed/48,'collision');return true}
 const pen=radius-d;car.pos.x+=nx*(pen+.025);car.pos.z+=nz*(pen+.025);
 const vn=car.vel.x*nx+car.vel.z*nz;
 if(vn<0){
  car.vel.x-=nx*vn*1.24;car.vel.z-=nz*vn*1.24;
  const tx=-nz,tz=nx,vt=car.vel.x*tx+car.vel.z*tz;
  car.vel.x-=tx*vt*.16;car.vel.z-=tz*vt*.16;
  car.yawRate=(car.yawRate||0)+clamp(vt*.018,-.8,.8);
 }
 car.vel.multiplyScalar(.965);applyImpactDamage(car,speed/55,'collision');return true;
}`);

// Player: split movement into two small physics steps and resolve collisions inside each
// step. Sync graphics only after all corrections so collision response is visible now,
// not one frame later.
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
 const controls={throttle,brake,steer,handbrake,nitro},steps=dt>.012?2:1,h=dt/steps;
 let r=null;
 for(let step=0;step<steps;step++){
  r=applyArcadeMovement(player,controls,h);
  for(const ai of ais)resolveCarCollision(player,ai);
  for(const o of destructibles)resolveWorldCollision(player,o,2.1,true);
  for(const b of barriers)resolveWorldCollision(player,b,2.0,true);
 }
 const lv=localVelocity(player),near=nearestTrack(player.pos);nearestIdx=near.idx;
 player.speed=lv.long;player.slip=Math.atan2(Math.abs(lv.lat),Math.abs(lv.long)+.25);
 player.g.position.copy(player.pos);player.g.rotation.y=player.heading;
 animateBuggy(player,lv.long,lv.lat,dt);derivedActions(player,controls,dt,true);
 $('#surface').textContent=r?.surface||terrainType(player.pos);
 $('#speed').textContent=Math.round(Math.abs(lv.long)*3.6);
 $('#gear').textContent=lv.long<-1?'R':Math.abs(lv.long)<1?'N':String(clamp(Math.floor(Math.abs(lv.long)/10)+1,1,6));
 $('#susp').textContent=Math.round((1-player.suspensionDamage)*100)+'%';
 $('#traction').textContent=player.slip>.28?'SLIDE':player.slip>.14?'LOOSE':'GRIP';
 $('#nitroHud').textContent=Math.round(player.nitro)+'%';$('#healthHud').textContent=Math.round(player.health)+'%';
}`);

// AI visual transforms are synchronized after pair collision correction, eliminating
// the same one-frame discrepancy for opponents.
s=s.replace("for(let i=0;i<ais.length;i++)for(let j=i+1;j<ais.length;j++)resolveCarCollision(ais[i],ais[j]);\n}",
`for(let i=0;i<ais.length;i++)for(let j=i+1;j<ais.length;j++)resolveCarCollision(ais[i],ais[j]);
 for(const ai of ais){ai.g.position.copy(ai.pos);ai.g.rotation.y=ai.heading}
}`);

// Runtime self-tests used by CI: lateral grip must kill most sideways velocity, and
// collision resolution must separate overlapping bodies immediately while reversing
// closing normal velocity.
const hook="window.__polygonRush={version:'15.5.2',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
must(s.includes(hook),'diagnostic hook missing');
s=s.replace(hook,hook+`testGrip:()=>{const idx=80,p=trackSamples[idx].clone(),h=trackHeading(idx),c=Math.cos(h),si=Math.sin(h),dummy={pos:p,vel:new THREE.Vector3(9*c+18*si,0,-9*si+18*c),heading:h,speed:0,steer:0,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,vy:0,airborne:false,airTime:0,yawRate:0,g:{userData:{}}};const b=Math.abs(localVelocity(dummy).lat);for(let i=0;i<60;i++)applyArcadeMovement(dummy,{throttle:0,brake:0,steer:0,handbrake:0,nitro:false},1/60);const a=Math.abs(localVelocity(dummy).lat);return {before:b,after:a,ratio:a/Math.max(.001,b)}},testCollision:()=>{const mk=(x,v)=>({pos:new THREE.Vector3(x,0,0),vel:new THREE.Vector3(v,0,0),heading:Math.PI/2,health:100,nitro:0,suspensionDamage:0,engineDamage:0,steeringDamage:0,brakeDamage:0,yawRate:0});const a=mk(-1,8),b=mk(1,-8);const before=Math.abs(a.pos.x-b.pos.x);resolveCarCollision(a,b);const after=Math.abs(a.pos.x-b.pos.x),rel=(a.vel.x-b.vel.x);return {before,after,relativeNormal:rel}},`);

for(const r of ['Polygon Rush v15.5.2 Grip + Collision Fix','cornerStiffness:13200','gripScale:1.62','const controls={throttle,brake,steer,handbrake,nitro},steps=dt>.012?2:1','testGrip:()=>','testCollision:()=>'])must(s.includes(r),'v15.5.2 missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.5.2 grip + collision fix applied');
