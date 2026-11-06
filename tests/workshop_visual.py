"""Responsive Jargon Workshop visual and interaction checks.
Run: python -m pip install playwright && python -m playwright install chromium
     python tests/workshop_visual.py
Use CHROME_PATH=/usr/bin/chromium to run against an installed Chromium.
Responsive browser emulation is NOT physical iPhone Safari verification.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML=(Path(__file__).resolve().parents[1]/"index.html").read_text(encoding="utf-8")
SIZES=[(320,720),(375,812),(390,844),(768,1024),(1024,768)]
with sync_playwright() as p:
    launch={"headless":True,"args":["--no-sandbox"]}
    if os.environ.get("CHROME_PATH"): launch["executable_path"]=os.environ["CHROME_PATH"]
    browser=p.chromium.launch(**launch)
    for width,height in SIZES:
        ctx=browser.new_context(viewport={"width":width,"height":height},is_mobile=True,has_touch=True)
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.set_content(HTML)
        for theme in ("sophisticated","playful"):
            if theme=="playful": page.locator("#theme").click()
            metrics=page.evaluate("""() => {
              const controls=document.querySelector('.controls').getBoundingClientRect();
              const board=document.querySelector('#board').getBoundingClientRect();
              return {scroll:document.documentElement.scrollWidth,width:innerWidth,
                  bottom:controls.bottom,boardWidth:board.width,boardHeight:board.height,
                  buttonMinHeight:Math.min(...[...document.querySelectorAll('.controls button')]
                  .map(el=>el.getBoundingClientRect().height))}
            }""")
            assert page.locator("#board .sq").count()==225
            assert page.locator("#rack .block").count()==7
            assert metrics["scroll"]<=width,metrics
            assert metrics["bottom"]<=height,metrics
            assert abs(metrics["boardWidth"]-metrics["boardHeight"])<2,metrics
            assert metrics["buttonMinHeight"]>=44,metrics
            assert not errors,errors
            print(f"PASS {width}x{height} {theme}: full board, rack, controls, no overflow")
        ctx.close()
    # Short iPhone in-app browsers may expose much less CSS viewport height than Safari.
    # The BOARD MUST retain viewport width; scrolling down to controls is preferable
    # to collapsing the game into a 70px strip. Test both themes and fresh viewport.
    for width,height in ((320,480),(375,500),(390,530),(430,550),(600,550)):
        ctx=browser.new_context(viewport={"width":width,"height":height},is_mobile=True,has_touch=True)
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.set_content(HTML)
        metrics=page.evaluate("""() => {
          const game=document.querySelector('.game').getBoundingClientRect();
          const board=document.querySelector('#board').getBoundingClientRect();
          const grid=document.querySelector('.game-layout').getBoundingClientRect();
          return {gameWidth:game.width,boardWidth:board.width,gridWidth:grid.width,
            scroll:document.documentElement.scrollWidth,viewport:innerWidth};
        }""")
        assert metrics["gameWidth"]>=min(width-35,320),metrics
        assert metrics["boardWidth"]>=min(width-50,300),metrics
        assert metrics["scroll"]<=width,metrics
        assert not errors,errors
        print(f"PASS short viewport {width}x{height}: game uses full playable board width")
        ctx.close()
    ctx=browser.new_context(reduced_motion="reduce")
    page=ctx.new_page()
    page.set_content(HTML)
    # Choose a nonblank tile: a random blank opens the letter picker rather than placing immediately.
    # This test verifies single-tap placement, not the separate blank-tile flow.
    nonblank_index=page.evaluate("state.racks[state.turn].findIndex(tile => !tile.blank)")
    assert nonblank_index>=0,"No ordinary tile available in rack"
    page.locator("#rack .block").nth(nonblank_index).click()
    page.locator("#board .sq").nth(112).click()
    assert page.locator("#board .block.placed").count()==1
    animation=page.locator("#board .block.placed").evaluate("el=>getComputedStyle(el).animationName")
    assert animation=="none",animation
    print("PASS reduced motion: no placement animation")
    ctx.close()
    browser.close()
