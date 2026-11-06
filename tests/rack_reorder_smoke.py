"""Rack identity, finger-style drag reorder, precision recall and keyboard fallback."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML=(Path(__file__).resolve().parents[1]/"index.html").read_text(encoding="utf-8")
def drag(page, source, destination):
    a=source.bounding_box()
    b=destination.bounding_box()
    assert a and b, (a,b)
    x=a["x"]+a["width"]/2
    y=a["y"]+a["height"]/2
    xx=b["x"]+b["width"]/2
    yy=b["y"]+b["height"]/2
    page.mouse.move(x,y)
    page.mouse.down()
    page.mouse.move(xx,yy,steps=15)
    page.mouse.up()

with sync_playwright() as p:
    options={"headless":True,"args":["--no-sandbox"]}
    if os.getenv("CHROME_PATH"): options["executable_path"]=os.environ["CHROME_PATH"]
    browser=p.chromium.launch(**options)
    for width,height in ((320,720),(375,812),(390,844),(768,1024)):
        ctx=browser.new_context(viewport={"width":width,"height":height},is_mobile=True,has_touch=True)
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.set_content(HTML)
        page.evaluate("""() => {
          state=createGame(()=>0.5,'starter-demo-1','classic');
          const bag=fullBag('classic');
          state.racks[0]=[bag.find(t=>t.letter==='A'),bag.find(t=>t.letter==='T'),
            ...bag.filter(t=>t.letter==='E').slice(0,5)];
          draft=[];selected=null;cursorTarget=null;lastRackTap=null;lastTileDropAt=-1000;
          render();
        }""")
        first_id=page.locator("#rack .block").first.get_attribute("data-tile-id")
        last_id=page.locator("#rack .block").last.get_attribute("data-tile-id")
        assert first_id!=last_id
        original=page.evaluate("state.racks[0].map(t=>t.id)")
        assert len(original)==len(set(original))==7
        # Drag the first tile onto the final physical rack slot.
        drag(page,page.locator("#rack .block").first,page.locator("#rack .block").last)
        ids=page.evaluate("state.racks[0].map(t=>t.id)")
        assert ids[-1]==int(first_id),(original,ids)
        assert sorted(ids)==sorted(original)
        assert page.evaluate("state.scores[0]===0 && draft.length===0")
        assert page.locator(".tile-drag-ghost").count()==0
        assert page.locator(".rack-drop-target").count()==0
        # Reorder from keyboard without losing focus.
        move=page.locator(f'#rack .block[data-tile-id="{first_id}"]')
        move.focus()
        move.press("Alt+ArrowLeft")
        assert page.evaluate("state.racks[0].at(-2).id")==int(first_id)
        assert page.evaluate("document.activeElement?.dataset.tileId")==first_id
        # Drag precise letter to center, then return only that letter to rack.
        drag(page,page.locator(f'#rack .block[data-tile-id="{first_id}"]'),
             page.locator("#board .sq").nth(112))
        assert page.evaluate("draft.length===1 && draft[0].row===7 && draft[0].col===7")
        assert page.locator("#rack .block").count()==6
        drag(page,page.locator("#board .sq").nth(112),page.locator("#rack"))
        assert page.evaluate("draft.length===0 && state.scores[0]===0")
        assert page.locator("#rack .block").count()==7
        assert sorted(page.evaluate("state.racks[0].map(t=>t.id)"))==sorted(original)
        # Click/tap selection and board cells still work after drag.
        page.locator("#rack .block").first.click()
        assert page.evaluate("selected!==null")
        assert not errors,errors
        print(f"PASS {width}x{height}: rack identity drag, keyboard reorder, precise recall and tap compatibility")
        ctx.close()
    browser.close()
