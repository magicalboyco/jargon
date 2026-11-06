"""Verify full offline ENABLE2K dictionary; run python tests/dictionary_smoke.py."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

page_html=(Path(__file__).resolve().parents[1]/'index.html').read_text()
assert 'https://fonts.googleapis.com' not in page_html
assert 'https://fonts.gstatic.com' not in page_html
with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox']}
    if os.getenv('CHROME_PATH'):opts['executable_path']=os.environ['CHROME_PATH']
    browser=p.chromium.launch(**opts)
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(page_html)
    report=page.evaluate("""() => ({
        wordCount:dictionarySize, startupMs:dictionaryInitMs,
        version:DICTIONARY_VERSION,
        positive:['JARGON','QUIZZES','HELLO','ZYZZYVAS','SCRABBLE','UNPLAYABLE'].every(w=>validWord(w)),
        negative:['QI','ZA','AAA','ZZZZ','A','123'].every(w=>!validWord(w)),
        oldGame:validWord('JARGON','starter-demo-1'),
        stillNotAdded:!validWord('ZYZZYVAS','starter-demo-1'),
        board:document.querySelectorAll('#board .sq').length,
        rack:document.querySelectorAll('#rack .block').length,
        fresh:createGame().dictionaryVersion===DICTIONARY_VERSION
    })""")
    assert report['wordCount']==169266,report
    assert report['positive'] and report['negative'],report
    assert report['oldGame'] and report['stillNotAdded'] and report['fresh'],report
    assert report['board']==225 and report['rack']==7,report
    assert not errors,errors
    print('PASS ENABLE2K',report,'HTML bytes',len(page_html.encode()))
    browser.close()
