"""Browser smoke checks: python -m pip install playwright; python -m playwright install chromium; python tests/regression.py.
CHROME_PATH may point to an installed Chromium executable.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML=(Path(__file__).resolve().parents[1]/'index.html').read_text(encoding='utf-8')
with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox']}
    if os.getenv('CHROME_PATH'): opts['executable_path']=os.environ['CHROME_PATH']
    browser=p.chromium.launch(**opts)
    for w,h in ((320,720),(375,812),(390,844),(768,1024)):
        ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True)
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content(HTML)
        assert page.locator('#board .sq').count()==225
        assert page.locator('#rack .block').count()==7
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert page.locator('#board .sq[tabindex="0"]').count()==1
        page.locator('#board .sq[tabindex="0"]').focus()
        page.keyboard.press('ArrowRight')
        assert page.evaluate('document.activeElement===document.querySelectorAll("#board .sq")[113]')
        page.keyboard.press('ArrowDown')
        assert page.evaluate('document.activeElement===document.querySelectorAll("#board .sq")[128]')
        assert not errors,errors
        print('PASS viewport/navigation',w,h)
        ctx.close()
    ctx=browser.new_context()
    page=ctx.new_page()
    page.on('dialog',lambda dlg:dlg.accept())
    page.set_content(HTML)
    page.evaluate("""() => {
      state=createGame(()=>0.5,'starter-demo-1','blocks');
      const bag=fullBag('blocks');
      state.racks[0]=[bag.find(t=>t.blank),bag.find(t=>t.letter==='E'),
        ...bag.filter(t=>t.letter==='T').slice(0,5)];
      draft=[];selected=null;render();
    }""")
    page.locator('#rack .block').first.click()
    page.locator('#board .sq').nth(112).click()
    assert page.locator('#blank-picker').is_visible()
    page.locator('#blank-cancel').click()
    assert page.evaluate('draft.length===0 && selected===null')
    # Escape must also clear selection when native dialog dismissal fires.
    page.locator('#rack .block').first.click()
    page.locator('#board .sq').nth(112).click()
    page.locator('#blank-picker').press('Escape')
    page.wait_for_function('pendingBlank===null && selected===null')
    assert page.locator('#blank-picker').is_hidden()
    page.locator('#rack .block').first.click()
    page.locator('#board .sq').nth(112).click()
    page.locator('#blank-letter').select_option('A')
    page.locator('#blank-confirm').click()
    assert page.evaluate('draft.length===1 && draft[0].as==="A"')
    assert page.evaluate('JSON.parse(JSON.stringify({version:2,game:state,draft})).draft[0].tileId===state.racks[0][0].id')
    print('PASS blank cancel, confirmation and save envelope')
    ctx.close()
    ctx=browser.new_context()
    page=ctx.new_page()
    page.on('dialog',lambda dlg:dlg.accept())
    page.set_content(HTML)
    page.evaluate("""() => {
      state=createGame(()=>0.5,'starter-demo-1','classic');
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
    assert page.locator('#board .sq .block').count()==2
    # The alpha is shared-device hot-seat; a human must explicitly accept handoff.
    assert page.locator('#dialog').is_visible()
    assert 'two-person game on one device' in page.locator('#dialog-message').inner_text().lower()
    assert page.locator('#dialog-close').inner_text()=='Player 2 — Ready to play'
    assert page.evaluate("document.body.classList.contains('handoff-lock')")
    assert page.locator("#rack .block").first.evaluate("el=>getComputedStyle(el).visibility")=="hidden"
    page.locator('#dialog-close').click()
    assert page.locator('#turn-label').inner_text()=="Player 2's turn"
    assert page.locator("#rack .block").first.evaluate("el=>getComputedStyle(el).visibility")=="visible"
    page.locator('#pass').click()
    assert page.locator('#dialog-close').inner_text()=='Player 1 — Ready to play'
    page.locator('#dialog-close').click()
    assert page.locator('#turn-label').inner_text()=="Player 1's turn"
    print('PASS scoring and two-player handoff, concealed rack, return to player one')
    ctx.close()
    ctx=browser.new_context(java_script_enabled=False)
    page=ctx.new_page()
    page.set_content(HTML)
    assert page.locator('#board .sq').count()==225
    assert page.locator('.preview-lock').is_visible()
    print('PASS disabled-JavaScript fallback')
    ctx.close()
    browser.close()
