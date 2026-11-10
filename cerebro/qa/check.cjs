const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:4647/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const title = await p.title();
  const header = await p.locator('#topbar').innerText();
  const btns = await p.locator('button').allInnerTexts();
  console.log('title:', title); console.log('topbar:', header.replace(/\s+/g,' ').slice(0,200));
  console.log('buttons:', btns.map(s=>s.trim()).filter(Boolean).join(' | '));
  await p.screenshot({ path: out + '/01-inicio.png' });
  // búsqueda
  await p.fill('#search-input', 'fugas'); await p.waitForTimeout(600);
  console.log('search results:', (await p.locator('#search-results').innerText()).replace(/\s+/g,' ').slice(0,200));
  await p.fill('#search-input', ''); 
  // inventario
  await p.click('#btn-inventory'); await p.waitForTimeout(600);
  console.log('inventory:', (await p.locator('#inv-sources').innerText()).replace(/\s+/g,' ').slice(0,300));
  await p.screenshot({ path: out + '/02-inventario.png' });
  await p.click('#inventory-close');
  // solo filter: click first legend item text
  const legend = p.locator('#legend-items button, #legend-items [role=button], #legend-items > *');
  console.log('legend items:', await legend.count(), (await p.locator('#legend-items').innerText()).replace(/\s+/g,' '));
  console.log('visible before:', await p.locator('#visible-status').innerText());
  await legend.nth(0).dblclick().catch(()=>{}); await p.waitForTimeout(500);
  console.log('visible after dblclick:', await p.locator('#visible-status').innerText());
  await p.click('#btn-reset').catch(()=>{}); await p.waitForTimeout(500);
  console.log('visible after reset:', await p.locator('#visible-status').innerText());
  // play demo
  const play = p.getByRole('button', { name: /play|demo|reproducir/i }).first();
  if (await play.count()) {
    await play.click(); await p.waitForTimeout(3000);
    console.log('growth early:', await p.locator('#growth-count').innerText());
    await p.mouse.move(700,450); await p.mouse.down(); await p.mouse.move(800,500,{steps:8}); await p.mouse.up();
    await p.mouse.wheel(0,-300);
    await p.waitForTimeout(8000); console.log('growth mid:', await p.locator('#growth-count').innerText());
    await p.screenshot({ path: out + '/03-crecimiento.png' });
    await p.waitForTimeout(22000); console.log('growth end:', await p.locator('#growth-count').innerText());
    await p.screenshot({ path: out + '/04-final.png' });
  } else console.log('no play button found');
  const cinema = p.getByRole('button', { name: /cinema/i }).first();
  if (await cinema.count()) { await cinema.click(); await p.waitForTimeout(1500); await p.screenshot({ path: out + '/05-cinema.png' }); await p.keyboard.press('Escape'); }
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto('http://127.0.0.1:4647/', { waitUntil: 'networkidle' }); await m.waitForTimeout(2500);
  await m.screenshot({ path: out + '/06-movil.png' });
  console.log('console errors:', errs.length, errs.slice(0,5));
  await b.close();
})();
