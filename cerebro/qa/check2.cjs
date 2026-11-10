const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:4647/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
  const items = p.locator('#legend-items button');
  console.log('legend buttons:', await items.count());
  await items.nth(3).click(); await p.waitForTimeout(700);
  console.log('after click grafo:', await p.locator('#visible-status').innerText());
  await p.screenshot({ path: out + '/07-solo.png' });
  await items.nth(3).click(); await p.waitForTimeout(700);
  console.log('after 2nd click:', await p.locator('#visible-status').innerText());
  await p.getByRole('button', { name: /play demo/i }).click();
  const t0 = Date.now(); let last = '';
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(2000); const c = await p.locator('#growth-count').innerText(); const btn = await p.locator('button:has-text("Replay"), button:has-text("Play demo")').count(); last = c; if (btn) { console.log('done at', Math.round((Date.now()-t0)/1000)+'s count', c); break; } }
  console.log('last count', last, 'status', await p.locator('#visible-status').innerText());
  await p.screenshot({ path: out + '/08-completo.png' });
  await p.getByRole('button', { name: /cinema/i }).click(); await p.waitForTimeout(2000);
  await p.screenshot({ path: out + '/05-cinema.png' });
  await b.close();
})();
