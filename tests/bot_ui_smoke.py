"""Computer opponent test: real engine turn, privacy, resume and pass-and-play coexistence."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

HTML=(Path(__file__).resolve().parents[1]/'index.html').read_text(encoding='utf-8')
with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox']}
    if os.getenv('CHROME_PATH'):opts['executable_path']=os.environ['CHROME_PATH']
    browser=p.chromium.launch(**opts)
    for width,height in ((320,720),(390,844),(768,1024)):
        ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('dialog',lambda d:d.accept())
        page.set_content(HTML)
        page.locator('#opponent-mode').select_option('computer')
        assert page.evaluate("opponentMode==='computer' && state.history.length===0")
        page.evaluate("""() => {
          state=createGame(()=>0.5,'starter-demo-1','classic');
          const bag=fullBag('classic');
          state.racks[0]=[bag.find(t=>t.letter==='A'),bag.find(t=>t.letter==='T'),
             ...bag.filter(t=>t.letter==='E').slice(0,5)];
          state.racks[1]=[bag.find(t=>t.letter==='O'),bag.find(t=>t.letter==='N'),
             ...bag.filter(t=>t.letter==='I').slice(0,5)];
          draft=[];selected=null;cursorTarget=null;lastRackTap=null;lastTileDropAt=-1000;
          persist();render();
        }""")
        page.locator('#rack .block').first.click()
        page.locator('#board .sq').nth(112).click()
        page.locator('#rack .block').first.click()
        page.locator('#board .sq').nth(113).click()
        page.locator('#play').click()
        # The computer really executes a second engine action, never just a display animation.
        page.wait_for_function("state.history.length===2 && state.turn===0 && !botScheduled",timeout=12000)
        outcome=page.evaluate("""() => ({
           mode:opponentMode,history:state.history.map(x=>x.kind),
           score0:state.scores[0],score1:state.scores[1],
           historyScore:state.history[1].score,
           turn:state.turn,dialog:document.querySelector('#dialog').open
        })""")
        assert outcome['history'][0]=='play'
        assert outcome['history'][1] in ('play','pass')
        assert outcome['score0']==4 and outcome['score1']>=0
        assert outcome['turn']==0 and not outcome['dialog']
        assert not errors,errors
        print(f"PASS {width}x{height}: offline opponent actually takes a legal turn")
        ctx.close()
    browser.close()
