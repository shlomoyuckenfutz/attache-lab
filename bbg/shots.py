import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/workspace/attache-bbg/shots')
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:8766'

async def shot(page, name, path, w, h, full=False):
    await page.set_viewport_size({'width': w, 'height': h})
    await page.goto(BASE + path, wait_until='networkidle', timeout=90000)
    await page.wait_for_timeout(1800)
    # theme sanity
    bg = await page.evaluate("() => getComputedStyle(document.body).backgroundColor")
    amb = await page.evaluate("() => getComputedStyle(document.body).color")
    nav = await page.evaluate("""() => {
      const as=[...document.querySelectorAll('#ub nav a')].map(a=>a.textContent.replace(/\\s+/g,' ').trim());
      return as;
    }""")
    rad = await page.evaluate("""() => {
      const el=document.querySelector('.pn, .dk, #ub nav a, .ph');
      return el ? getComputedStyle(el).borderRadius : null;
    }""")
    print(name, 'bg', bg, 'color', amb, 'nav', nav, 'radius', rad)
    await page.screenshot(path=str(OUT / f'{name}.png'), full_page=full)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox'])
        page = await b.new_page()
        # Top-of-page 1280x800
        await shot(page, 'desk-top', '/', 1280, 800, False)
        await shot(page, 'command-top', '/command/', 1280, 800, False)
        await shot(page, 'overnight-top', '/overnight/', 1280, 800, False)
        # Full-page Command
        await shot(page, 'command-full', '/command/', 1280, 800, True)
        # Phone Desk
        await shot(page, 'desk-phone-390', '/', 390, 800, False)
        await b.close()

asyncio.run(main())
print('shots written:', sorted(p.name for p in OUT.glob('*.png')))
