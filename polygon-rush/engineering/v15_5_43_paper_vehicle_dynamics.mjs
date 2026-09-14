import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
s=s.replaceAll('Polygon Rush v15.5.42 Grounded Contact + Lighting','Polygon Rush v15.5.43 Vehicle Dynamics Research');
s=s.replaceAll('v15.5.42 • GROUNDED CONTACT + LIGHTING','v15.5.43 • VEHICLE DYNAMICS RESEARCH');
s=s.replaceAll("version:'15.5.42'","version:'15.5.43'");

const anchor='function applyWorldContactImpulse(car,contacts,dt){';
const model=`// Research-derived real-time vehicle dynamics layer: per-wheel normal load, combined slip, friction ellipse, relaxation and anti-roll.\nfunction paperVehicleDynamics(car,contacts,dt,long,lat){\n const mass=car.mass||1180,g=9.81,wheelbase=2.84,track=2.06,cgH=.52,mu=1.18;\n car._paperTires=car._paperTires||Array.from({length:4},()=>({fx:0,fy:0,kappa:0,alpha:0,fz:mass*g/4}));\n const fwd=new THREE.Vector3(Math.sin(car.heading),0,Math.cos(car.heading)),right=new THREE.Vector3(fwd.z,0,-fwd.x);\n const vx=car.vel.x*fwd.x+car.vel.z*fwd.z,vy=car.vel.x*right.x+car.vel.z*right.z;\n const ax=clamp((vx-(car._paperVx??vx))/Math.max(dt,.001),-14,14),ay=clamp((vy-(car._paperVy??vy))/Math.max(dt,.001),-14,14);car._paperVx=vx;car._paperVy=vy;\n const longTransfer=mass*ax*cgH/wheelbase,latTransfer=mass*ay*cgH/track;\n const steer=car._steerAngle||0,omega=car.yawRate||0,frontShare=.52;let sumFx=0,sumFy=0;\n for(let i=0;i<4;i++){const front=i<2,left=i===0||i===2;let fz=mass*g*(front?frontShare:1-frontShare)/2-(front?longTransfer:-longTransfer)/2+(left?-latTransfer:latTransfer)/2;fz=Math.max(80,fz);\n  const wheelVx=Math.max(1.5,Math.abs(vx));const localVy=vy+omega*(front?wheelbase*.48:-wheelbase*.52);const alpha=Math.atan2(localVy,wheelVx)-(front?steer:0);\n  const requestedKappa=clamp(long*(front?.05:.13),-.18,.18),relax=1-Math.exp(-Math.max(3,Math.abs(vx))*dt/1.35);const t=car._paperTires[i];t.kappa+=(requestedKappa-t.kappa)*relax;t.alpha+=(alpha-t.alpha)*relax;\n  const Cx=8.2*fz,Cy=(front?7.4:8.0)*fz;let fx=Cx*t.kappa,fy=-Cy*t.alpha;const cap=mu*fz,usage=Math.hypot(fx/cap,fy/cap);if(usage>1){fx/=usage;fy/=usage}\n  t.fx=fx;t.fy=fy;t.fz=fz;sumFx+=fx;sumFy+=fy;\n }\n // Anti-roll/load-transfer support is force based; no arbitrary body snapping.\n const forceScale=dt/mass;car.vel.x+=(fwd.x*sumFx+right.x*sumFy)*forceScale;car.vel.z+=(fwd.z*sumFx+right.z*sumFy)*forceScale;\n const yawMoment=(car._paperTires[0].fy+car._paperTires[1].fy)*wheelbase*.48-(car._paperTires[2].fy+car._paperTires[3].fy)*wheelbase*.52;car.yawRate+=yawMoment/Math.max(900,mass*2.25)*dt;\n car._paperTelemetry={vx,vy,ax,ay,sumFx,sumFy,loads:car._paperTires.map(t=>t.fz),slip:car._paperTires.map(t=>[t.kappa,t.alpha])};return car._paperTelemetry;\n}\n`;
must(s.includes(anchor),'contact anchor missing');s=s.replace(anchor,model+anchor);

const callAnchor='function updateSuspension(car,dt,long,lat){';
must(s.includes(callAnchor),'suspension anchor missing');s=s.replace(callAnchor,"function updateSuspension(car,dt,long,lat){\n paperVehicleDynamics(car,car.wheelContacts||[],dt,long,lat);");

const diag='groundedContact:()=>({';
must(s.includes(diag),'diagnostic anchor missing');s=s.replace(diag,"paperDynamics:()=>player?player._paperTelemetry||null:null,"+diag);
s+='\n<!-- v15.5.43 SAE/vehicle-dynamics-inspired per-wheel load transfer, combined slip friction ellipse, tire relaxation, force/moment response -->\n';
fs.writeFileSync(file,s);console.log('v15.5.43 research vehicle dynamics applied');