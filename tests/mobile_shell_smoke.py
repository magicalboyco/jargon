"""Mobile app shell: accessible game settings, stable rack, and phone-size gestures."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML=(Path(__file__).resolve().parents[1]/"index.html").read_text(encoding="utf-8")
with sync_playwright() as pw:
    options={"headless":True,"args":["--no-sandbox"]}
    if os.getenv("CHROME_PATH"): options["executable_path"]=os.environ["CHROME_PATH"]
    browser=pw.chromium.launch(**options)
    for width,height in ((320,720),(375,812),(390,844),(430,932)):
        ctx=browser.new_context(viewport={"width":width,"height":height},is_mobile=True,has_touch=True)
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.set_content(HTML)
        assert page.locator(".mobile-brand").is_visible()
        assert page.locator("#mobile-settings").is_visible()
        assert page.locator("#board .sq").count()==225
        assert page.locator("#rack .block").count()==7
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        assert page.locator("#mobile-game-type").inner_text().startswith("Classic")
        assert page.locator(".controls .primary").is_visible()
        assert page.locator("#mode-strip").is_hidden()
        page.locator("#mobile-settings").click()
        assert page.locator("#mobile-menu").is_visible()
        assert page.locator("#game-mode").is_visible()
        assert page.locator("#opponent-mode").is_visible()
        assert page.locator("#mobile-audio").get_attribute("aria-pressed")=="false"
        page.locator("#mobile-theme").click()
        assert page.locator("body").get_attribute("class") is not None
        page.locator("#mobile-menu-close").click()
        assert page.locator("#mobile-menu").is_hidden()
        assert page.locator("#mobile-settings").get_attribute("aria-expanded")=="false"
        nonblank=page.evaluate("state.racks[state.turn].findIndex(t=>!t.blank)")
        assert nonblank>=0
        page.locator("#rack .block").nth(nonblank).click()
        page.locator("#board .sq").nth(112).click()
        assert page.evaluate("draft.length===1")
        assert page.locator("#board .block.placed").count()==1
        page.locator("#recall").click()
        assert page.evaluate("draft.length===0")
        assert page.locator("#rack .block").count()==7
        assert not errors,errors
        print(f"PASS native-style phone shell {width}x{height}: navigation, settings, move, recall, no overflow")
        ctx.close()
    browser.close()
