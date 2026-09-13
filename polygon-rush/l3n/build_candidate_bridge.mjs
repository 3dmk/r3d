import fs from 'node:fs';
import path from 'node:path';

const reportPath=process.argv[2]||'polygon-rush/l3n/out/L3N1000_REPORT.json';
const sourcePath=process.argv[3]||'polygon-rush/box3d/box3d_bridge.c';
const outPath=process.argv[4]||'polygon-rush/l3n/runtime/candidate_box3d_bridge.c';
const manifestPath=process.argv[5]||'polygon-rush/l3n/out/CANDIDATE_MANIFEST.json';

const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const p=report.bestParameters;
if(!p) throw new Error('L3N report missing bestParameters');
for(const k of ['engineForce','brakeForce','lateralGain','yawTorque','linearDamping','angularDamping','friction','restitution','spawnLift','fixedDt','subSteps']){
  if(!Number.isFinite(p[k])) throw new Error(`Invalid candidate parameter ${k}: ${p[k]}`);
}
let s=fs.readFileSync(sourcePath,'utf8');
function replaceOne(re,repl,label){const before=s;s=s.replace(re,repl);if(s===before)throw new Error(`Candidate bridge patch failed: ${label}`);}
replaceOne(/bd\.linearDamping=[0-9.]+f;/,`bd.linearDamping=${p.linearDamping.toFixed(6)}f;`,'linearDamping');
replaceOne(/bd\.angularDamping=[0-9.]+f;/,`bd.angularDamping=${p.angularDamping.toFixed(6)}f;`,'angularDamping');
replaceOne(/sd\.baseMaterial\.friction=[0-9.]+f;/,`sd.baseMaterial.friction=${p.friction.toFixed(6)}f;`,'vehicle friction');
replaceOne(/sd\.baseMaterial\.restitution=[0-9.]+f;/,`sd.baseMaterial.restitution=${p.restitution.toFixed(6)}f;`,'vehicle restitution');
replaceOne(/float engine=[0-9.]+f\*/,`float engine=${p.engineForce.toFixed(3)}f*`,'engineForce');
replaceOne(/float braking=[0-9.]+f\*/,`float braking=${p.brakeForce.toFixed(3)}f*`,'brakeForce');
replaceOne(/float latDamp=\(handbrake>0\.1f\?0\.95f:[0-9.]+f\)\*grip;/,`float latDamp=(handbrake>0.1f?0.95f:${p.lateralGain.toFixed(6)}f)*grip;`,'lateralGain');
replaceOne(/float yawTorque=steer\*steerScale\*[0-9.]+f\*/,`float yawTorque=steer*steerScale*${p.yawTorque.toFixed(3)}f*`,'yawTorque');

fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,s);
const manifest={method:report.method,sourceReport:reportPath,sourceBridge:sourcePath,candidate:p,generatedBridge:outPath,generatedAt:new Date().toISOString()};
fs.mkdirSync(path.dirname(manifestPath),{recursive:true});
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest,null,2));
