"""PR15 mobile interactions: full-engine scoring preview, conservative double-tap, gesture guards.
Requires Playwright Chromium; reports browser emulation, NOT physical iOS Safari.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

HTML=(Path(__file__).resolve().parents[1]/"index.html").read_text(encoding="utf-8")
with sync_playwright() as p:
    config={"headless":True,"args":["--no-sandbox"]}
    if os.getenv("CHROME_PATH"):config["executable_path"]=os.environ["CHROME_PATH"]
    browser=p.chromium.launch(**config)
    for width,height in ((320,720),(375,812),(390,844),(768,1024)):
        context=browser.new_context(viewport={"width":width,"height":height},is_mobile=True,has_touch=True)
        page=context.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.set_content(HTML)
        assert page.locator("#board .sq").count()==225
        assert page.locator("#rack .block").count()==7
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert page.locator("#draft-preview").is_visible()
        # Seed deterministic nonblank rack tiles for drag tests.
        page.evaluate("""() => {
          state=createGame(()=>0.5,'starter-demo-1','classic');
          const bag=fullBag('classic');
          state.racks[0]=[bag.find(t=>t.letter==='A'),bag.find(t=>t.letter==='T'),...bag.filter(t=>t.letter==='E').slice(0,5)];
          draft=[];selected=null;lastRackTap=null;render();
        }""")
        # A real pointer gesture transfers a rack tile to a precise board square,
        # independent of Across/Down, without committing official score.
        rackbox=page.locator("#rack .block").first.bounding_box()
        targetbox=page.locator("#board .sq").nth(112).bounding_box()
        assert rackbox and targetbox
        sx=rackbox["x"]+rackbox["width"]/2
        sy=rackbox["y"]+rackbox["height"]/2
        tx=targetbox["x"]+targetbox["width"]/2
        ty=targetbox["y"]+targetbox["height"]/2
        page.mouse.move(sx,sy)
        page.mouse.down()
        page.mouse.move((sx+tx)/2,(sy+ty)/2,steps=6)
        page.mouse.move(tx,ty,steps=6)
        page.mouse.up()
        assert page.evaluate("draft.length===1 && draft[0].row===7 && draft[0].col===7")
        assert page.evaluate("state.scores[0]===0")
        # Drag an already staged board tile to an adjacent square, then recall it.
        originalbox=page.locator("#board .sq").nth(112).bounding_box()
        nextbox=page.locator("#board .sq").nth(113).bounding_box()
        page.mouse.move(originalbox["x"]+originalbox["width"]/2,originalbox["y"]+originalbox["height"]/2)
        page.mouse.down()
        page.mouse.move(nextbox["x"]+nextbox["width"]/2,nextbox["y"]+nextbox["height"]/2,steps=12)
        page.mouse.up()
        assert page.evaluate("draft.length===1 && draft[0].row===7 && draft[0].col===8")
        page.locator("#recall").click()
        assert page.evaluate("draft.length===0 && state.scores[0]===0")

        action=page.locator("#board").evaluate("node => getComputedStyle(node).touchAction")
        assert "pinch-zoom" in action,action
        # Fixed A/T rack ensures deterministic double-tap behavior despite random bags.
        page.evaluate("""() => {
          state=createGame(()=>0.5,'starter-demo-1','classic');
          const bag=fullBag('classic');
          state.racks[0]=[bag.find(t=>t.letter==='A'),bag.find(t=>t.letter==='T'),...bag.filter(t=>t.letter==='E').slice(0,5)];
          draft=[];selected=null;render();
        }""")
        # Two taps in the same turn on the same tile auto-place only in a safe opening square.
        page.locator("#rack .block").first.click()
        page.locator("#rack .block").first.click()
        assert page.evaluate("draft.length===1 && draft[0].row===7 && draft[0].col===7")
        assert page.locator("#draft-preview").get_attribute("data-status")=="incomplete"
        # A second letter auto-extends the horizontal draft to the right of center.
        page.locator("#rack .block").first.click()
        page.locator("#rack .block").first.click()
        assert page.evaluate("draft.length===2 && draft[1].row===7 && draft[1].col===8")
        expected=page.evaluate("""() => play(state,{kind:'play',placements:draft},w=>validWord(w,'starter-demo-1'),()=>0.5).score""")
        assert page.locator("#draft-preview").get_attribute("data-status")=="valid"
        assert f"{expected} points" in page.locator("#draft-preview").inner_text()
        assert page.evaluate("state.scores[0]===0 && state.board[7][7]===null")
        # Direction toggle must allow vertical words, not merely horizontal auto-staging.
        page.evaluate("""() => {
          state=createGame(()=>0.5,'starter-demo-1','classic');
          const bag=fullBag('classic');
          state.racks[0]=[bag.find(t=>t.letter==='A'),bag.find(t=>t.letter==='T'),...bag.filter(t=>t.letter==='E').slice(0,5)];
          draft=[];selected=null;lastRackTap=null;render();
        }""")
        page.locator('[data-placement-direction="vertical"]').click()
        assert page.locator('[data-placement-direction="vertical"]').get_attribute("aria-pressed")=="true"
        page.locator("#rack .block").first.click()
        page.locator("#rack .block").first.click()
        page.locator("#rack .block").first.click()
        page.locator("#rack .block").first.click()
        assert page.evaluate("draft.length===2 && draft[0].row===7 && draft[0].col===7 && draft[1].row===8 && draft[1].col===7")
        assert page.locator("#draft-preview").get_attribute("data-status")=="valid"
        assert page.evaluate("state.scores[0]===0")
        # Manual tile-to-square placement must remain unrestricted regardless of selected direction.
        page.locator("#rack .block").first.click()
        page.locator("#board .sq").nth(97).click()
        assert page.evaluate("draft.some(p=>p.row===6&&p.col===7)")
        assert not errors,errors
        print(f"PASS {width}x{height}: deterministic center/adjacent double-tap, true score preview, no premature commit")
        context.close()
    context=browser.new_context()
    page=context.new_page()
    page.set_content(HTML)
    # Do not invent a placement on an established board where intent is ambiguous.
    result=page.evaluate("""() => {
      const bag=fullBag('classic');
      state.racks[0]=[bag.find(t=>t.letter==='A'),...bag.filter(t=>t.letter==='E').slice(0,6)];
      state.board[7][7]={as:'T',points:1,tile:bag.find(t=>t.letter==='T'),owner:1};
      draft=[];selected=null;render();
      return autoPlaceTile(state.racks[0][0].id);
    }""")
    assert result is False
    assert page.evaluate("draft.length===0")
    # Known invalid drafted word is labeled without modifying official score/state.
    result=page.evaluate("""() => {
      state=createGame(()=>0.5,'starter-demo-1','classic');
      const bag=fullBag('classic');
      const z=bag.find(t=>t.letter==='Z');
      const x=bag.find(t=>t.letter==='X');
      state.racks[0]=[z,x,...bag.filter(t=>t.letter==='E').slice(0,5)];
      draft=[{row:7,col:7,tileId:z.id,flipped:false},{row:7,col:8,tileId:x.id,flipped:false}];
      render();
      return {status:document.querySelector('#draft-preview').dataset.status,text:document.querySelector('#draft-preview').textContent};
    }""")
    assert result["status"]=="incomplete" and "dictionary" in result["text"].lower(),result
    assert page.evaluate("state.scores[0]===0")
    print("PASS no guessing on an occupied board; invalid word warns before submission")
    context.close()
    browser.close()
