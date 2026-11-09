const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const click = async selector => page.locator(selector).first().click();
  const wait = async selector => page.locator(selector).first().waitFor();
  try {
    await page.goto(process.env.TEST_URL || 'http://localhost:8013');
    await click('[data-go="c1"]');
    await wait('[data-go="c4"]');
    await page.screenshot({ path: '/tmp/opencode/pao-painel.png' });
    await click('[data-go="c4"]');
    await wait('[name="qty"]');
    await page.locator('[name="qty"]').fill('0');
    await click('[data-act="save"]');
    assert.match(await page.locator('#notice').textContent(), /quantidade inteira/);
    await page.locator('[name="qty"]').fill('9');
    await click('[data-act="save"]');
    await wait('h2:has-text("Mapa de calor da cidade")');
    assert.match(await page.locator('#app').textContent(), /34 kg/);
    await click('[data-go="c2"]');
    await wait('h2:has-text("Meta ×")');
    const savedStock = await page.evaluate(() => JSON.parse(localStorage.getItem('pao-fraterno-prototipo-v1')).stock);
    assert.deepEqual(savedStock, [34, 34, 12, 0]);
    await page.reload();
    await wait('h2:has-text("Meta ×")');
    await click('[data-go="c3"]');
    await click('[data-act="send"]');
    assert.match(await page.locator('#notice').textContent(), /Rota aprovada/);
    await click('[data-go="lg"]');
    await page.setViewportSize({ width: 360, height: 740 });
    await click('[data-go="v2"]');
    await wait('#v2n');
    assert.equal(await page.locator('#v2n').textContent(), 'Praça XV');
    await page.screenshot({ path: '/tmp/opencode/pao-parada.png' });
    let expectedTotal = 0;
    for (let index = 0; index < 5; index++) {
      await click('[data-go="v3"]');
      await wait('#cnt');
      const before = Number(await page.locator('#cnt').textContent());
      await click('[data-act="inc"]');
      assert.equal(Number(await page.locator('#cnt').textContent()), before + 1);
      await click('[data-act="deliver"]');
      await click('[data-act="undo"]');
      assert.equal(await page.locator('[data-act="next"]').getAttribute('aria-disabled'), 'true');
      await click('[data-act="dec"]');
      await click('[data-act="deliver"]');
      assert.equal(await page.locator('[data-act="deliver"]').getAttribute('aria-disabled'), 'true');
      expectedTotal += before;
      await click('[data-act="next"]');
      await wait(index === 4 ? '#v4a' : '#v2n');
    }
    assert.equal(await page.locator('#v4a').textContent(), '5');
    assert.equal(Number(await page.locator('#v4b').textContent()), expectedTotal);
    await page.screenshot({ path: '/tmp/opencode/pao-resumo.png' });
    await click('[data-act="finish"]');
    await click('[data-go="v2"]');
    await wait('#v2p');
    assert.equal(await page.locator('#v2p').textContent(), 'Parada 1/5');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.setViewportSize({ width: 320, height: 640 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // Todas as telas, incluindo coordenador, em celulares, tablets e desktops.
    for (const [width, height] of [[320, 568], [360, 740], [390, 844], [568, 320], [768, 1024], [1024, 768], [1199, 800], [1200, 800], [1440, 900], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      for (const target of ['lg', 'c1', 'c2', 'c3', 'c4', 'v2', 'v3', 'v4']) {
        await page.goto(`${process.env.TEST_URL || 'http://localhost:8013'}/#${target}`);
        await wait('#app button, #app svg [role="button"]');
        const layout = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          smallTargets: [...document.querySelectorAll('#app button')].filter(el => {
            const bounds = el.getBoundingClientRect();
            return bounds.width < 44 || bounds.height < 44;
          }).map(el => el.textContent),
          overflowingInputs: [...document.querySelectorAll('#app input')].filter(el => {
            const bounds = el.getBoundingClientRect();
            return bounds.left < 0 || bounds.right > innerWidth + 1;
          }).length,
        }));
        assert.ok(layout.document <= layout.viewport, `Rolagem horizontal em ${target}: ${width}×${height}`);
        assert.deepEqual(layout.smallTargets, [], `Alvos pequenos em ${target}: ${width}×${height}`);
        assert.equal(layout.overflowingInputs, 0, `Campo cortado em ${target}: ${width}×${height}`);
      }
    }
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${process.env.TEST_URL || 'http://localhost:8013'}/#c4`);
    await wait('[name="qty"]');
    await page.locator('[name="qty"]').fill('37');
    await click('[data-act="chip1"]');
    await page.screenshot({ path: '/tmp/opencode/pao-doacao-320.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await wait('.fluid-coordinator');
    assert.equal(await page.locator('[name="qty"]').inputValue(), '37');
    assert.equal(await page.locator('[data-act="chip1"]').getAttribute('aria-pressed'), 'true');
    await page.setViewportSize({ width: 768, height: 1024 });
    await wait('.fluid-coordinator');
    assert.equal(await page.locator('[name="qty"]').inputValue(), '37');
    await click('[data-act="qinc"]');
    assert.equal(await page.locator('[name="qty"]').inputValue(), '38');
    await click('[data-act="save"]');
    await wait('.coverage');
    await page.screenshot({ path: '/tmp/opencode/pao-painel-768.png', fullPage: true });
    await click('[data-go="c3"]');
    await wait('.stop-list');
    await click('[data-act="send"]');
    assert.equal(await page.locator('[data-act="send"]').textContent(), 'Rota enviada ✓');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/opencode/pao-rota-390.png', fullPage: true });
    for (const [width, height] of [[1280, 800], [1896, 896], [1920, 1080], [2560, 1440]]) {
      await page.setViewportSize({ width, height });
      await page.goto(`${process.env.TEST_URL || 'http://localhost:8013'}/#c1`);
      await wait('.coverage');
      const bounds = await page.evaluate(() => {
        const layout = document.querySelector('.fluid-coordinator').getBoundingClientRect();
        const sidebar = document.querySelector('.fluid-nav').getBoundingClientRect();
        const content = document.querySelector('.fluid-content').getBoundingClientRect();
        return { left: layout.left, right: layout.right, sidebarLeft: sidebar.left, sidebarHeight: sidebar.height, contentRight: content.right };
      });
      assert.equal(bounds.left, 0);
      assert.equal(bounds.sidebarLeft, 0);
      assert.equal(bounds.right, width);
      assert.equal(bounds.contentRight, width);
      assert.ok(bounds.sidebarHeight >= height);
    }
    await page.setViewportSize({ width: 1896, height: 896 });
    await page.screenshot({ path: '/tmp/opencode/pao-painel-full-width.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('OK: fluxos completos, 8 telas em 10 tamanhos, orientação horizontal, alvos de toque, campos sem corte e edição preservada ao redimensionar.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
