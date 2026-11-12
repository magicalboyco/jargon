"""Design-v10 responsive composition: compact play actions, adjacent tablet/desktop panels, and private save controls."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML=(Path(__file__).resolve().parents[1]/"index.html").read_text(encoding="utf-8")
SIZES=((320,720),(375,812),(390,844),(768,1024),(1024,768),(1536,900))
with sync_playwright() as playwright:
    options={"headless":True,"args":["--no-sandbox"]}
    if os.getenv("CHROME_PATH"): options["executable_path"]=os.getenv("CHROME_PATH")
    browser=playwright.chromium.launch(**options)
    for width,height in SIZES:
        context=browser.new_context(viewport={"width":width,"height":height},
                                    is_mobile=width<=1024,has_touch=width<=1024)
        page=context.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.set_content(HTML)
        metrics=page.evaluate("""() => {
            const rect=(selector)=>{
                const r=document.querySelector(selector).getBoundingClientRect();
                return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
            };
            const colors=['DL','TL','DW','TW'].map(kind=>
                getComputedStyle(document.querySelector('.premium-'+kind)).backgroundColor);
            return {scroll:document.documentElement.scrollWidth,
                width:innerWidth,board:rect('.board-wrap'),rack:rect('.rack-area'),
                controls:rect('.controls'),colors};
        }""")
        assert page.locator("#board .sq").count()==225
        assert page.locator("#rack .block").count()==7
        assert metrics["scroll"]<=width,(width,height,metrics)
        assert len(set(metrics["colors"]))==4,("Bonus colors must remain distinct",metrics["colors"])
        if width<=390:
            assert metrics["controls"]["bottom"]<=height,(width,height,metrics)
            sizes=page.locator(".controls button").evaluate_all(
                "nodes=>nodes.map(node=>node.getBoundingClientRect().height)")
            assert min(sizes)>=44,(width,height,sizes)
        if width>=700:
            assert metrics["rack"]["left"]>=metrics["board"]["right"]-2,(width,height,metrics)
            assert abs(metrics["rack"]["top"]-metrics["board"]["top"])<8,(width,height,metrics)
        if width<=600:
            page.locator("#mobile-settings").click()
            assert page.locator("#mobile-menu").is_visible()
            assert page.locator("#game-mode").is_visible()
            assert page.locator("#opponent-mode").is_visible()
            assert page.locator("#mobile-export").is_visible()
            assert page.locator("#mobile-import").is_visible()
            assert page.locator("#mobile-reset").is_visible()
            page.locator("#mobile-menu-close").click()
        else:
            page.locator("details.game-options summary").click()
            assert page.locator("#export").is_visible()
            assert page.locator("#import").is_visible()
            assert page.locator("#reset").is_visible()
        assert not errors,errors
        print(f"PASS premium play surface {width}x{height}: layout, color separation, actions, and private save controls")
        context.close()
    browser.close()
