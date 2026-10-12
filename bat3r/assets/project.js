import * as THREE from 'three';
import { OrbitControls } from './lib/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const base = new URL('./data/', import.meta.url);
const tr = (en, zh) => document.documentElement.lang === 'zh-CN' ? zh : en;
const names = {bat3r:'BAT3R',cut3r:'CUT3R reference',ground_truth:'Ground-truth geometry',ttt3r:'Attention-gate reference',cut3r_sdpa:'CUT3R · fused attention',cut3r_attention:'CUT3R · attention readout'};
const cache = new Map();
// README links can open a focused, automatically rotating scene.
const viewOptions = new URL(location.href).searchParams;
$('auto-rotate').checked = viewOptions.get('rotate') !== '0';
if (['cut3r', 'ground_truth', 'none'].includes(viewOptions.get('compare'))) {
  $('compare-select').value = viewOptions.get('compare');
}
let gallery = [], meta, viewers = [], generation = 0, syncing = false, selectedFilter = 'all', allScenes = false;
let referenceGeneration = 0;
let visible = true, playing = false, previousTick = 0, resultData = [], resultTask = 'reconstruction';

async function json(path) {
  const response = await fetch(new URL(path, base));
  if (!response.ok) throw new Error(`Scene data unavailable (${response.status})`);
  return response.json();
}
async function cloud(path) {
  if (cache.has(path)) return cache.get(path);
  const response = await fetch(new URL(path, base));
  if (!response.ok) throw new Error(`Point cloud unavailable (${response.status})`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength % 15 !== 0) throw new Error('Invalid point-cloud payload');
  cache.set(path, buffer);
  if (cache.size > 6) cache.delete(cache.keys().next().value);
  return buffer;
}

function makeViewer(container) {
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0xf0f2fa);
  container.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', container.getAttribute('aria-label'));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48,1,0.01,1000);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=.09; controls.autoRotate=$('auto-rotate').checked;
  const v={renderer,scene,camera,controls,points:null,path:null,marker:null,buffer:null,radius:1,center:new THREE.Vector3()};
  new ResizeObserver(() => {
    const width=container.clientWidth, height=container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix();
  }).observe(container);
  controls.addEventListener('change',() => {
    if (syncing) return;
    syncing=true;
    for (const other of viewers) if(other!==v) {
      other.camera.position.copy(camera.position); other.camera.quaternion.copy(camera.quaternion);
      other.controls.target.copy(controls.target); other.camera.zoom=camera.zoom;
      other.camera.updateProjectionMatrix(); other.controls.update();
    }
    syncing=false;
  });
  return v;
}

function dispose(v) {
  for (const obj of [v.points,v.path,v.marker]) if (obj) {
    v.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose();
  }
  v.points=v.path=v.marker=null;
}

function geometryFrom(buffer) {
  const count=buffer.byteLength/15;
  const raw=new Float32Array(buffer,0,count*3);
  const rgb=new Uint8Array(buffer,count*12,count*3);
  const positions=raw.slice(), colors=new Float32Array(count*3), color=new THREE.Color();
  for(let i=0;i<count;i++) {
    positions[i*3+1]*=-1; positions[i*3+2]*=-1;
    color.setRGB(rgb[i*3]/255,rgb[i*3+1]/255,rgb[i*3+2]/255,THREE.SRGBColorSpace);
    colors.set([color.r,color.g,color.b],i*3);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));
  g.userData.rgb=colors.slice(); g.computeBoundingSphere();
  return g;
}

function frameMarker(frame,radius) {
  const s=radius*.045, d=s*1.7;
  const corners=[[-s,-s*.7,d],[s,-s*.7,d],[s,s*.7,d],[-s,s*.7,d]];
  const coords=[];
  for(let i=0;i<4;i++) coords.push(0,0,0,...corners[i],...corners[i],...corners[(i+1)%4]);
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  const marker=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xde8b43,depthTest:false}));
  marker.matrixAutoUpdate=false; marker.renderOrder=3;
  const flip=new THREE.Matrix4().makeScale(1,-1,-1);
  marker.matrix.fromArray(frame.flat()).transpose().premultiply(flip);
  return marker;
}

function populate(v,buffer) {
  dispose(v); v.buffer=buffer;
  v.center.set(meta.center[0],-meta.center[1],-meta.center[2]); v.radius=Math.max(meta.radius,.1);
  const material=new THREE.PointsMaterial({size:Number($('point-size').value),sizeAttenuation:false,vertexColors:true});
  v.points=new THREE.Points(geometryFrom(buffer),material); v.scene.add(v.points);
  const coords=meta.cameras.flatMap(p=>[p[0][3],-p[1][3],-p[2][3]]);
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  v.path=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x727bdc,depthTest:false})); v.path.renderOrder=2;
  v.path.visible=$('trajectory-toggle').checked; v.scene.add(v.path);
  v.marker=frameMarker(meta.cameras[Number($('camera-frame').value)||0],v.radius); v.scene.add(v.marker);
  v.marker.visible=$('trajectory-toggle').checked;
  applyColors(v);
}

function resetView() {
  syncing=true;
  for(const v of viewers) {
    const r=v.radius;
    v.camera.near=r/1000; v.camera.far=r*1000; v.camera.zoom=1;
    v.camera.position.copy(v.center).add(new THREE.Vector3(r*1.35,r*.9,r*1.8));
    v.controls.target.copy(v.center); v.controls.minDistance=r*.03; v.controls.maxDistance=r*100;
    v.camera.updateProjectionMatrix(); v.controls.update();
  }
  syncing=false;
}

function applyColors(v) {
  if(!v.points) return;
  const g=v.points.geometry, target=g.attributes.color.array;
  if($('color-mode').value==='rgb') target.set(g.userData.rgb);
  else {
    const pos=g.attributes.position.array, color=new THREE.Color();
    for(let i=0;i<pos.length/3;i++) {
      const h=Math.max(0,Math.min(1,(pos[i*3+1]-v.center.y)/v.radius/2+.5));
      color.setHSL(.69-h*.46,.58,.57); target.set([color.r,color.g,color.b],i*3);
    }
  }
  g.attributes.color.needsUpdate=true;
}

function setFrame(frame) {
  if(!meta) return;
  frame=Math.max(0,Math.min(meta.frames-1,frame)); $('camera-frame').value=frame;
  $('frame-label').textContent=tr(`Frame ${frame+1} / ${meta.frames}`,`第 ${frame+1} / ${meta.frames} 帧`);
  for(const v of viewers) if(v.marker) {
    v.marker.matrix.fromArray(meta.cameras[frame].flat()).transpose().premultiply(new THREE.Matrix4().makeScale(1,-1,-1));
    v.marker.matrixWorldNeedsUpdate=true;
  }
  if(meta.inputs.length) {
    const nearest=meta.inputs.reduce((best,item)=>Math.abs(item.frame-frame)<Math.abs(best.frame-frame)?item:best);
    $('input-image').src=new URL(nearest.file,base).href;
    $('input-image').alt=tr(`Input keyframe ${nearest.frame+1} from ${meta.name}`,`${meta.name} 的输入关键帧 ${nearest.frame+1}`);
  }
}

async function loadScene(id) {
  const token=++generation;
  $('viewer-status').textContent=tr('Loading saved reconstruction…','正在加载真实重建结果…');
  $('download-cloud').disabled=true; setPlaying(false);
  try {
    const item=gallery.find(x=>x.id===id); if(!item) return;
    const next=await json(item.metadata); if(token!==generation)return;
    meta=next; $('scene-select').value=id;
    $('viewer-poster').src=new URL(meta.poster,base).href;
    $('viewer-poster').hidden=false;
    $('camera-frame').max=meta.frames-1; setFrame(0);
    const option=$('compare-select').querySelector('option[value="cut3r"]'); option.disabled=!meta.methods.cut3r;
    if($('compare-select').value==='cut3r'&&!meta.methods.cut3r) $('compare-select').value='ground_truth';
    if(!viewers.length) viewers=[makeViewer($('canvas-left')),makeViewer($('canvas-right'))];
    const left=await cloud(meta.methods.bat3r.file); if(token!==generation)return;
    populate(viewers[0],left); $('viewer-poster').hidden=true;
    await loadReference(token); if(token!==generation)return;
    resetView(); $('download-cloud').disabled=false;
    $('viewer-status').textContent=tr(`${meta.dataset} · ${meta.name} · ${meta.frames} input frames · ${meta.methods.bat3r.points.toLocaleString()} displayed points per cloud`,`${meta.dataset} · ${meta.name} · ${meta.frames} 个输入帧 · 每个点云 ${meta.methods.bat3r.points.toLocaleString()} 个展示点`);
    const url=new URL(location.href); url.searchParams.set('scene',id); history.replaceState(null,'',url);
  } catch(error) {
    $('viewer-status').textContent=tr(`3D view could not be loaded. The saved preview remains available. ${error.message}`,`三维视图暂时无法加载，仍可查看保存的预览。${error.message}`);
    $('viewer-poster').hidden=false;
  }
}

async function loadReference(token=generation) {
  const request=++referenceGeneration;
  if(!meta||!viewers.length)return;
  const method=$('compare-select').value;
  $('view-right').hidden=method==='none'; $('viewer-stage').classList.toggle('single',method==='none');
  if(method==='none')return;
  const buffer=await cloud(meta.methods[method].file); if(token!==generation||request!==referenceGeneration||method!==$('compare-select').value)return;
  populate(viewers[1],buffer); $('right-label').textContent=names[method];
}

function drawGallery() {
  const search=$('scene-search').value.toLowerCase();
  const filtered=gallery.filter(x=>(selectedFilter==='all'||x.dataset===selectedFilter)&&`${x.name} ${x.dataset}`.toLowerCase().includes(search));
  $('scene-grid').replaceChildren();
  for(const item of filtered.slice(0,allScenes?filtered.length:6)) {
    const b=document.createElement('button'); b.type='button'; b.className='scene-card';
    b.setAttribute('aria-label',tr(`Explore ${item.dataset}: ${item.name}`,`探索 ${item.dataset}：${item.name}`));
    const image=document.createElement('img'); image.src=new URL(item.poster,base).href; image.loading='lazy'; image.alt=`${item.name} reconstruction preview`; image.width=960; image.height=600;
    const info=document.createElement('div'); const label=document.createElement('div'); label.className='scene-meta';
    const ds=document.createElement('span'); ds.textContent=item.dataset; const n=document.createElement('span'); n.textContent=tr(`${item.frames} frames`,`${item.frames} 帧`); label.append(ds,n);
    const title=document.createElement('h3'); title.textContent=item.name;
    const p=document.createElement('p'); p.textContent=tr(item.methods.includes('cut3r')?'BAT3R · CUT3R reference · Ground truth':'BAT3R · Ground truth',item.methods.includes('cut3r')?'BAT3R · CUT3R 参考 · 真值':'BAT3R · 真值');
    info.append(label,title,p); b.append(image,info);
    b.addEventListener('click',()=> { loadScene(item.id); $('demo').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); });
    $('scene-grid').append(b);
  }
  $('show-all-scenes').hidden=filtered.length<=6||allScenes;
  if(!filtered.length){const p=document.createElement('p');p.textContent=tr('No matching scenes.','没有匹配的场景。');$('scene-grid').append(p);}
}

const metrics={acc_mean:['Accuracy error · Mean ↓','lower','几何精度误差 · 均值 ↓'],acc_median:['Accuracy error · Median ↓','lower','几何精度误差 · 中位数 ↓'],comp_mean:['Completeness error · Mean ↓','lower','完整性误差 · 均值 ↓'],comp_median:['Completeness error · Median ↓','lower','完整性误差 · 中位数 ↓'],nc_mean:['Normal consistency · Mean ↑','higher','法向一致性 · 均值 ↑'],nc_median:['Normal consistency · Median ↑','higher','法向一致性 · 中位数 ↑'],ate:['ATE ↓','lower','ATE ↓'],rpe_t:['RPE translation ↓','lower','RPE 平移 ↓'],rpe_r:['RPE rotation ↓','lower','RPE 旋转 ↓'],abs_rel:['Abs Rel ↓','lower','Abs Rel ↓'],delta125:['δ < 1.25 (%) ↑','higher','δ < 1.25（%）↑']};
function selectOptions(select,values,selected) {
  const old=selected??select.value; select.replaceChildren();
  for(const [value,label] of values){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}
  if(values.some(x=>String(x[0])===String(old)))select.value=old;
}
function configureResults(level=0) {
  let rows=resultData.filter(x=>x.task===resultTask);
  if(!rows.length)return;
  if(level<=0)selectOptions($('result-dataset'),[...new Set(rows.map(x=>x.dataset))].map(x=>[x,x]),resultTask==='pose'?'TUM-dynamics':undefined);
  rows=rows.filter(x=>x.dataset===$('result-dataset').value);
  if(level<=1)selectOptions($('result-length'),[...new Set(rows.map(x=>x.frames))].sort((a,b)=>a-b).map(x=>[String(x),String(x)]),resultTask==='reconstruction'&&level===0?'500':undefined);
  rows=rows.filter(x=>x.frames===Number($('result-length').value));
  $('alignment-control').hidden=resultTask!=='depth';
  if(resultTask==='depth'){selectOptions($('result-alignment'),[...new Set(rows.map(x=>x.alignment))].map(x=>[x,tr(x,x==='Metric Scale'?'绝对尺度':'序列尺度对齐')]));rows=rows.filter(x=>x.alignment===$('result-alignment').value);}
  if(level<=2)selectOptions($('result-metric'),Object.keys(rows[0].metrics).filter(x=>metrics[x]).map(x=>[x,tr(metrics[x][0],metrics[x][2])]));
  drawResults(rows);
}
function drawResults(rows) {
  const metric=$('result-metric').value, range=Math.max(...rows.map(x=>x.metrics[metric]??0))*1.15;
  $('result-chart').replaceChildren(); const h=document.createElement('p');h.className='metric-heading';h.textContent=tr(metrics[metric][0],metrics[metric][2])+tr(metrics[metric][1]==='lower'?' · Lower is better':' · Higher is better',metrics[metric][1]==='lower'?' · 越低越好':' · 越高越好');$('result-chart').append(h);
  $('result-table').querySelector('tbody').replaceChildren();
  for(const row of [...rows].sort((a,b)=>Number(b.method.startsWith('BAT3R'))-Number(a.method.startsWith('BAT3R')))) {
    const value=row.metrics[metric],highlight=row.method.startsWith('BAT3R'),display=row.metric_text[metric];
    if(Number.isFinite(value)){
      const b=document.createElement('div');b.className='bar-row'+(highlight?' highlight':'');
      const label=document.createElement('span');label.textContent=row.method;
      const track=document.createElement('div');track.className='bar-track';const fill=document.createElement('div');fill.className='bar-fill';fill.style.width=`${Math.max(1,value/range*100)}%`;track.append(fill);
      const number=document.createElement('span');number.className='bar-value';number.textContent=display;b.append(label,track,number);$('result-chart').append(b);
    }
    const r=document.createElement('tr');if(highlight)r.className='highlight';
    const mode=row.online===true?tr('Online','在线'):row.online===false?tr('Offline','离线'):tr('Ablation','消融');
    for(const text of [row.method,display,mode]){const td=document.createElement('td');td.textContent=text;r.append(td);}
    $('result-table').querySelector('tbody').append(r);
  }
  $('result-caption').textContent=tr('Paper Table ','论文表 ')+rows[0].source_table+` · ${$('result-dataset').value} · ${$('result-length').value} `+tr('frames','帧')+(rows[0].alignment?' · '+rows[0].alignment:'');
  $('result-protocol').textContent=tr(rows[0].protocol,rows[0].protocol_zh||rows[0].protocol);
}

function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
$('download-cloud').addEventListener('click',()=> {
  const raw=viewers[0]?.buffer;if(!raw||!meta)return;const n=raw.byteLength/15;
  const header=new TextEncoder().encode(`ply\nformat binary_little_endian 1.0\ncomment Uniformly sampled saved BAT3R benchmark reconstruction\nelement vertex ${n}\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n`);
  const out=new Uint8Array(header.length+n*15);out.set(header);const data=new DataView(out.buffer),pos=new Float32Array(raw,0,n*3),rgb=new Uint8Array(raw,n*12,n*3);
  for(let i=0;i<n;i++){let j=header.length+i*15;for(let k=0;k<3;k++)data.setFloat32(j+k*4,pos[i*3+k],true);out.set(rgb.subarray(i*3,i*3+3),j+12);}
  download(new Blob([out],{type:'application/octet-stream'}),`${meta.id}-bat3r-preview.ply`);
});
$('scene-select').addEventListener('change',e=>loadScene(e.target.value));
$('compare-select').addEventListener('change',()=>loadReference().catch(error=>{$('viewer-status').textContent=error.message;}));
$('reset-view').addEventListener('click',resetView);
$('exit-fullscreen').addEventListener('click',()=>document.exitFullscreen());
$('fullscreen-view').addEventListener('click',async()=> {try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewer-stage').requestFullscreen();}catch{$('viewer-status').textContent=tr('Fullscreen is not available in this browser.','此浏览器不支持全屏。');}});
$('trajectory-toggle').addEventListener('change',e=>{for(const v of viewers){if(v.path)v.path.visible=e.target.checked;if(v.marker)v.marker.visible=e.target.checked;}});
$('point-size').addEventListener('input',e=>{for(const v of viewers)if(v.points)v.points.material.size=Number(e.target.value);});
$('color-mode').addEventListener('change',()=>viewers.forEach(applyColors));
$('auto-rotate').addEventListener('change',e=>{viewers.forEach(v=>v.controls.autoRotate=e.target.checked);});
$('camera-frame').addEventListener('input',e=>setFrame(Number(e.target.value)));
function setPlaying(value) { playing=value; $('play-camera').setAttribute('aria-pressed',String(value)); $('play-camera').textContent=tr(value?'Pause path':'Play path',value?'暂停轨迹':'播放轨迹'); }
$('play-camera').addEventListener('click',()=>setPlaying(!playing));
$('scene-search').addEventListener('input',drawGallery);
$('show-all-scenes').addEventListener('click',()=>{allScenes=true;drawGallery();});
$('dataset-filter').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;selectedFilter=b.dataset.filter;allScenes=false;for(const x of $('dataset-filter').querySelectorAll('button'))x.setAttribute('aria-pressed',String(x===b));drawGallery();});
$('result-tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;resultTask=b.dataset.task;for(const x of $('result-tabs').querySelectorAll('button'))x.setAttribute('aria-pressed',String(x===b));configureResults();});
$('result-dataset').addEventListener('change',()=>configureResults(1));$('result-length').addEventListener('change',()=>configureResults(2));$('result-metric').addEventListener('change',()=>configureResults(3));
$('result-alignment').addEventListener('change',()=>configureResults(2));
$('copy-citation').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('bibtex').textContent);$('copy-status').textContent=tr('BibTeX copied.','BibTeX 已复制。');}catch{$('copy-status').textContent=tr('Select the citation text to copy it.','请选择引用文本并复制。');}});
new MutationObserver(()=>{if(gallery.length)drawGallery();if(meta)setFrame(Number($('camera-frame').value));setPlaying(playing);if(resultData.length)configureResults(2);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{rootMargin:'150px'}).observe($('viewer-stage'));
function tick(time) {
  requestAnimationFrame(tick);
  if(!visible||document.hidden)return;
  if(playing&&meta&&time-previousTick>75){setFrame((Number($('camera-frame').value)+1)%meta.frames);previousTick=time;}
  // One driver keeps the two orbiting cameras synchronized.
  for(let i=0;i<viewers.length;i++){const v=viewers[i];if(i===0)v.controls.update();if(i===0||!$('view-right').hidden)v.renderer.render(v.scene,v.camera);}
}
requestAnimationFrame(tick);
async function init() {
  try{
    const d=await json('gallery.json');gallery=d.scenes;
    const select=$('scene-select');select.replaceChildren();
    for(const dataset of [...new Set(gallery.map(x=>x.dataset))]){const group=document.createElement('optgroup');group.label=dataset;for(const item of gallery.filter(x=>x.dataset===dataset)){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;group.append(option);}select.append(group);}
    select.disabled=false;drawGallery();
    const fromURL=new URL(location.href).searchParams.get('scene');await loadScene(gallery.some(x=>x.id===fromURL)?fromURL:gallery[0].id);
  }catch(error){$('viewer-status').textContent=tr('Scene gallery is unavailable. Please refresh or view the saved preview.','场景暂时无法加载，请刷新或查看保存的预览。');}
}
init();
json('results.json').then(d=>{resultData=d.rows;configureResults();}).catch(()=>{$('result-protocol').textContent=tr('Result data is temporarily unavailable.','结果数据暂时无法加载。');});
