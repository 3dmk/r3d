import fs from 'node:fs';
const file=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replaceAll('Polygon Rush v16.0.2 Wheel + Chassis Balance','Polygon Rush v16.0.3 Working Vehicle Restore');
s=s.replaceAll('v16.0.2 WHEEL + CHASSIS BALANCE','v16.0.3 WORKING VEHICLE RESTORE');
s=s.replaceAll('v16.0.2 • LARGER WHEELS • LIGHTER CHASSIS • FREE ROAM','v16.0.3 • WORKING PHYSICS RESTORED • LARGER VISUAL WHEELS');
s=s.replace("const VERSION='16.0.2'","const VERSION='16.0.3'");

// Keep the larger visual wheels, but restore the proven v16.0.1 physical geometry.
const oldCar="const CAR={width:1.84,length:4.28,height:1.08,wheelBase:2.72,track:1.66,wheelRadius:.47,bodyFloor:.42};";
const newCar="const CAR={width:1.84,length:4.28,height:1.08,wheelBase:2.72,track:1.66,wheelRadius:.47,bodyFloor:.42,physicsTrack:1.62,physicsWheelRadius:.39};";
must(s.includes(oldCar),'CAR v16.0.2 config missing');
s=s.replace(oldCar,newCar);

// Restore the complete last-working v16.0.1 dynamic/controller tune.
const pStart=/const P=\{mass:980,[\s\S]*?chassisHalf:new THREE\.Vector3\(CAR\.width\*\.5,\.53,CAR\.length\*\.5\)\};/;
must(pStart.test(s),'v16.0.2 physics block missing');
s=s.replace(pStart,"const P={mass:1180,inertia:new THREE.Vector3(1380,2180,1540),wheelBase:2.72,track:CAR.physicsTrack,wheelRadius:CAR.physicsWheelRadius,suspensionRest:.46,suspensionTravel:.30,springK:30000,damperC:4600,tireMu:1.30,cornerStiffness:8.8,longStiffness:7.2,engineForce:9200,brakeForce:13000,handbrakeForce:7000,steerMax:.60,steerRate:4.8,aeroDrag:.34,rolling:34,chassisHalf:new THREE.Vector3(CAR.width*.5,.60,CAR.length*.5)};");

// Restore working spawn/contact reference height and suspension presentation.
s=s.replaceAll("car.pos.set(0,1.16,8)","car.pos.set(0,1.05,8)");
s=s.replace("const car={pos:new THREE.Vector3(0,1.16,8)","const car={pos:new THREE.Vector3(0,1.05,8)");
s=s.replace("local.y=.47;","local.y=.38;");

// Visual wheel mounts remain larger visually, without rewriting physical tire radius.
// Wheel visual center stays slightly higher to fit the 0.47m visual tire.
s=s.replace("const mounts=[[-CAR.track/2,.47,CAR.wheelBase/2],[CAR.track/2,.47,CAR.wheelBase/2],[-CAR.track/2,.47,-CAR.wheelBase/2],[CAR.track/2,.47,-CAR.wheelBase/2]];","const mounts=[[-CAR.track/2,.47,CAR.wheelBase/2],[CAR.track/2,.47,CAR.wheelBase/2],[-CAR.track/2,.47,-CAR.wheelBase/2],[CAR.track/2,.47,-CAR.wheelBase/2]];");

// Diagnostics make the visual/physical split explicit.
s=s.replace("wheelRadius:CAR.wheelRadius,mass:P.mass","visualWheelRadius:CAR.wheelRadius,physicsWheelRadius:P.wheelRadius,mass:P.mass");
s=s.replace("visualCollisionMatched:true,obbAabbCollision:true","visualCollisionMatched:true,obbAabbCollision:true,workingVehicleTuneRestored:true");

s += '\n<!-- v16.0.3 regression repair: v16.0.1 physics/controller restored exactly; larger wheels remain visual-only -->\n';
for(const x of ["VERSION='16.0.3'","mass:1180","springK:30000","engineForce:9200","physicsWheelRadius:.39","workingVehicleTuneRestored:true"])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);
console.log('v16.0.3 working vehicle restore applied');
