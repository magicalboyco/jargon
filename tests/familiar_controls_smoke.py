"""Regression checks for familiar keyboard entry and precise pointer-based tile drops."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = (Path(__file__).resolve().parents[1] / "index.html").read_text(encoding="utf-8")

with sync_playwright() as p:
    options = {"headless": True, "args": ["--no-sandbox"]}
    if os.getenv("CHROME_PATH"):
        options["executable_path"] = os.environ["CHROME_PATH"]
    browser = p.chromium.launch(**options)
    for width, height in ((320, 720), (390, 844), (768, 1024)):
        context = browser.new_context(viewport={"width": width, "height": height}, is_mobile=True, has_touch=True)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.set_content(HTML)
        page.evaluate("""() => {
            state=createGame(()=>0.5,'starter-demo-1','classic');
            const bag=fullBag('classic');
            state.racks[0]=[bag.find(t=>t.letter==='A'),bag.find(t=>t.letter==='T'),
              ...bag.filter(t=>t.letter==='E').slice(0,5)];
            draft=[];selected=null;cursorTarget=null;lastRackTap=null;
            render();
        }""")
        # A letter on the rack can be entered from the focused board square.
        cell = page.locator("#board .sq").nth(112)
        cell.focus()
        cell.press("a")
        assert page.evaluate("draft.length===1 && draft[0].row===7 && draft[0].col===7")
        assert page.evaluate("state.scores[0]===0")
        # The only A is consumed; typing A elsewhere must not invent a tile.
        page.locator("#board .sq").nth(113).focus()
        page.locator("#board .sq").nth(113).press("a")
        assert page.evaluate("draft.length===1")
        # Placement of T advances to the next target square.
        page.locator("#board .sq").nth(113).press("t")
        assert page.evaluate("draft.length===2 && draft[1].row===7 && draft[1].col===8")
        assert page.evaluate("new Set(draft.map(p=>p.tileId)).size===2")
        # Drag a staged tile from square 113 to square 114.
        source = page.locator("#board .sq").nth(113).bounding_box()
        dest = page.locator("#board .sq").nth(114).bounding_box()
        assert source and dest
        page.mouse.move(source["x"] + source["width"]/2, source["y"] + source["height"]/2)
        page.mouse.down()
        page.mouse.move(dest["x"] + dest["width"]/2, dest["y"] + dest["height"]/2, steps=12)
        page.mouse.up()
        assert page.evaluate("draft.length===2 && draft[1].row===7 && draft[1].col===9")
        assert page.locator(".tile-drag-ghost").count() == 0
        # Invalid drops are inert and leave the draft and scores unchanged.
        source = page.locator("#board .sq").nth(114).bounding_box()
        page.mouse.move(source["x"] + source["width"]/2, source["y"] + source["height"]/2)
        page.mouse.down()
        page.mouse.move(1, 1, steps=12)
        page.mouse.up()
        assert page.evaluate("draft.length===2 && draft[1].col===9 && state.scores[0]===0")
        assert page.locator(".tile-drag-ghost").count() == 0
        assert not errors, errors
        print(f"PASS {width}x{height}: keyboard placement, precise drag and inert invalid drop")
        context.close()
    browser.close()
