"""Validate exported scene integrity, privacy, and generated project-page links."""
from pathlib import Path
import hashlib, json, subprocess, sys
import numpy as np
import yaml
from bs4 import BeautifulSoup
from urllib.parse import urlsplit, unquote

ROOT=Path(__file__).resolve().parents[1]
SITE=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'_site'
DATA=ROOT/'bat3r/assets/data'
gallery=json.loads((DATA/'gallery.json').read_text(encoding='utf-8'))['scenes']
assert len(gallery)==27 and len({x['id'] for x in gallery})==27
assert sum(x['dataset']=='7-Scenes' for x in gallery)==18
assert sum(x['dataset']=='NRGBD' for x in gallery)==9
clouds=0
for entry in gallery:
    meta=json.loads((DATA/entry['metadata']).read_text(encoding='utf-8'))
    assert meta['camera_kind']=='ground-truth input camera poses'
    matrices=np.asarray(meta['cameras']); assert matrices.shape==(meta['frames'],4,4)
    assert np.isfinite(matrices).all() and np.allclose(matrices[:,3,:],[0,0,0,1],atol=1e-5)
    assert len(meta['inputs'])==12
    for frame in meta['inputs']:
        assert 0<=frame['frame']<meta['frames'] and (DATA/frame['file']).is_file()
    assert (DATA/meta['poster']).is_file()
    for method,info in meta['methods'].items():
        content=(DATA/info['file']).read_bytes(); n=info['points']
        assert len(content)==15*n and n<=70000 and n<=info['original_points']
        assert hashlib.sha256(content).hexdigest()==info['sha256']
        points=np.frombuffer(content,dtype='<f4',count=n*3)
        assert np.isfinite(points).all() and np.std(points)>0
        clouds+=1
    if 'cut3r' in meta['methods']:
        assert meta['methods']['cut3r']['sha256']!=meta['methods']['bat3r']['sha256']
results=json.loads((DATA/'results.json').read_text(encoding='utf-8'))['rows']
assert len(results)==149
assert set(x['task'] for x in results)=={'reconstruction','pose','depth','ablation'}
for row in results:
    assert row['frames']>0 and row['metrics']
    assert row['source_table'] in [1,2,3,4] and not row.get('source_tag')
    for key,value in row['metrics'].items():
        if value is None: assert row['metric_text'][key]=='OOM'
        else: assert np.isfinite(value) and float(row['metric_text'][key])==value
def paper_row(task,dataset,frames,method,alignment=None):
    return next(x for x in results if (x['task'],x['dataset'],x['frames'],x['method'],x.get('alignment'))==(task,dataset,frames,method,alignment))
assert paper_row('reconstruction','7-Scenes',500,'BAT3R')['metrics']=={'acc_mean':0.026,'acc_median':0.012,'comp_mean':0.023,'comp_median':0.004,'nc_mean':0.558,'nc_median':0.588}
assert paper_row('reconstruction','NRGBD',500,'BAT3R')['metrics']=={'acc_mean':0.097,'acc_median':0.037,'comp_mean':0.032,'comp_median':0.004,'nc_mean':0.615,'nc_median':0.687}
assert paper_row('pose','TUM-dynamics',90,'BAT3R')['metrics']['ate']==0.016
assert paper_row('depth','KITTI',110,'BAT3R','Metric Scale')['metrics']=={'abs_rel':0.099,'delta125':89.4}
assert all(x['frames'] in [300,400,500] for x in results if x['task']=='reconstruction')
for p in DATA.rglob('*.json'):
    text=p.read_text(encoding='utf-8')
    assert '/home/' not in text and 'password' not in text and 'private_key' not in text

page=SITE/'bat3r/index.html'
soup=BeautifulSoup(page.read_text(encoding='utf-8'),'html.parser')
runtime_files=['three.module.js','three.core.js','OrbitControls.js','THREE-LICENSE.txt']
tracked=set(subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines())
for name in runtime_files:
    path='bat3r/assets/lib/'+name
    assert path in tracked, f'Runtime dependency is not tracked: {path}'
    assert (SITE/path).read_bytes()==(ROOT/path).read_bytes(), path
import_map=json.loads(soup.select_one('script[type="importmap"]').string)
assert import_map['imports']['three']=='/bat3r/assets/lib/three.module.js'
ids=[x['id'] for x in soup.select('[id]')]; assert len(ids)==len(set(ids))
assert soup.select_one('#code-resource')['href']=='https://github.com/llj110/BAT3R'
assert not soup.select('a[href^="mailto:"]')
assert soup.select_one('#method img')['src']=='assets/paper/overview.png'
assert len(soup.select('.paper-performance-grid img'))==6
assert len(soup.select('.paper-qualitative-grid img'))==9
assert 'not been verified as the paper-selected best run' in soup.select_one('.reconstruction-provenance').text
for tag in soup.select('a[href],link[href],script[src],img[src]'):
    url=tag.get('src') or tag.get('href'); parts=urlsplit(url)
    if parts.scheme or parts.netloc:continue
    target=(SITE/unquote(parts.path).lstrip('/')) if parts.path.startswith('/') else (page.parent/unquote(parts.path))
    if not parts.path:target=page
    if target.is_dir():target=target/'index.html'
    assert target.is_file(),url
    if parts.fragment and target.suffix=='.html':
        other=BeautifulSoup(target.read_text(encoding='utf-8'),'html.parser')
        assert other.find(id=parts.fragment),url
projects=yaml.safe_load((ROOT/'_data/research_projects.yml').read_text(encoding='utf-8'))
assert sum(len(x.get('grants',[])) for x in projects)==6
assert all(x['role']=='Participant' for x in projects)
home=BeautifulSoup((SITE/'index.html').read_text(encoding='utf-8'),'html.parser')
assert home.select_one('#research-projects') and len(home.select('.funding-card li'))==6
assert home.select_one('a[href="/bat3r/"]')
print(f'PASS: {len(gallery)} real scenes, {clouds} point clouds, 149 paper table rows, main method figure, 6 paper performance figures, 9 paper qualitative images, honest provenance and valid links.')
