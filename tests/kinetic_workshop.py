"""Jargon PR13 physical-feel interaction checks (browser emulation, NOT physical iOS).

Setup: python -m pip install playwright && python -m playwright install chromium
Run:   python tests/kinetic_workshop.py
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT/'index.html').read_text(encoding='utf-8')
OUT = ROOT/'artifacts/kinetic-pr13'
OUT.mkdir(parents=True, exist_ok=True)
SIZES = ((320,720),(375,812),(390,844),(768,1024),(1024,768))

with sync_playwright() as playwright:
    opts = {'headless':True,'args':['--no-sandbox']}
    if os.getenv('CHROME_PATH'):opts['executable_path']=os.getenv('CHROME_PATH')
    browser=playwright.chromium.launch(**opts)
    for width,height in SIZES:
        ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_content(HTML)
        assert page.locator('#board .sq').count()==225
        assert page.locator('#rack .block').count()==7
        for theme in ('sophisticated','playful'):
            if theme=='playful':page.locator('#theme').click()
            metrics=page.evaluate("""() => ({
                scroll:document.documentElement.scrollWidth,
                width:innerWidth,
                board:document.querySelector('#board').getBoundingClientRect().width,
                boardHeight:document.querySelector('#board').getBoundingClientRect().height,
                controls:document.querySelector('.controls').getBoundingClientRect().bottom,
                controlMin:Math.min(...[...document.querySelectorAll('.controls button')].map(b=>b.getBoundingClientRect().height)),
                inset:getComputedStyle(document.querySelector('.sq')).boxShadow,
                tray:getComputedStyle(document.querySelector('.board-wrap')).boxShadow
            })""")
            assert metrics['scroll']<=width,metrics
            assert abs(metrics['board']-metrics['boardHeight'])<=2,metrics
            assert metrics['controls']<=height,metrics
            assert metrics['controlMin']>=44,metrics
            assert 'inset' in metrics['inset'] and 'inset' in metrics['tray'],metrics
            if width in (375,390):
                # A settled mid-turn example; the screenshot isn't a claim of real-device polish.
                if theme=='sophisticated':
                    page.locator('#rack .block').first.click()
                    page.locator('#board .sq').nth(112).click()
                    assert page.locator('#board .kinetic-drop').count()==1
                    page.wait_for_timeout(400)
                page.screenshot(path=str(OUT/f'jargon-{width}-{theme}.png'),full_page=True)
        assert not errors,errors
        print(f'PASS {width}x{height}: tray, lacquer, both themes, controls, no overflow')
        ctx.close()

    ctx=browser.new_context()
    page=ctx.new_page()
    page.on('dialog',lambda dialog:dialog.accept())
    page.set_content(HTML)
    page.select_option('#game-mode','blocks')
    tiles=page.evaluate('state.racks[state.turn].map(t=>({alternate:t.alternate,blank:t.blank}))')
    idx=next((i for i,t in enumerate(tiles) if t['alternate'] and not t['blank']),None)
    assert idx is not None,'No flippable tile in Block Flip mode'
    page.locator('#rack .block').nth(idx).click()
    page.locator('#flip').click()
    assert page.locator('#rack .kinetic-flip').count()==1
    page.locator('#shuffle').click()
    assert page.locator('#rack .kinetic-shuffle').count()==7
    page.locator('#theme').click()
    assert page.locator('#rack .kinetic-shuffle').count()==0,'Shuffle animation must be event-scoped'
    print('PASS one-shot flip, shuffle and theme animation controls')
    ctx.close()

    ctx=browser.new_context()
    page=ctx.new_page()
    page.on('dialog',lambda d:d.accept())
    page.set_content(HTML)
    page.evaluate("""() => {
      state=createGame(()=>0.5,DICTIONARY_VERSION,'classic');
      const bag=fullBag('classic');
      state.racks[0]=[bag.find(t=>t.letter==='A'),bag.find(t=>t.letter==='T'),
          ...bag.filter(t=>t.letter==='E').slice(0,5)];
      draft=[];selected=null;render();
    }""")
    page.locator('#rack .block').first.click()
    page.locator('#board .sq').nth(112).click()
    page.locator('#rack .block').first.click()
    page.locator('#board .sq').nth(113).click()
    page.locator('#play').click()
    assert int(page.locator('#score0').inner_text())>0
    assert page.locator('.score-pop').count()==1
    assert page.locator('#rack .block').count()==0,'Next player rack must be hidden during score burst'
    page.wait_for_function("document.querySelector('#dialog').open", timeout=3000)
    assert page.locator('#rack .block').count()==7
    assert page.locator('#board .sq .block').count()==2
    print('PASS scored AT move, score burst and private next-player handoff')
    ctx.close()

    mocked=HTML.replace('<head>','<head><script>window.__vibes=[];Object.defineProperty(navigator,"vibrate",{configurable:true,value:(pattern)=>{window.__vibes.push(pattern);return true;}});</script>',1)
    ctx=browser.new_context(reduced_motion='no-preference')
    page=ctx.new_page()
    page.set_content(mocked)
    assert page.locator('#haptics').is_visible()
    assert page.locator('#haptics').get_attribute('aria-pressed')=='false'
    page.locator('#rack .block').first.click()
    assert page.evaluate('window.__vibes.length')==0,'Vibration must be opt-in'
    page.locator('#haptics').click()
    assert page.locator('#haptics').get_attribute('aria-pressed')=='true'
    page.locator('#rack .block').first.click()
    assert page.evaluate('window.__vibes.length')>=1
    print('PASS haptics off by default, explicit opt-in enables supported vibration')
    ctx.close()

    ctx=browser.new_context(reduced_motion='reduce')
    page=ctx.new_page()
    page.set_content(mocked)
    page.locator('#haptics').click()
    page.locator('#rack .block').first.click()
    page.locator('#board .sq').nth(112).click()
    assert page.locator('#board .kinetic-drop').count()==1
    assert page.locator('#board .kinetic-drop').evaluate("el=>getComputedStyle(el).animationName")=='none'
    assert page.evaluate('window.__vibes.length')==0,'Reduced motion disables vibration'
    print('PASS reduced-motion preference suppresses animation and haptics')
    ctx.close()
    browser.close()
