import fs from 'node:fs';

const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');

function replaceOnce(oldText,newText,label){
  if(!s.includes(oldText)) throw new Error(`Pass 2 patch missing target: ${label}`);
  s=s.replace(oldText,newText);
}

// Low-value distant procedural scenery should not enter the shadow map.
replaceOnce('o.position.copy(p);o.position.y=tree?5:3;o.castShadow=true;world.add(o)',
            'o.position.copy(p);o.position.y=tree?5:3;o.castShadow=false;world.add(o)',
            'procedural scenery shadow disable');

// Barriers all use the same immutable appearance; avoid needless material clones.
replaceOnce('b=new THREE.Mesh(new THREE.BoxGeometry(1.8,.8,.32),bmat.clone());',
            'b=new THREE.Mesh(new THREE.BoxGeometry(1.8,.8,.32),bmat);',
            'barrier material sharing');

// The loop duplicated speed/rank HUD work already performed by physics/race presentation.
const duplicate=`  $('#speed').textContent=Math.round(Math.abs(player.speed)*3.6);\n  $('#lap').textContent=Math.min(3,player.lap+1);\n  let progress=nearestIdx/trackSamples.length;\n  const playerRace=player.lap+progress;\n  const rank=1+ais.filter(a=>(a.lap+a.progress)>playerRace).length;\n  $('#pos').textContent=rank;`;
replaceOnce(duplicate,"  $('#lap').textContent=Math.min(3,player.lap+1);",'duplicate speed/rank HUD work');

// Avoid rebuilding a reverse body lookup map for every contact batch.
replaceOnce(" ready:false,active:false,failed:false,module:null,world:0,bodies:new Map(),staticBodies:[],\n accum:0,fixedDt:1/60,subSteps:4,contacts:[],worldBuilt:false,contactHits:0,lastImpact:0",
            " ready:false,active:false,failed:false,module:null,world:0,bodies:new Map(),bodyOwners:new Map(),staticBodies:[],\n accum:0,fixedDt:1/60,subSteps:4,contacts:[],worldBuilt:false,contactHits:0,lastImpact:0",
            'Box3D reverse owner cache');
replaceOnce(' if(id)BOX3D.bodies.set(car,id);',
            ' if(id){BOX3D.bodies.set(car,id);BOX3D.bodyOwners.set(id,car)}',
            'Box3D owner cache create');
replaceOnce(' for(const id of BOX3D.bodies.values())BOX3D.module._pr_b3_destroy_body(BOX3D.world,id);\n BOX3D.bodies.clear();',
            ' for(const id of BOX3D.bodies.values())BOX3D.module._pr_b3_destroy_body(BOX3D.world,id);\n BOX3D.bodies.clear();BOX3D.bodyOwners.clear();',
            'Box3D owner cache clear');
replaceOnce(" const reverse=new Map();for(const [car,id] of BOX3D.bodies.entries())reverse.set(id,car);\n for(const c of BOX3D.contacts){\n  const car=reverse.get(c.bodyA)||reverse.get(c.bodyB);",
            " for(const c of BOX3D.contacts){\n  const car=BOX3D.bodyOwners.get(c.bodyA)||BOX3D.bodyOwners.get(c.bodyB);",
            'contact reverse-map allocation removal');
replaceOnce(' if(id){BOX3D.module._pr_b3_destroy_body(BOX3D.world,id);BOX3D.bodies.delete(car)}',
            ' if(id){BOX3D.module._pr_b3_destroy_body(BOX3D.world,id);BOX3D.bodies.delete(car);BOX3D.bodyOwners.delete(id)}',
            'Box3D owner cache reset');

s=s.replace('Polygon Rush v14.8 Engineering Pass 1','Polygon Rush v14.9 Engineering Pass 2');
s=s.replace('v14.8 • ENGINEERING PASS 1','v14.9 • ENGINEERING PASS 2');
s=s.replace('Polygon Rush v14.8\\n','Polygon Rush v14.9\\n');

for(const required of [
  'o.castShadow=false;world.add(o)',
  'new THREE.BoxGeometry(1.8,.8,.32),bmat)',
  'bodyOwners:new Map()',
  'BOX3D.bodyOwners.get(c.bodyA)',
  'Polygon Rush v14.9 Engineering Pass 2'
]) if(!s.includes(required)) throw new Error(`Pass 2 validation missing: ${required}`);

fs.writeFileSync(file,s);
console.log('Polygon Rush v14.9 Engineering Pass 2 patch applied');
