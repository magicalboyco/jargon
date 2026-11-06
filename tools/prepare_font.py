"""Generate a properly licensed, pinned, embedded Fraunces WOFF2 text asset.

This is a BUILD-TIME process only. The HTML uses a data: URL and makes no font request.
Pinned Google Fonts Git blob verified before usage. Requires fonttools[woff] and brotli.
"""
import base64
import hashlib
import io
import json
import os
import urllib.request
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.subset import Options, Subsetter

FONT_BLOB='8210f9488d3c732359a9292dd09aca3f2bae830e'
URL=f'https://api.github.com/repos/google/fonts/git/blobs/{FONT_BLOB}'
headers={'Accept':'application/vnd.github+json','User-Agent':'Jargon-Privacy-First-Build'}
if os.environ.get('GITHUB_TOKEN'): headers['Authorization']='Bearer '+os.environ['GITHUB_TOKEN']
with urllib.request.urlopen(urllib.request.Request(URL,headers=headers),timeout=60) as response:
    payload=json.load(response)
data=base64.b64decode(payload['content'])
git_sha=hashlib.sha1(f'blob {len(data)}\0'.encode('ascii')+data).hexdigest()
assert git_sha==FONT_BLOB, f'Upstream font changed unexpectedly: {git_sha}'
font=TTFont(io.BytesIO(data))
axes={a.axisTag:(a.minValue,a.defaultValue,a.maxValue) for a in font['fvar'].axes}
requested={'wght':900,'SOFT':100,'WONK':1,'opsz':72}
settings={tag:min(high,max(low,requested[tag])) for tag,(low,default,high) in axes.items() if tag in requested}
font=instantiateVariableFont(font,settings,inplace=False)
subset=Subsetter(options=Options())
subset.populate(text='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !?.,:;\'\"-–—()[]&*/+@#$%')
subset.subset(font)
font.flavor='woff2'
output=io.BytesIO()
font.save(output)
woff=output.getvalue()
assert woff[:4]==b'wOF2'
encoded=base64.b64encode(woff).decode('ascii')
css=('/* Fraunces ©2018 Fraunces Project Authors, OFL 1.1; see src/fonts/OFL.txt. */\n'
     '@font-face { font-family: "Jargon Fraunces"; '
     'src: url("data:font/woff2;base64,'+encoded+'") format("woff2"); '
     'font-weight: 900; font-style: normal; font-display: swap; }\n')
target=Path(__file__).resolve().parents[1]/'src/fonts/fraunces-subset.css'
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(css,encoding='utf-8')
print('Fraunces upstream bytes',len(data),'upstream SHA256',hashlib.sha256(data).hexdigest(),
      'subset WOFF2 bytes',len(woff),'subset SHA256',hashlib.sha256(woff).hexdigest())
