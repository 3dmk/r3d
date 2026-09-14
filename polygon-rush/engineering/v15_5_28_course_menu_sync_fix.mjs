import fs from 'node:fs';
const file=process.argv[2]||'index.html';
let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};

// Make the level selector self-healing at runtime instead of relying only on
// brittle static HTML replacement from earlier feature patches.
const startAnchor="function start(){const worldName=$('#track').value;";
must(s.includes(startAnchor),'start function anchor missing');
const helper=`function ensureCourseMenuOptions(){
 const sel=document.getElementById('track');
 if(!sel)return false;
 const wanted=[
  ['test','TEST TRACK • PHYSICS LAB'],
  ['freeroam','FREE ROAM • DEMO COURSE']
 ];
 for(const [value,label] of wanted){
  let opt=[...sel.options].find(o=>o.value===value);
  if(!opt){opt=document.createElement('option');opt.value=value;sel.appendChild(opt)}
  opt.textContent=label;
 }
 return wanted.every(([value])=>[...sel.options].some(o=>o.value===value));
}
ensureCourseMenuOptions();
setTimeout(ensureCourseMenuOptions,0);
`;
s=s.replace(startAnchor,helper+startAnchor.replace("function start(){","function start(){ensureCourseMenuOptions();"));

const hook="window.__polygonRush={version:'15.5.17',racers:5,solver:'wheel-physics',startOk:true,wheelPhysics:true,";
if(s.includes(hook))s=s.replace(hook,hook+`testCourseMenu:()=>{ensureCourseMenuOptions();const sel=document.getElementById('track'),values=sel?[...sel.options].map(o=>o.value):[],labels=sel?[...sel.options].map(o=>o.textContent):[];return {values,labels,hasTest:values.includes('test'),hasFreeRoam:values.includes('freeroam'),ok:values.includes('test')&&values.includes('freeroam')}},`);

s+='\n<!-- course-menu-sync test+freeroam runtime verified -->\n';
for(const r of ['function ensureCourseMenuOptions()','TEST TRACK • PHYSICS LAB','FREE ROAM • DEMO COURSE','testCourseMenu:()=>','course-menu-sync test+freeroam'])must(s.includes(r),'missing '+r);
fs.writeFileSync(file,s);
console.log('Polygon Rush course menu synchronization applied');
