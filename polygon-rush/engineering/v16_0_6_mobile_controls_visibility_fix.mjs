import fs from 'node:fs';
const file=process.argv[2];let s=fs.readFileSync(file,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m)};
must(s.includes("const VERSION='16.0.5'"),'expected production v16.0.5');
s=s.replaceAll('v16.0.5','v16.0.6').replace("const VERSION='16.0.5'","const VERSION='16.0.6'");
s=s.replace('Android Touch Controls</title>','Android Controls Visibility Fix</title>').replace('ANDROID TOUCH CONTROLS','ANDROID CONTROLS VISIBLE');
const old="function setupMobileControls(){const coarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;if(!coarse)return;touchInput.enabled=true;";
const neu="function setupMobileControls(){const mobileViewport=matchMedia('(max-width:1100px)').matches;const touchCapable=('ontouchstart' in window)||navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;const android=/Android/i.test(navigator.userAgent);if(!(mobileViewport||touchCapable||android))return;touchInput.enabled=true;";
must(s.includes(old),'v16.0.5 mobile setup block missing');s=s.replace(old,neu);
// CSS fallback makes the widget visible on phone-sized screens even when WebView touch capability detection is unreliable.
s=s.replace('@media (max-width:700px){#menu{width:calc(100vw - 28px)}',"@media (max-width:1100px){#mobileControls{display:block}body:not(.mobile-game) #mobileControls{display:block}}@media (max-width:700px){#menu{width:calc(100vw - 28px)}");
s=s.replace("window.__polygonRush={version:VERSION,mobileControls:()=>({...touchInput}),diagnostics:()=>({mobileTouch:touchInput.enabled,","window.__polygonRush={version:VERSION,mobileControls:()=>({...touchInput,visible:getComputedStyle($('#mobileControls')).display!=='none'}),diagnostics:()=>({mobileTouch:touchInput.enabled,mobileControlsVisible:getComputedStyle($('#mobileControls')).display!=='none',");
s += '\n<!-- v16.0.6 mobile controls visibility: Android UA + touch + coarse pointer + viewport fallback; CSS phone/tablet fallback -->\n';
fs.writeFileSync(file,s);console.log('patched',file,'to v16.0.6');