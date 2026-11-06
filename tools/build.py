"""Rebuild the self-contained offline Jargon alpha. No external dependencies."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
shell=(root/'src/shell.html').read_text(encoding='utf-8')
css=(root/'src/styles.css').read_text(encoding='utf-8')
js=''.join((root/'src'/name).read_text(encoding='utf-8') for name in ('engine.js','dictionary.js','ui.js'))
assert shell.count('/*__CSS__*/')==1 and shell.count('/*__JS__*/')==1
output=shell.replace('/*__CSS__*/',css).replace('/*__JS__*/',js)
(root/'index.html').write_text(output,encoding='utf-8')
print('Built index.html:',len(output),'characters')
