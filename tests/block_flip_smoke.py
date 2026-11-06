"""Jargon Block Flip browser smoke tests.
Run: python -m pip install playwright && python -m playwright install chromium && python tests/block_flip_smoke.py
For an installed Chromium instead: CHROME_PATH=/usr/bin/chromium python tests/block_flip_smoke.py
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

SOURCE = Path(__file__).resolve().parents[1].joinpath("index.html").read_text(encoding="utf-8")
with sync_playwright() as p:
    launch = {"headless": True}
    if os.environ.get("CHROME_PATH"):
        launch.update(executable_path=os.environ["CHROME_PATH"], args=["--no-sandbox"])
    browser = p.chromium.launch(**launch)
    for width, height in ((375, 812), (390, 844)):
        context = browser.new_context(viewport={"width": width, "height": height}, is_mobile=True, has_touch=True)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("dialog", lambda d: d.accept())
        page.set_content(SOURCE)
        assert page.locator("#board .sq").count() == 225
        assert page.locator("#rack .block").count() == 7
        assert page.locator("#flip").is_hidden()
        page.select_option("#game-mode", "blocks")
        assert page.evaluate("state.mode") == "blocks"
        assert page.evaluate("state.bag.length + state.racks[0].length + state.racks[1].length") == 104
        rack = page.evaluate("state.racks[0].map(t => ({id:t.id,letter:t.letter,alternate:t.alternate,points:t.points}))")
        first_flippable = next(i for i, t in enumerate(rack) if t["alternate"])
        page.locator("#rack .block").nth(first_flippable).click()
        assert page.locator("#flip").is_enabled()
        page.locator("#flip").click()
        assert page.locator("#rack .block.flipped .face").inner_text() == rack[first_flippable]["alternate"]
        page.locator("#board .sq").nth(112).click()
        assert page.locator("#board .sq .block.flipped").count() == 1
        page.locator("#board .sq").nth(112).click()
        assert page.locator("#rack .block.flipped").count() == 1
        page.locator("#flip").click()
        assert page.locator("#rack .block.flipped").count() == 0
        page.locator("#theme").click()
        assert page.locator("body.playful").count() == 1
        geometry = page.evaluate("""() => ({
            scroll: document.documentElement.scrollWidth,
            width: innerWidth,
            controlsBottom: document.querySelector('.controls').getBoundingClientRect().bottom
        })""")
        assert geometry["scroll"] <= geometry["width"], geometry
        assert geometry["controlsBottom"] <= height, geometry
        assert not errors, errors
        print(f"PASS mobile {width}×{height}: board, rack, 104 blocks, flip, recall, theme, layout, errors")
        context.close()

    page = browser.new_page()
    page.set_content(SOURCE)
    facts = page.evaluate("""() => {
        const bag = fullBag('blocks');
        const q = bag.find(t => t.letter === 'Q');
        const x = bag.find(t => t.letter === 'X');
        const e = bag.find(t => t.letter === 'E');
        const blank = bag.find(t => t.blank);
        const t = {...bag.find(t => t.letter === 'T'), id: 123456};
        const game = createGame(() => 0.5, 'test', 'blocks');
        game.racks[0] = [e, t];
        const played = play(game, {kind:'play',placements:[
            {row:7,col:7,tileId:e.id,flipped:true},
            {row:7,col:8,tileId:t.id}
        ]}, () => true);
        let classicRejected = false;
        try {
            const classic = createGame(() => 0.5, 'test', 'classic');
            classic.racks[0] = [e,t];
            play(classic, {kind:'play', placements:[
                {row:7,col:7,tileId:e.id,flipped:true},
                {row:7,col:8,tileId:t.id}
            ]}, () => true);
        } catch { classicRejected = true; }
        let blankRejected = false;
        try {
            const game2 = createGame(() => 0.5, 'test', 'blocks');
            game2.racks[0] = [blank,t];
            play(game2, {kind:'play', placements:[
                {row:7,col:7,tileId:blank.id,flipped:true,as:'A'},
                {row:7,col:8,tileId:t.id}
            ]}, () => true);
        } catch { blankRejected = true; }
        return {
            classicTotal: fullBag('classic').length, total: bag.length,
            qAlternative:q.alternate, qPoints:tileValue(q,true), xAlternative:x.alternate,
            eAlternative:e.alternate, blankPoints:tileValue(blank,true),
            playedWord:played.words[0].word, placedPoints:played.state.board[7][7].points,
            committedFlip:played.state.board[7][7].flipped, classicRejected, blankRejected
        };
    }""")
    assert facts == {
        "classicTotal": 100, "total": 104,
        "qAlternative": "U", "qPoints": 5, "xAlternative": "S",
        "eAlternative": "A", "blankPoints": 0,
        "playedWord": "AT", "placedPoints": 1,
        "committedFlip": True, "classicRejected": True, "blankRejected": True
    }, facts
    print("PASS rules: distributions, value reductions, committed alternate, Classic/blank rejections")
    page.close()

    disabled = browser.new_context(java_script_enabled=False)
    page = disabled.new_page()
    page.set_content(SOURCE)
    assert page.locator("#board .sq").count() == 225
    assert page.locator(".noscript-alert").is_visible()
    print("PASS JavaScript-disabled 225-square fallback and explanation")
    disabled.close()
    browser.close()
