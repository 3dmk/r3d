import fs from 'node:fs';import crypto from 'node:crypto';
const r='polygon-rush/production/';
fs.writeFileSync(r+'VERSION.txt','Polygon Rush v15.5.32 Real Surface Collisions\n');
const m=JSON.parse(fs.readFileSync(r+'BUILD.json','utf8'));
m.productionVersion='15.5.32';m.parentProductionVersion='15.5.31';m.releaseGate='browser-gated-success';m.deploymentModel='committed-static-production';m.features=['steer-under-power','test-track','free-roam','course-menu-self-heal','free-roam-obb-collision','reverse-drive','turn-momentum-preservation','anti-clipping','real-ramp-surface-collision','rotated-slope-contact'];
m.indexSha256=crypto.createHash('sha256').update(fs.readFileSync(r+'index.html')).digest('hex');m.threeSha256=crypto.createHash('sha256').update(fs.readFileSync(r+'three.min.js')).digest('hex');
fs.writeFileSync(r+'BUILD.json',JSON.stringify(m,null,2)+'\n');
console.log('v15.5.32 finalized',m.indexSha256);
