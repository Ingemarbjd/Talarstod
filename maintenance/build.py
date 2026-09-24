"""Rebuild the supplied Netlify export with narrowly scoped editor fixes.
Usage: python3 maintenance/build.py ORIGINAL.zip
No original TypeScript sources or npm build were included in the export.
"""
import hashlib, json, re, sys, zipfile
from pathlib import Path
root = Path(__file__).resolve().parent.parent
out = root / 'teleprompter'
out.mkdir(exist_ok=True)
with zipfile.ZipFile(sys.argv[1]) as archive:
    files = {item.filename: archive.read(item) for item in archive.infolist() if not item.is_dir()}
main = 'assets/index-cvdgjbi0.js'
s = files[main].decode()
def replace(old, new):
    global s
    assert s.count(old) == 1, (old[:100], s.count(old))
    s = s.replace(old, new)
# Reuse the existing iOS home-screen icon for every on-page brand mark.
assert s.count('className:"brand-mark",children:"T"') == 3
s = s.replace('className:"brand-mark",children:"T"', 'className:"brand-mark",children:f.jsx("img",{src:"/apple-touch-icon.png",alt:"",width:37,height:37,style:{display:"block",width:"100%",height:"100%",borderRadius:"inherit"}})')
start = s.index('w=V.useRef(null),Kl=V.useRef(null);', s.index('function q0('))
end = s.index('const Sl=async()=>', start)
s = s[:start] + '''w=V.useRef(null),editorTools=useEditorTools(V,w,h.id);V.useEffect(()=>{E(h),X("saved"),w.current&&(w.current.innerHTML=Jn(h.content))},[h.id]);''' + s[end:]
start = s.index('},zl=()=>{', s.index('function q0('))
end = s.index(',al=(x,D)=>', start)
s = s[:start] + '''},vl=(x,D)=>{if(!editorTools.restore())return;document.execCommand(x,!1,D);editorTools.refresh();Zl()},Ml=x=>{if(!editorTools.restore())return;document.execCommand("styleWithCSS",!1,"true");document.execCommand("foreColor",!1,x);editorTools.refresh();Zl()}''' + s[end:]
replace('className:"toolbar",role:"toolbar"', 'className:"toolbar",onPointerDownCapture:editorTools.prepare,onFocusCapture:editorTools.prepare,role:"toolbar"')
replace('"aria-label":"Styckeformat",defaultValue:"p",onChange:x=>vl("formatBlock",x.target.value),children:[', '"aria-label":"Styckeformat",value:editorTools.format.block,onChange:x=>vl("formatBlock",x.target.value),children:[f.jsx("option",{value:"",disabled:!0,children:"Blandade format"}),')
assert s.count('onPointerDown:x=>x.preventDefault(),onClick:()=>Ml(') == 4
s = s.replace('onPointerDown:x=>x.preventDefault(),onClick:()=>Ml(', 'onMouseDown:x=>x.preventDefault(),onClick:()=>Ml(')
for label, command in [('Halvfet','bold'),('Kursiv','italic'),('Understruken','underline'),('Punktlista','insertUnorderedList'),('Numrerad lista','insertOrderedList')]:
    replace(f'label:"{label}",onClick:()=>vl("{command}")', f'label:"{label}",active:editorTools.format.{command},onClick:()=>vl("{command}")')
replace('function Aa({icon:h,label:O,onClick:H})', 'function Aa({icon:h,label:O,onClick:H,active:active})')
replace('className:"tool-btn",type:"button",onMouseDown', 'className:"tool-btn","aria-pressed":active,type:"button",onMouseDown')
# This pre-existing insertion path did not restore the manuscript selection.
# Keep its existing behavior: it is outside the formatting toolbar and scope.
helper = (root/'maintenance/editor-improvements.js').read_bytes()
helper_name = 'assets/editor-tools-' + hashlib.sha256(helper).hexdigest()[:10] + '.js'
s = f'import{{useEditorTools}}from"./{Path(helper_name).name}";' + s
files[helper_name] = helper
files[main] = s.encode()
css = 'assets/index-brgdt-nr.css'
files[css] += b'\n' + (root/'maintenance/editor-improvements.css').read_bytes()
# The uploaded archive lowercased names, unlike its HTML and import references.
# Normalize those references for Netlify's case-sensitive file serving.
for name in list(files):
    if name.endswith(('.js','.html','.css','.webmanifest')):
        text = files[name].decode()
        for filename in files:
            text = re.sub(re.escape(Path(filename).name), Path(filename).name, text, flags=re.I)
        files[name] = text.encode()
# Changed assets get new URLs, so immutable CDN/browser caches cannot serve old code.
for old in [main, css]:
    new = f'assets/{Path(old).stem.split("-")[0]}-{hashlib.sha256(files[old]).hexdigest()[:10]}{Path(old).suffix}'
    files[new] = files.pop(old)
    for name in list(files):
        if name.endswith(('.js','.html')):
            files[name] = files[name].replace(Path(old).name.encode(), Path(new).name.encode())
files['netlify.toml'] = b'''[build]\npublish = "."\n\n[[headers]]\nfor = "/assets/*"\n[headers.values]\nCache-Control = "public, max-age=31536000, immutable"\n\n[[headers]]\nfor = "/sw.js"\n[headers.values]\nCache-Control = "no-cache"\n\n[[headers]]\nfor = "/index.html"\n[headers.values]\nCache-Control = "no-cache"\n\n[[redirects]]\nfrom = "/*"\nto = "/index.html"\nstatus = 200\n'''
sw = files['sw.js'].decode()
manifest = [{'url': name, 'revision': hashlib.md5(data).hexdigest()} for name, data in sorted(files.items()) if name not in ['sw.js','netlify.toml'] and not name.startswith('workbox-')]
sw = re.sub(r'e\.precacheAndRoute\(\[.*?\],\{\}\)', 'e.precacheAndRoute('+json.dumps(manifest,separators=(',',':'))+',{})', sw)
files['sw.js'] = sw.encode()
# Clear only earlier output files from this build directory.
for path in out.rglob('*'):
    if path.is_file(): path.unlink()
for name, data in files.items():
    path = out / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
with zipfile.ZipFile(root/'Talarstod-Netlify.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for name, data in sorted(files.items()): archive.writestr(name, data)
print(f'Built {len(files)} files and Talarstod-Netlify.zip')
