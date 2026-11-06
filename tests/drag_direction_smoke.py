"""Direction cursor, vertical scores, crossword validation and pointer-cancel cleanup.
Browser emulation is NOT a substitute for physical iOS Safari verification.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = (Path(__file__).resolve().parents[1] / "index.html").read_text(encoding="utf-8")

with sync_playwright() as p:
    opts = {"headless": True, "args": ["--no-sandbox"]}
    if os.getenv("CHROME_PATH"):
        opts["executable_path"] = os.environ["CHROME_PATH"]
    browser = p.chromium.launch(**opts)
    for width, height in ((320, 720), (375, 812), (390, 844), (768, 1024)):
        context = browser.new_context(viewport={"width": width, "height": height}, is_mobile=True, has_touch=True)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.set_content(HTML)
        page.evaluate("""() => {
          const bag=fullBag('classic');
          state=createGame(()=>0.5,'starter-demo-1','classic');
          state.racks[0]=[bag.find(t=>t.letter==='A'), bag.find(t=>t.letter==='T'),
            ...bag.filter(t=>t.letter==='E').slice(0,5)];
          draft=[];selected=null;cursorTarget=null;lastRackTap=null;
          setPlacementDirection('horizontal');render();
        }""")
        # First square tap selects the exact target, second toggles direction.
        center = page.locator("#board .sq").nth(112)
        center.click()
        assert center.locator(".cursor-arrow svg").count() == 1
        assert page.evaluate("cursorTarget.row===7 && cursorTarget.col===7 && placementDirection==='horizontal'")
        center.click()
        assert page.evaluate("placementDirection==='vertical'")
        assert center.get_attribute("aria-label").find("down placement cursor") >= 0
        # Clicking rack tiles automatically places them at cursor and advances downward.
        page.locator("#rack .block").first.click()
        assert page.evaluate("draft.length===1 && draft[0].row===7 && draft[0].col===7 && cursorTarget.row===8")
        page.locator("#rack .block").first.click()
        assert page.evaluate("draft.length===2 && draft[1].row===8 && draft[1].col===7")
        preview = page.evaluate("""() => {
          const result=play(state,{kind:'play',placements:draft},w=>validWord(w,'starter-demo-1'),()=>0.5);
          return {words:result.words.map(w=>w.word),score:result.score,
                  official:state.scores[0],center:state.board[7][7]};
        }""")
        assert preview["words"] == ["AT"], preview
        assert preview["score"] == 4, preview  # Center DW, vertical A+T.
        assert preview["official"] == 0 and preview["center"] is None
        assert "4 points" in page.locator("#draft-preview").inner_text()
        # A preexisting vertical chain and two crosswords are scored together.
        cross = page.evaluate("""() => {
          const bag=fullBag('classic'), find=(ch,n=0)=>bag.filter(t=>t.letter===ch)[n];
          state=createGame(()=>0.5,'starter-demo-1','classic');
          for(const [r,c,tile] of [
            [7,7,find('A')],[7,8,find('T')],[8,7,find('B')],[9,7,find('A',1)]
          ])state.board[r][c]={as:tile.letter,tile,points:tile.points,owner:1};
          state.racks[0]=[find('E'),find('N'),...bag.filter(t=>t.letter==='I').slice(0,5)];
          draft=[];selected=null;cursorTarget=null;lastRackTap=null;
          setPlacementDirection('vertical');render();
          return {tileIds:state.racks[0].map(t=>t.id)};
        }""")
        page.locator("#board .sq").nth(128).click()  # Select (8,8), default Across.
        page.locator("#board .sq").nth(128).click()  # Toggle same cell to Down.
        assert page.evaluate("placementDirection==='vertical'")
        page.locator("#rack .block").first.click()   # E at (8,8)
        page.locator("#rack .block").first.click()   # N at (9,8)
        outcome = page.evaluate("""() => {
          const result=play(state,{kind:'play',placements:draft},w=>validWord(w,'starter-demo-1'),()=>0.5);
          return {words:result.words.map(w=>w.word),score:result.score,
                  official:state.scores[0],draft:draft.map(x=>[x.row,x.col])};
        }""")
        assert set(outcome["words"]) == {"TEN", "BE", "AN"}, outcome
        assert outcome["score"] == 9, outcome
        assert outcome["official"] == 0, outcome
        assert outcome["draft"] == [[8,8],[9,8]], outcome
        assert "9 points" in page.locator("#draft-preview").inner_text()
        # Cancelled pointer gestures leave no ghost, highlight or leaked window handlers.
        page.evaluate("""() => {
          const el=document.querySelector('#rack .block');
          el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:99,
            pointerType:'touch',isPrimary:true,button:0,clientX:20,clientY:20}));
          window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:99,
            pointerType:'touch',isPrimary:true,button:0,clientX:70,clientY:100}));
          window.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:99,
            pointerType:'touch',isPrimary:true,button:0,clientX:70,clientY:100}));
        }""")
        assert page.evaluate("tileDrag===null && !document.querySelector('.tile-drag-ghost') && !document.querySelector('.drag-target')")
        assert not errors, errors
        print(f"PASS {width}x{height}: cursor toggle, vertical 4pt AT, three-way crossword 9pt, pointer cancel")
        context.close()
    browser.close()
