"""Offline Fraunces rendering and theme screenshots in real Chromium.

Reproduce:
  python -m pip install playwright
  python -m playwright install chromium
  python tests/typography_smoke.py
Images are CI artifacts from Chromium, NOT real iPhone Safari screenshots.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
assert 'data:font/woff2;base64,' in HTML, 'Missing self-hosted bundled Fraunces font'
assert 'Jargon Fraunces' in HTML
assert 'https://fonts.googleapis.com' not in HTML and 'https://fonts.gstatic.com' not in HTML
shots=ROOT/'artifacts/typography'
shots.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox']}
    if os.getenv('CHROME_PATH'):launch['executable_path']=os.environ['CHROME_PATH']
    browser=p.chromium.launch(**launch)
    for w,h in ((320,720),(375,812),(390,844),(768,1024)):
        ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True)
        page=ctx.new_page()
        errors=[]; external=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.on('request',lambda request:external.append(request.url) if request.url.startswith('http') else None)
        page.set_content(HTML)
        page.evaluate('document.fonts.ready')
        font=page.evaluate("""() => ({
          available:[...document.fonts].filter(f=>f.family==='Jargon Fraunces').map(f=>f.status),
          display:getComputedStyle(document.querySelector('.brand-tiles > span')).fontFamily,
          dictionarySize
        })""")
        assert font['available'] and all(x=='loaded' for x in font['available']),font
        assert 'Jargon Fraunces' in font['display'],font
        assert font['dictionarySize']==169266,font
        for theme in ('sophisticated','playful'):
            if theme=='playful':
                if w<=600:
                    page.locator('#mobile-settings').click()
                    page.locator('#mobile-theme').click()
                    page.locator('#mobile-menu-close').click()
                else:
                    page.locator('#theme').click()
            assert page.locator('#board .sq').count()==225
            assert page.locator('#rack .block').count()==7
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.screenshot(path=str(shots/f'jargon-{w}-{theme}.png'),full_page=True)
        assert not errors,errors
        assert not external,external
        print(f'PASS font {w}x{h}: loaded Jargon Fraunces, both themes, no HTTP requests')
        ctx.close()
    browser.close()
