(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('gl');
const gl=canvas&&canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){if($('status'))$('status').textContent='WebGL unavailable';return;}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rad=d=>d*Math.PI/180;
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const mm=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o};
const T=(x,y,z)=>{const m=I();m[12]=x;m[13]=y;m[14]=z;return m};
const S=s=>new Float32Array([s,0,0,0,0,s,0,0,0,0,s,0,0,0,0,1]);
const RX=a=>{let c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])};
const RY=a=>{let c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])};
const RZ=a=>{let c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1])};
const model=o=>mm(T(...o.p),mm(RZ(rad(o.r[2])),mm(RY(rad(o.r[1])),mm(RX(rad(o.r[0])),S(o.s)))));
const pers=(f,a,n,z)=>{const t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/a;o[5]=t;o[10]=(z+n)/(n-z);o[11]=-1;o[14]=2*z*n/(n-z);return o};
function look(e,c){const z=norm(sub(e,c)),x=norm([z[2],0,-z[0]]),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1])}
const VS='attribute vec3 p,n;uniform mat4 mvp,model;varying vec3 N;void main(){N=normalize(mat3(model)*n);gl_Position=mvp*vec4(p,1.);}';
const FS='precision mediump float;varying vec3 N;uniform vec3 color;uniform float sun,selected;void main(){vec3 q=normalize(N);float d=max(dot(q,normalize(vec3(.45,1.,.35))),0.);vec3 c=color*(.25+d*sun);c=mix(c,vec3(1.,.48,.08),selected*.28);gl_FragColor=vec4(c,1.);}';
function shader(t,s){const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(x));return x}
const pr=gl.createProgram();gl.attachShader(pr,shader(gl.VERTEX_SHADER,VS));gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));gl.useProgram(pr);
const L={p:gl.getAttribLocation(pr,'p'),n:gl.getAttribLocation(pr,'n'),mvp:gl.getUniformLocation(pr,'mvp'),model:gl.getUniformLocation(pr,'model'),color:gl.getUniformLocation(pr,'color'),sun:gl.getUniformLocation(pr,'sun'),selected:gl.getUniformLocation(pr,'selected')};
function mkMesh(v){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);return{b,count:v.length/6}}
function cubeMesh(){const p=[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1]],f=[[0,1,2,3,[0,0,1]],[5,4,7,6,[0,0,-1]],[4,0,3,7,[-1,0,0]],[1,5,6,2,[1,0,0]],[3,2,6,7,[0,1,0]],[4,5,1,0,[0,-1,0]]],o=[];for(const q of f)for(const i of[q[0],q[1],q[2],q[0],q[2],q[3]])o.push(...p[i],...q[4]);return mkMesh(o)}
function sphereMesh(seg=28,rings=18){const o=[],P=(u,v)=>[Math.sin(v*Math.PI)*Math.cos(u*Math.PI*2),Math.cos(v*Math.PI),Math.sin(v*Math.PI)*Math.sin(u*Math.PI*2)];for(let y=0;y<rings;y++)for(let x=0;x<seg;x++){const a=P(x/seg,y/rings),b=P((x+1)/seg,y/rings),c=P((x+1)/seg,(y+1)/rings),d=P(x/seg,(y+1)/rings);for(const q of[a,b,c,a,c,d])o.push(...q,...q)}return mkMesh(o)}
function coneMesh(seg=32){const o=[];for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2,p=[Math.cos(a),-1,Math.sin(a)],q=[Math.cos(b),-1,Math.sin(b)],n=norm([Math.cos((a+b)/2),.5,Math.sin((a+b)/2)]);for(const v of[[0,1,0],p,q])o.push(...v,...n);for(const v of[[0,-1,0],q,p])o.push(...v,0,-1,0)}return mkMesh(o)}
const meshes={cube:cubeMesh(),sphere:sphereMesh(),cone:coneMesh()};
let uid=5,selected=0,tool='select',wire=false,yaw=-.55,pitch=.35,dist=9,target=[0,1,0],pan=[0,0,0],generation=1;
const objects=[
{id:1,name:'Cube',mesh:'cube',p:[-2,1,0],r:[0,0,0],s:1,c:[.68,.72,.78],mat:'diffuse'},
{id:2,name:'Gold Sphere',mesh:'sphere',p:[.3,1,0],r:[0,0,0],s:1,c:[.95,.57,.08],mat:'metal'},
{id:3,name:'Glass Sphere',mesh:'sphere',p:[2.7,1,0],r:[0,0,0],s:1,c:[.3,.72,.95],mat:'glass'},
{id:4,name:'Cone',mesh:'cone',p:[0,1,2.7],r:[0,0,0],s:1,c:[.75,.29,.18],mat:'diffuse'}];
const undo=[],redo=[];
const clone=o=>JSON.parse(JSON.stringify(o));
function snapshot(){return{objects:objects.map(clone),selected,tool,sun:App.sun}}
function restore(s){objects.splice(0,objects.length,...s.objects.map(clone));selected=clamp(s.selected,0,Math.max(0,objects.length-1));tool=s.tool||tool;App.sun=s.sun;generation++;list();sync();setTool(tool)}
function checkpoint(){undo.push(snapshot());if(undo.length>100)undo.shift();redo.length=0}
function doUndo(){if(!undo.length)return;redo.push(snapshot());restore(undo.pop());status('Undo')}
function doRedo(){if(!redo.length)return;undo.push(snapshot());restore(redo.pop());status('Redo')}
function status(t){$('status').textContent=t}
function touch(msg='Scene updated'){generation++;status(msg)}
function camera(){const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),base=[target[0]+pan[0],target[1]+pan[1],target[2]+pan[2]],e=[base[0]+dist*cp*sy,base[1]+dist*sp,base[2]+dist*cp*cy];return{e,c:base}}
const App=window.App3D={objects,sun:1.4,camera,get generation(){return generation},touch,selected:()=>objects[selected]||null};
function hex(c){return'#'+c.map(v=>Math.round(clamp(v,0,1)*255).toString(16).padStart(2,'0')).join('')}
function fromHex(h){return[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255]}
function list(){const s=$('scene');s.innerHTML='';objects.forEach((o,i)=>{const d=document.createElement('div');d.className='item'+(i===selected?' sel':'');d.textContent=o.name;d.onclick=()=>{selected=i;list();sync()};s.appendChild(d)});$('delBtn').disabled=objects.length<=1}
function sync(){const o=objects[selected];if(!o)return;['px','py','pz'].forEach((id,k)=>$(id).value=o.p[k].toFixed(2));['rx','ry','rz'].forEach((id,k)=>$(id).value=o.r[k].toFixed(1));$('sc').value=o.s.toFixed(2);$('mat').value=o.mat;$('color').value=hex(o.c);$('sun').value=App.sun;$('selName').textContent=o.name}
function setTool(t){tool=t;for(const [id,name] of[['selectTool','select'],['moveTool','move'],['rotateTool','rotate'],['scaleTool','scale']])$(id).classList.toggle('active',name===tool);$('toolName').textContent=tool[0].toUpperCase()+tool.slice(1)}
function addObject(mesh){checkpoint();const names={cube:'Cube',sphere:'Sphere',cone:'Cone'},cols={cube:[.65,.7,.78],sphere:[.5,.72,.9],cone:[.78,.36,.22]};objects.push({id:uid++,name:names[mesh]+' '+uid,mesh,p:[0,1,0],r:[0,0,0],s:1,c:cols[mesh],mat:'diffuse'});selected=objects.length-1;touch('Added '+mesh);list();sync()}
function duplicate(){if(!objects[selected])return;checkpoint();const o=clone(objects[selected]);o.id=uid++;o.name+=' Copy';o.p[0]+=.6;o.p[2]+=.6;objects.push(o);selected=objects.length-1;touch('Duplicated object');list();sync()}
function del(){if(objects.length<=1)return;checkpoint();objects.splice(selected,1);selected=clamp(selected,0,objects.length-1);touch('Deleted object');list();sync()}
function bindInput(id,fn){let armed=false;$(id).addEventListener('focus',()=>armed=false);$(id).addEventListener('input',e=>{if(!armed){checkpoint();armed=true}fn(e);touch();});$(id).addEventListener('change',()=>{armed=false;sync()})}
['px','py','pz'].forEach((id,k)=>bindInput(id,e=>objects[selected].p[k]=+e.target.value||0));
['rx','ry','rz'].forEach((id,k)=>bindInput(id,e=>objects[selected].r[k]=+e.target.value||0));
bindInput('sc',e=>objects[selected].s=Math.max(.05,+e.target.value||.05));
bindInput('mat',e=>objects[selected].mat=e.target.value);
bindInput('color',e=>objects[selected].c=fromHex(e.target.value));
bindInput('sun',e=>App.sun=clamp(+e.target.value||0,0,6));
function draw(o,v,pj,i){const m=model(o);gl.uniformMatrix4fv(L.model,false,m);gl.uniformMatrix4fv(L.mvp,false,mm(pj,mm(v,m)));gl.uniform3fv(L.color,o.c);gl.uniform1f(L.sun,App.sun);gl.uniform1f(L.selected,i===selected?1:0);const me=meshes[o.mesh];gl.bindBuffer(gl.ARRAY_BUFFER,me.b);gl.enableVertexAttribArray(L.p);gl.vertexAttribPointer(L.p,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(L.n);gl.vertexAttribPointer(L.n,3,gl.FLOAT,false,24,12);gl.drawArrays(wire?gl.LINES:gl.TRIANGLES,0,me.count)}
function drawGround(v,pj){const o={p:[0,-.1,0],r:[0,0,0],s:8,c:[.23,.24,.26]},m=mm(T(...o.p),new Float32Array([8,0,0,0,0,.1,0,0,0,0,8,0,0,0,0,1]));gl.uniformMatrix4fv(L.model,false,m);gl.uniformMatrix4fv(L.mvp,false,mm(pj,mm(v,m)));gl.uniform3fv(L.color,o.c);gl.uniform1f(L.sun,App.sun);gl.uniform1f(L.selected,0);const me=meshes.cube;gl.bindBuffer(gl.ARRAY_BUFFER,me.b);gl.vertexAttribPointer(L.p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(L.n,3,gl.FLOAT,false,24,12);gl.drawArrays(wire?gl.LINES:gl.TRIANGLES,0,me.count)}
let last=performance.now(),fc=0,fa=0,booted=false;
function loop(t){const dpr=Math.min(devicePixelRatio||1,2),W=Math.max(1,(canvas.clientWidth*dpr)|0),H=Math.max(1,(canvas.clientHeight*dpr)|0);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}$('size').textContent=W+'×'+H;gl.viewport(0,0,W,H);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(.12,.13,.15,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const C=camera(),v=look(C.e,C.c),pj=pers(Math.PI/4,W/H,.1,100);drawGround(v,pj);objects.forEach((o,i)=>draw(o,v,pj,i));fc++;fa+=t-last;last=t;if(fa>500){$('fps').textContent=Math.round(fc*1000/fa);fc=fa=0}if(!booted){booted=true;status('Ready • R3D editor');document.documentElement.dataset.r3dBoot='1'}requestAnimationFrame(loop)}
function pickRay(clientX,clientY){const r=canvas.getBoundingClientRect(),x=(clientX-r.left)/r.width*2-1,y=1-(clientY-r.top)/r.height*2,C=camera(),f=norm(sub(C.c,C.e)),right=norm(cross(f,[0,1,0])),up=cross(right,f),asp=r.width/r.height,tn=Math.tan(Math.PI/8),rd=norm(add(f,add(mul(right,x*asp*tn),mul(up,y*tn))));return{ro:C.e,rd}}
function pick(x,y){const ray=pickRay(x,y);let best=-1,bt=1e9;objects.forEach((o,i)=>{const oc=sub(ray.ro,o.p),b=dot(oc,ray.rd),rr=o.s*(o.mesh==='cube'?1.73:o.mesh==='cone'?1.42:1),d=b*b-(dot(oc,oc)-rr*rr);if(d>=0){const t=-b-Math.sqrt(d);if(t>0&&t<bt){bt=t;best=i}}});return best}
let drag=false,dragMode='',mx=0,my=0,dragStart=null;
canvas.addEventListener('mousedown',e=>{mx=e.clientX;my=e.clientY;if(e.altKey&&e.button===0){drag=true;dragMode='orbit';return}if(e.button===1){drag=true;dragMode='pan';e.preventDefault();return}if(e.button!==0)return;const hit=pick(e.clientX,e.clientY);if(hit>=0&&hit!==selected){selected=hit;list();sync()}if(hit<0&&tool==='select')return;drag=true;dragMode=tool;dragStart=clone(objects[selected]);if(tool!=='select')checkpoint()});
window.addEventListener('mouseup',()=>{if(drag&&['move','rotate','scale'].includes(dragMode))sync();drag=false;dragMode='';dragStart=null});
window.addEventListener('mousemove',e=>{if(!drag)return;const dx=e.clientX-mx,dy=e.clientY-my;mx=e.clientX;my=e.clientY;if(dragMode==='orbit'){yaw-=dx*.008;pitch=clamp(pitch-dy*.008,-1.35,1.35);return}if(dragMode==='pan'){const C=camera(),f=norm(sub(C.c,C.e)),right=norm(cross(f,[0,1,0])),up=norm(cross(right,f)),speed=.0017*dist;pan=add(pan,add(mul(right,-dx*speed),mul(up,dy*speed)));return}const o=objects[selected];if(!o)return;if(dragMode==='move'){const C=camera(),f=norm(sub(C.c,C.e)),right=norm(cross(f,[0,1,0])),up=cross(right,f);o.p=add(o.p,add(mul(right,dx*.012*dist/9),mul(up,-dy*.012*dist/9)));touch('Moving')}else if(dragMode==='rotate'){o.r[1]+=dx*.5;o.r[0]+=dy*.5;touch('Rotating')}else if(dragMode==='scale'){o.s=Math.max(.05,o.s*(1+(dx-dy)*.008));touch('Scaling')}});
canvas.addEventListener('wheel',e=>{dist=clamp(dist*Math.exp(e.deltaY*.001),2,50);e.preventDefault()},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('selectTool').onclick=()=>setTool('select');$('moveTool').onclick=()=>setTool('move');$('rotateTool').onclick=()=>setTool('rotate');$('scaleTool').onclick=()=>setTool('scale');
$('undoBtn').onclick=doUndo;$('redoBtn').onclick=doRedo;$('addCube').onclick=()=>addObject('cube');$('addSphere').onclick=()=>addObject('sphere');$('addCone').onclick=()=>addObject('cone');$('dupBtn').onclick=duplicate;$('delBtn').onclick=del;
$('resetBtn').onclick=()=>{yaw=-.55;pitch=.35;dist=9;pan=[0,0,0];target=[0,1,0];status('View reset')};
$('frameBtn').onclick=()=>{if(objects[selected]){target=[...objects[selected].p];pan=[0,0,0];dist=Math.max(3,objects[selected].s*5);status('Framed selection')}};
$('wireBtn').onclick=()=>{wire=!wire;$('wireBtn').classList.toggle('active',wire);$('litBtn').classList.toggle('active',!wire)};$('litBtn').onclick=()=>{wire=false;$('wireBtn').classList.remove('active');$('litBtn').classList.add('active')};
window.addEventListener('keydown',e=>{if(/INPUT|SELECT/.test(document.activeElement?.tagName||''))return;const k=e.key.toLowerCase();if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();doUndo()}else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();doRedo()}else if((e.ctrlKey||e.metaKey)&&k==='d'){e.preventDefault();duplicate()}else if(k==='delete')del();else if(k==='q')setTool('select');else if(k==='w')setTool('move');else if(k==='e')setTool('rotate');else if(k==='r')setTool('scale');else if(k==='f')$('frameBtn').click()});
list();sync();setTool('select');requestAnimationFrame(loop);
window.R3DEditor={version:'1.0.0-rc2',addObject,duplicate,deleteSelected:del,undo:doUndo,redo:doRedo,setTool,snapshot,camera,objects,selected:()=>objects[selected]||null,touch};
})();