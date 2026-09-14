import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

s=s.replace('Polygon Rush v15.5.33 Acceleration Response','Polygon Rush v15.5.34 Free Roam Production Art');
s=s.replace('v15.5.33 • ACCELERATION RESPONSE','v15.5.34 • FREE ROAM PRODUCTION ART');
s=s.replaceAll("version:'15.5.33'","version:'15.5.34'");
s=s.replace(/<select id="track">[\s\S]*?<\/select>/,'<select id="track"><option value="freeroam" selected>FREE ROAM • PRODUCTION MAP</option></select>');
s=s.replace('>START RACE</button>','>START FREE ROAM</button>');
s=s.replaceAll("buildWorld($('#track').value)","buildWorld('freeroam')");
s=s.replaceAll("buildWorld('coast')","buildWorld('freeroam')");

const art=`
function decorateFreeRoamProduction(){
 if(!freeRoamMode&&$('#track')?.value!=='freeroam')return;
 const old=world.getObjectByName('freeRoamProductionArt');if(old)world.remove(old);
 const g=new THREE.Group();g.name='freeRoamProductionArt';world.add(g);
 const mat=(color,rough=.82,metal=.04)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
 const bark=mat(0x6b4a32,.95,.01),leafA=mat(0x4f7a45,.9,0),leafB=mat(0x6b9151,.88,0),rockM=mat(0x73766f,.92,.02),dark=mat(0x24272a,.78,.12),rubber=mat(0x17191b,.98,0),paint=mat(0xc8503f,.58,.10),cream=mat(0xe2d2aa,.72,.02),steel=mat(0x6f7880,.42,.62),glass=mat(0x86bdd0,.18,.08);
 const shadow=o=>o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
 const tree=(x,z,sc=1)=>{const q=new THREE.Group();q.position.set(x,freeRoamSurfaceY({x,z}),z);const t=new THREE.Mesh(new THREE.CylinderGeometry(.34*sc,.48*sc,4.4*sc,7),bark);t.position.y=2.2*sc;q.add(t);for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.ConeGeometry((2.15-i*.28)*sc,(3.6-i*.25)*sc,8),i%2?leafB:leafA);c.position.y=(4.25+i*1.25)*sc;c.rotation.y=i*.6;q.add(c)}shadow(q);g.add(q)};
 const rock=(x,z,sc=1)=>{const r=new THREE.Mesh(new THREE.IcosahedronGeometry(1.35*sc,1),rockM);r.position.set(x,freeRoamSurfaceY({x,z})+.72*sc,z);r.scale.set(1.35,.72,1.0);r.rotation.set(.12,(x+z)*.07,.08);shadow(r);g.add(r)};
 const tireStack=(x,z,n=4)=>{const q=new THREE.Group();q.position.set(x,freeRoamSurfaceY({x,z}),z);for(let i=0;i<n;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.74,.22,8,18),rubber);t.rotation.x=Math.PI/2;t.position.y=.22+i*.36;q.add(t)}shadow(q);g.add(q)};
 const lamp=(x,z)=>{const q=new THREE.Group();q.position.set(x,freeRoamSurfaceY({x,z}),z);const p=new THREE.Mesh(new THREE.CylinderGeometry(.10,.13,6.3,10),steel);p.position.y=3.15;q.add(p);const h=new THREE.Mesh(new THREE.SphereGeometry(.32,10,8),cream);h.position.set(.42,6.0,0);q.add(h);const a=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.9,8),steel);a.rotation.z=Math.PI/2;a.position.set(.24,5.95,0);q.add(a);shadow(q);g.add(q)};
 const sign=(x,z,labelColor=0xffc857)=>{const q=new THREE.Group();q.position.set(x,freeRoamSurfaceY({x,z}),z);const p1=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,2.6,8),steel),p2=p1.clone();p1.position.set(-1.15,1.3,0);p2.position.set(1.15,1.3,0);q.add(p1,p2);const b=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.0,.16),mat(labelColor,.55,.08));b.position.y=2.5;q.add(b);shadow(q);g.add(q)};
 const workshop=()=>{const q=new THREE.Group();q.position.set(48,freeRoamSurfaceY({x:48,z:44}),44);const base=new THREE.Mesh(new THREE.BoxGeometry(24,.5,15),mat(0x676b63,.95,.02));base.position.y=.25;q.add(base);const body=new THREE.Mesh(new THREE.BoxGeometry(18,6.4,11),cream);body.position.set(0,3.4,0);q.add(body);const roof=new THREE.Mesh(new THREE.CylinderGeometry(7.2,7.2,18,4,1,false,Math.PI/4,Math.PI),dark);roof.rotation.z=Math.PI/2;roof.position.y=7.0;roof.scale.z=.78;q.add(roof);for(const x of [-5.2,0,5.2]){const d=new THREE.Mesh(new THREE.BoxGeometry(4.2,3.7,.22),dark);d.position.set(x,2.2,-5.62);q.add(d)}const win=new THREE.Mesh(new THREE.BoxGeometry(5.2,1.7,.18),glass);win.position.set(0,4.9,5.58);q.add(win);for(let i=0;i<5;i++){const boll=new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,1.0,10),paint);boll.position.set(-8+i*4,.5,-8.2);q.add(boll)}shadow(q);g.add(q)};
 workshop();
 [[-118,-94],[-102,-74],[-87,-112],[-66,-91],[-43,-118],[-126,-25],[-112,8],[-132,46],[-108,82],[-85,112],[87,-126],[112,-96],[126,-58],[118,-18],[132,28],[111,72],[91,108],[58,126],[-38,126],[-72,112]].forEach((p,i)=>tree(p[0],p[1],.85+(i%4)*.09));
 [[-72,-52],[-58,-39],[-44,-58],[68,-63],[83,-48],[96,-70],[-92,61],[-76,78],[73,74],[91,84],[24,116],[-18,109]].forEach((p,i)=>rock(p[0],p[1],.8+(i%3)*.25));
 [[34,24,4],[40,24,5],[46,24,3],[-52,32,4],[-58,32,5]].forEach(p=>tireStack(p[0],p[1],p[2]));
 [[32,58],[48,58],[64,58],[-28,-18],[-28,-42]].forEach(p=>lamp(p[0],p[1]));
 sign(0,18);sign(-70,-14,0x72c9e8);sign(78,18,0xd96c50);
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=148+(i%2)*8;rock(Math.cos(a)*r,Math.sin(a)*r,.65+(i%4)*.08)}
 scene.fog=new THREE.Fog(0xb8d3df,125,430);scene.background=new THREE.Color(0xb8d3df);renderer.toneMappingExposure=1.0;
 const warm=new THREE.PointLight(0xffc477,8,42,2);warm.position.set(48,8,38);warm.castShadow=false;g.add(warm);
 g.userData.productionArt=true;g.userData.modelCount=g.children.length;
}
`;
const anchor="window.addEventListener('keydown'";
must(s.includes(anchor),'event anchor missing');s=s.replace(anchor,art+'\n'+anchor);

s=s.replace("$('#box3dHud').textContent='WHEEL PHYSICS';\n  window.__polygonRush={","$('#box3dHud').textContent='WHEEL PHYSICS';\n  if(freeRoamMode)decorateFreeRoamProduction();\n  window.__polygonRush={");
s=s.replaceAll("buildWorld('freeroam');cam.position","buildWorld('freeroam');decorateFreeRoamProduction();cam.position");
s=s.replace("window.__polygonRush={version:'15.5.29',boot:true","window.__polygonRush={version:'15.5.34',boot:true");

s+='\n<!-- v15.5.34 free-roam-only stylized-pbr production-art -->\n';
for(const x of ['v15.5.34','FREE ROAM • PRODUCTION MAP','decorateFreeRoamProduction','freeRoamProductionArt'])must(s.includes(x),'missing '+x);
fs.writeFileSync(file,s);console.log('v15.5.34 Free Roam only art pass applied');
