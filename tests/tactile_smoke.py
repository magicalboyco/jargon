"""Jargon PR13 tactile interactions, accessible fallback and responsive layout.
Run: python -m pip install playwright && python -m playwright install chromium
     python tests/tactile_smoke.py
These are Chromium emulation checks, not physical iOS Safari / native haptics.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
HTML=(Path(__file__).resolve().parents[1]/"index.html").read_text(encoding="utf-8")
with sync_playwright() as p:
    args={"headless":True,"args":["--no-sandbox"]}
    if os.environ.get("CHROME_PATH"):args["executable_path"]=os.environ["CHROME_PATH"]
    browser=p.chromium.launch(**args)
    for width,height in ((320,720),(375,812),(390,844),(768,1024)):
        ctx=browser.new_context(viewport={"width":width,"height":height},is_mobile=True,has_touch=True)
        page=ctx.new_page()
        problems=[]
        page.on("pageerror",lambda e:problems.append(str(e)))
        page.on("dialog",lambda d:d.accept())
        page.set_content(HTML)
        assert page.locator("#board .sq").count()==225
        assert page.locator("#rack .block").count()==7
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        assert page.locator(".score-pop").count()==0
        nonblank=page.evaluate("state.racks[state.turn].findIndex(t=>!t.blank)")
        assert nonblank>=0
        page.locator("#rack .block").nth(nonblank).click()
        page.locator("#board .sq").nth(112).click()
        assert page.locator("#board .block").count()==1
        assert page.locator(".sq .is-dropping").count()==1
        page.locator("#shuffle").click()
        assert page.locator(".rack .is-shuffling").count()>0
        assert not problems,problems
        print(f"PASS {width}x{height}: 225 cells, seven rack tiles, responsive, action-scoped motion")
        ctx.close()
    ctx=browser.new_context(reduced_motion="reduce")
    page=ctx.new_page()
    page.set_content(HTML)
    # Use a known nonblank tile so the picker cannot block the placement test.
    page.evaluate("""() => { const bag=fullBag("classic"); state.racks[0]=[bag.find(t=>t.letter==="A"),...bag.filter(t=>t.letter==="E").slice(0,6)]; draft=[];selected=null;render(); }""")
    page.locator("#rack .block").first.click()
    page.locator("#board .sq").nth(112).click()
    anim=page.locator("#board .block").first.evaluate("node=>getComputedStyle(node).animationName")
    assert anim=="none",anim
    print("PASS reduced motion: drop animation off")
    ctx.close()
    ctx=browser.new_context()
    page=ctx.new_page()
    page.on("dialog",lambda d:d.accept())
    page.set_content(HTML)
    page.locator("#rules").click()
    assert page.locator("#haptics-row").is_visible()
    assert page.locator("#haptics-setting").is_disabled() or not page.locator("#haptics-setting").is_checked()
    page.locator("#dialog-close").click()
    assert page.locator("#haptics-row").is_hidden()
    page.select_option("#game-mode","blocks")
    page.evaluate("""() => {const source=fullBag('blocks');const alternate=source.find(t=>t.alternate);state.racks[0]=[alternate,...source.filter(t=>t.letter==='E'&&t.id!==alternate.id).slice(0,6)];selected=null;draft=[];render();}""")
    result=page.evaluate("""() => {document.querySelector("#rack .block").click();const before={selected,mode:state.mode};document.querySelector("#flip").click();return {...before,flipTile,flipped:document.querySelectorAll(".rack .flipped").length,animating:document.querySelectorAll(".rack .is-flipping").length,disabled:document.querySelector("#flip").disabled};}""")
    assert result["flipped"]==1,result
    assert result["animating"]==1,result
    print("PASS block flip and opt-in haptics UI")
    ctx.close()
    ctx=browser.new_context(java_script_enabled=False)
    page=ctx.new_page()
    page.set_content(HTML)
    assert page.locator(".preview-lock").is_visible()
    assert page.locator("#board .sq").count()==225
    print("PASS JS-blocked static board and preview warning")
    ctx.close()
    browser.close()
