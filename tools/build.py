"""Rebuild the deterministic, self-contained offline Jargon game. No runtime network dependencies."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
shell=(root/'src/shell.html').read_text(encoding='utf-8')
css=(root/'src/styles.css').read_text(encoding='utf-8')
font_css=root/'src/fonts/fraunces-subset.css'
if font_css.exists():
    css=font_css.read_text(encoding='utf-8')+'\n'+css
js_parts=['engine.js','dictionary.js']
js_parts.extend(f'enable/{letter}.js' for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
js_parts.extend(['dictionary-finalize.js','bot.js','ui.js'])
js='\n'.join((root/'src'/name).read_text(encoding='utf-8') for name in js_parts)
assert shell.count('/*__CSS__*/')==1 and shell.count('/*__JS__*/')==1
output=shell.replace('/*__CSS__*/',css).replace('/*__JS__*/',js)
(root/'index.html').write_text(output,encoding='utf-8')
print('Built index.html:',len(output),'characters; font:',font_css.exists())
