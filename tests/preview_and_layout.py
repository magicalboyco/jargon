"""Jargon real-playability regression (Chromium, mobile and tablet).

Install: python -m pip install playwright && python -m playwright install chromium
Run: python tests/preview_and_layout.py
Optional system Chromium: CHROME_PATH=/usr/bin/chromium python tests/preview_and_layout.py

This loads the HTML through Playwright set_content; it does NOT prove actual iOS Safari
or any file-attachment preview executes JavaScript.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

html = (Path(__file__).resolve().parents[1] / "index.html").read_text(encoding="utf-8")
with sync_playwright() as p:
    launch = {"headless": True}
    if os.environ.get("CHROME_PATH"):
        launch.update(executable_path=os.environ["CHROME_PATH"], args=["--no-sandbox"])
    browser = p.chromium.launch(**launch)
    for width, height in [(375, 812), (390, 844), (768, 1024), (1024, 1536)]:
        context = browser.new_context(
            viewport={"width": width, "height": height},
            is_mobile=True,
            has_touch=True
        )
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("dialog", lambda dialog: dialog.accept())
        page.set_content(html)
        assert page.locator("#board .sq").count() == 225
        assert page.locator("#rack .block").count() == 7
        assert page.locator(".preview-lock").is_hidden()
        metrics = page.evaluate("""() => ({
            rootWidth:document.documentElement.scrollWidth,
            viewportWidth:innerWidth,
            buttonsBottom:document.querySelector('.controls').getBoundingClientRect().bottom
        })""")
        assert metrics["rootWidth"] <= width, metrics
        assert metrics["buttonsBottom"] <= height, metrics
        page.locator("#rack .block").first.click()
        page.locator("#board .sq").nth(112).click()
        assert page.locator("#board .sq .block").count() == 1
        assert not errors, errors
        print("PASS layout/interactions", width, height)
        context.close()

    page = browser.new_page()
    page.on("dialog", lambda dialog: dialog.accept())
    page.set_content(html)
    # Deterministic real move with local starter dictionary: A + T.
    page.evaluate("""() => {
        state=createGame(()=>0.5,'starter-demo-1','classic');
        const bag=fullBag('classic');
        state.racks[0]=[bag.find(t=>t.letter==='A'),bag.find(t=>t.letter==='T'),
          ...bag.filter(t=>t.letter==='E').slice(0,5)];
        draft=[];selected=null;render();
    }""")
    page.locator("#rack .block").first.click()
    page.locator("#board .sq").nth(112).click()
    page.locator("#rack .block").first.click()
    page.locator("#board .sq").nth(113).click()
    page.locator("#play").click()
    assert int(page.locator("#score0").inner_text()) > 0
    assert page.locator("#board .sq .block").count() == 2
    print("PASS staged AT word, submitted score, committed board")

    fallback = browser.new_context(java_script_enabled=False)
    preview = fallback.new_page()
    preview.set_content(html)
    assert preview.locator("#board .sq").count() == 225
    assert preview.locator(".preview-lock").is_visible()
    print("PASS static preview overlay with JavaScript disabled")
    fallback.close()
    browser.close()
