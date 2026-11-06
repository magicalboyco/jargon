"""Browser smoke checks for Jargon mobile. Run: pip install playwright && playwright install chromium && python tests/mobile_smoke.py. Optional: CHROME_PATH=/usr/bin/chromium python tests/mobile_smoke.py""" 
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
SOURCE=Path(__file__).resolve().parents[1].joinpath("index.html").read_text()
with sync_playwright() as p:
    opts={"headless":True}
    if os.getenv("CHROME_PATH"): opts.update(executable_path=os.getenv("CHROME_PATH"),args=["--no-sandbox"])
    browser=p.chromium.launch(**opts)
    for w,h in [(375,812),(390,844)]:
        page=browser.new_page(viewport={"width":w,"height":h},is_mobile=True,has_touch=True)
        errors=[]
        page.on("pageerror",lambda error: errors.append(str(error)))
        page.set_content(SOURCE)
        assert page.locator("#board .sq").count()==225
        assert page.locator("#rack .block").count()==7
        geom=page.evaluate("""() => ({width:document.documentElement.scrollWidth,controlsBottom:document.querySelector('.controls').getBoundingClientRect().bottom})""")
        assert geom["width"]<=w, "horizontal overflow"
        assert geom["controlsBottom"]<=h, "primary controls not visible"
        page.locator("#rack .block").first.click()
        page.locator("#board .sq").nth(112).click()
        assert page.locator("#board .block").count()==1, "tap-to-place failed"
        page.locator("#theme").click()
        assert page.locator("body").evaluate("el=>el.classList.contains('playful')"),"theme failed"
        assert not errors, errors
        print(f"PASS {w}x{h}: 225 squares, 7 rack tiles, tap, theme, layout, no errors")
        page.close()
    ctx=browser.new_context(java_script_enabled=False)
    page=ctx.new_page()
    page.set_content(SOURCE)
    assert page.locator("#board .sq").count()==225
    assert page.locator(".noscript-alert").is_visible()
    print("PASS JavaScript-disabled fallback")
    browser.close()
