import hashlib,json,re,zipfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
site=root/'teleprompter'
count=0
for path in site.rglob('*'):
 if path.suffix in ('.js','.html','.css'):
  text=path.read_text()
  for url in re.findall(r'["\']((?:\./|/)?(?:assets/)?[A-Za-z0-9_.-]+\.(?:js|css))["\']',text):
   target=site/url.lstrip('/') if url.startswith('/') or url.startswith('assets/') else path.parent/url
   assert target.is_file(),(path,url)
   count+=1
sw=(site/'sw.js').read_text()
manifest=json.loads(re.search(r'precacheAndRoute\((\[.*?\]),\{\}\)',sw)[1])
for entry in manifest:
 assert hashlib.md5((site/entry['url']).read_bytes()).hexdigest()==entry['revision'],entry
with zipfile.ZipFile(root/'Talarstod-Netlify.zip') as archive:
 assert 'index.html' in archive.namelist()
 for name in archive.namelist(): assert archive.read(name)==(site/name).read_bytes()
print(f'PASS: {count} local references, {len(manifest)} offline cache hashes, deployment zip matches output.')
