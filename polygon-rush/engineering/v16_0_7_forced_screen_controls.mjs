import fs from 'node:fs';
const p=process.argv[2]||'polygon-rush/production/index.html';
let s=fs.readFileSync(p,'utf8');
s=s.replaceAll('v16.0.6','v16.0.7').replace("const VERSION='16.0.6'","const VERSION='16.0.7'");
// Do not depend on device detection: controller is a permanent game HUD layer.
s=s.replace('#mobileControls{position:fixed;z-index:8;inset:0;display:none;pointer-events:none;', '#mobileControls{position:fixed;z-index:40;inset:0;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none;');
s=s.replace('#mobileControls.on{display:block}', '#mobileControls.on{display:block!important;visibility:visible!important;opacity:1!important}');
s=s.replace('.steerPad{left:max(14px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:156px;height:156px;', '.steerPad{display:block!important;visibility:visible!important;opacity:1!important;left:max(18px,env(safe-area-inset-left));bottom:max(22px,env(safe-area-inset-bottom));width:168px;height:168px;');
s=s.replace('.pedals{right:max(14px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));', '.pedals{display:grid!important;visibility:visible!important;opacity:1!important;right:max(18px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));');
s=s.replace('.touchBtn{pointer-events:auto;', '.touchBtn{visibility:visible!important;opacity:1!important;pointer-events:auto;');
s=s.replace("const touchInput={enabled:false,", "const touchInput={enabled:true,");
// Force activation at startup and after Start regardless of UA/media-query behavior.
s=s.replace("const VERSION='16.0.7',", "const VERSION='16.0.7',");
s=s.replace('</body>', '<script>document.addEventListener(\'DOMContentLoaded\',()=>{const c=document.getElementById(\'mobileControls\');if(c){c.classList.add(\'on\');c.style.setProperty(\'display\',\'block\',\'important\');c.style.setProperty(\'visibility\',\'visible\',\'important\');c.style.setProperty(\'opacity\',\'1\',\'important\');}});</script></body>');
s=s.replace('</style>', '#mobileControls{display:block!important;visibility:visible!important;opacity:1!important} #steerPad,.pedals,#gasTouch,#brakeTouch,#handbrakeTouch,#resetTouch{visibility:visible!important;opacity:1!important}</style>');
if(!s.includes("const VERSION='16.0.7'")) throw new Error('version patch failed');
for(const x of ['mobileControls','steerPad','gasTouch','brakeTouch','handbrakeTouch','display:block!important']) if(!s.includes(x)) throw new Error('missing '+x);
fs.writeFileSync(p,s);
console.log('patched',p,'to v16.0.7 forced screen controls');
