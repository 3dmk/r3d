import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
const rep=(a,b,l)=>{must(s.includes(a),`remaining patch missing ${l}`);s=s.replace(a,b)};
const repRe=(r,b,l)=>{must(r.test(s),`remaining regex missing ${l}`);s=s.replace(r,b)};

// Shared immutable car geometry cache. clear() skips these reusable assets.
rep("function clear(g){while(g.children.length){const o=g.children.pop();o.traverse?.(n=>{n.geometry?.dispose?.();if(n.material){if(Array.isArray(n.material))n.material.forEach(m=>m.dispose());else n.material.dispose?.()}})}}",
`function clear(g){while(g.children.length){const o=g.children.pop();o.traverse?.(n=>{if(n.geometry&&!n.geometry.userData?.shared)n.geometry.dispose?.();if(n.material){const ms=Array.isArray(n.material)?n.material:[n.material];for(const m of ms)if(!m.userData?.shared)m.dispose?.()}})}}
const SHARED_GEO=new Map();
function sharedGeo(k,make){let g=SHARED_GEO.get(k);if(!g){g=make();g.userData.shared=true;SHARED_GEO.set(k,g)}return g}
`, 'shared clear/cache');
const geoRepls=[
 ["new THREE.BoxGeometry(2.15,.22,3.15)","sharedGeo('skid',()=>new THREE.BoxGeometry(2.15,.22,3.15))"],
 ["new THREE.BoxGeometry(2.38,.58,3.25)","sharedGeo('tub',()=>new THREE.BoxGeometry(2.38,.58,3.25))"],
 ["new THREE.BoxGeometry(2.12,.42,1.32)","sharedGeo('nose',()=>new THREE.BoxGeometry(2.12,.42,1.32))"],
 ["new THREE.BoxGeometry(1.58,.58,1.45)","sharedGeo('cabin',()=>new THREE.BoxGeometry(1.58,.58,1.45))"],
 ["new THREE.BoxGeometry(1.92,.32,.95)","sharedGeo('rearDeck',()=>new THREE.BoxGeometry(1.92,.32,.95))"],
 ["new THREE.BoxGeometry(2.7,.18,.24)","sharedGeo('bash',()=>new THREE.BoxGeometry(2.7,.18,.24))"],
 ["new THREE.BoxGeometry(1.45,.16,.18)","sharedGeo('lightbar',()=>new THREE.BoxGeometry(1.45,.16,.18))"],
 ["new THREE.SphereGeometry(.11,8,6)","sharedGeo('lamp',()=>new THREE.SphereGeometry(.11,8,6))"],
 ["new THREE.CylinderGeometry(.58,.58,.42,16)","sharedGeo('tire',()=>new THREE.CylinderGeometry(.58,.58,.42,16))"],
 ["new THREE.CylinderGeometry(.31,.31,.44,12)","sharedGeo('rim',()=>new THREE.CylinderGeometry(.31,.31,.44,12))"],
 ["new THREE.TorusGeometry(.48,.16,8,16)","sharedGeo('spare',()=>new THREE.TorusGeometry(.48,.16,8,16))"],
 ["new THREE.BoxGeometry(.32,.18,.10)","sharedGeo('rearLight',()=>new THREE.BoxGeometry(.32,.18,.10))"],
 ["new THREE.BoxGeometry(.18,.12,.08)","sharedGeo('reverseLight',()=>new THREE.BoxGeometry(.18,.12,.08))"]
];
for(const [a,b] of geoRepls){must(s.includes(a),`car geometry target ${a}`);s=s.replaceAll(a,b)}

// Collapse decorative far scenery into one instanced draw call per world.
repRe(/for\(let i=0;i<85;i\+\+\)\{const a=Math\.random\(\)\*TAU,r=150\+Math\.random\(\)\*205,p=new THREE\.Vector3\(Math\.cos\(a\)\*r,0,Math\.sin\(a\)\*r\),tree=name==='forest'\|\|name==='alpine',geo=tree\?new THREE\.ConeGeometry\(3\+Math\.random\(\)\*2\.5,9\+Math\.random\(\)\*10,6\):new THREE\.DodecahedronGeometry\(2\.5\+Math\.random\(\)\*5,0\),mat=new THREE\.MeshStandardMaterial\(\{color:name==='canyon'\?0x8a684e:name==='neon'\?0x314257:0x356c46,roughness:1\}\),o=new THREE\.Mesh\(geo,mat\);o\.position\.copy\(p\);o\.position\.y=tree\?5:3;o\.castShadow=false;world\.add\(o\)\}/,
`{const tree=name==='forest'||name==='alpine',geo=tree?new THREE.ConeGeometry(1,1,6):new THREE.DodecahedronGeometry(1,0),mat=new THREE.MeshStandardMaterial({color:name==='canyon'?0x8a684e:name==='neon'?0x314257:0x356c46,roughness:1}),inst=new THREE.InstancedMesh(geo,mat,85),dummy=new THREE.Object3D();inst.castShadow=false;for(let i=0;i<85;i++){const a=Math.random()*TAU,r=150+Math.random()*205;dummy.position.set(Math.cos(a)*r,tree?5:3,Math.sin(a)*r);if(tree)dummy.scale.set(3+Math.random()*2.5,9+Math.random()*10,3+Math.random()*2.5);else dummy.scale.setScalar(2.5+Math.random()*5);dummy.rotation.y=Math.random()*TAU;dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)}inst.instanceMatrix.needsUpdate=true;world.add(inst)}`,
'instanced scenery');

// Touch controls for phones/tablets; they feed the same authoritative key/input path.
const touch=`\nfunction installTouchControls(){if(!matchMedia('(pointer:coarse)').matches)return;const wrap=document.createElement('div');wrap.id='touchControls';wrap.style.cssText='position:fixed;z-index:22;inset:auto 8px 12px 8px;display:flex;justify-content:space-between;pointer-events:none';wrap.innerHTML='<div style="display:grid;grid-template-columns:64px 64px;gap:8px"><button data-k="KeyA">◀</button><button data-k="KeyD">▶</button></div><div style="display:grid;grid-template-columns:64px 64px;gap:8px"><button data-k="Space">DRIFT</button><button data-k="ShiftLeft">NITRO</button><button data-k="KeyS">BRAKE</button><button data-k="KeyW">GO</button></div>';for(const b of wrap.querySelectorAll('button')){b.style.cssText='height:56px;opacity:.62;pointer-events:auto;touch-action:none';const k=b.dataset.k,on=e=>{e.preventDefault();keys[k]=true},off=e=>{e.preventDefault();keys[k]=false};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)}document.body.appendChild(wrap)}\ninstallTouchControls();\n`;
rep("window.addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});",
 touch+"window.addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});", 'touch controls');

// Conservative automatic quality/thermal controller: only adjusts pixel ratio, with hysteresis and a floor.
const quality=`\nconst QUALITY={ratio:Math.min(devicePixelRatio,1.25),cool:0};
function updateQuality(){if(PERF.samples.length<120)return;const p=PERF.p95;if(p>24&&QUALITY.ratio>.82){QUALITY.cool++;if(QUALITY.cool>4){QUALITY.ratio=Math.max(.82,QUALITY.ratio-.08);renderer.setPixelRatio(QUALITY.ratio);renderer.setSize(innerWidth,innerHeight);QUALITY.cool=0}}else if(p<15&&QUALITY.ratio<Math.min(devicePixelRatio,1.25)){QUALITY.cool--;if(QUALITY.cool<-10){QUALITY.ratio=Math.min(Math.min(devicePixelRatio,1.25),QUALITY.ratio+.05);renderer.setPixelRatio(QUALITY.ratio);renderer.setSize(innerWidth,innerHeight);QUALITY.cool=0}}else QUALITY.cool=0}\n`;
rep('function loop(now){',quality+'function loop(now){', 'quality controller');
rep("if(now-fpsStamp>500){fps=Math.round(frameCount*1000/(now-fpsStamp));frameCount=0;fpsStamp=now;if($('#debug').classList.contains('open'))$('#debug').textContent=debugText()}",
"if(now-fpsStamp>500){fps=Math.round(frameCount*1000/(now-fpsStamp));frameCount=0;fpsStamp=now;updateQuality();if($('#debug').classList.contains('open'))$('#debug').textContent=debugText()}", 'quality invocation');

// Network snapshot interpolation hook; inactive unless an optional LAN/WebSocket host provides state packets.
rep("if(m.type==='state'&&Array.isArray(m.cars))window.__polygonRushNetworkState=m",
"if(m.type==='state'&&Array.isArray(m.cars)){NET.prev=NET.next||m;NET.next=m;NET.nextAt=performance.now();window.__polygonRushNetworkState=m}", 'network snapshot cache');
rep('function networkTick(){',
`function applyNetworkPresentation(){if(!NET.connected||!NET.next||!Array.isArray(NET.next.cars))return;const alpha=Math.min(1,(performance.now()-(NET.nextAt||0))/100);for(let i=0;i<Math.min(ais.length,NET.next.cars.length);i++){const n=NET.next.cars[i];if(!n)continue;const a=ais[i];if(Number.isFinite(n.x)&&Number.isFinite(n.z)){a.g.position.x+=(n.x-a.g.position.x)*alpha;a.g.position.z+=(n.z-a.g.position.z)*alpha}if(Number.isFinite(n.h))a.g.rotation.y+=wrapAngle(n.h-a.g.rotation.y)*alpha}}
function networkTick(){`, 'network interpolation');
rep('updateCamera(dt);networkTick();updateAudio()', 'updateCamera(dt);networkTick();applyNetworkPresentation();updateAudio()', 'network presentation loop');

// Diagnostics expose adaptive quality and mobile/network state.
rep('Network: ${NET.connected?\'CONNECTED\':\'OFFLINE\'}\\nSpeed m/s:',
'Network: ${NET.connected?\'CONNECTED\':\'OFFLINE\'}\\nPixel ratio: ${QUALITY.ratio.toFixed(2)}\\nTouch controls: ${matchMedia(\'(pointer:coarse)\').matches?\'ON\':\'OFF\'}\\nSpeed m/s:', 'quality/touch diagnostics');

for(const r of ['sharedGeo(\'tire\'','new THREE.InstancedMesh','installTouchControls','function updateQuality()','function applyNetworkPresentation()'])must(s.includes(r),`remaining validation ${r}`);
fs.writeFileSync(file,s);
console.log('Polygon Rush v15.0 remaining audit implementations applied');
