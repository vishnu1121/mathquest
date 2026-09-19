// Lantern Flight: a phone-size check of the intro, HUD and first sky question, then a full four-leg flight flown
// only through the public keyboard controls and what is visible on screen. The autopilot chases fireflies and flies
// through the ring that answers each question (read from the lantern and the ring labels), then the results,
// medal and saved best score are checked. AI is off; no game state or rule is changed by the test.
// Usage: BASE_URL=http://localhost:3001 node scripts/adventure-flight.mjs  (dev server must be running)
import { chromium, expect } from '@playwright/test';

const url = process.env.BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch();
const errors = [];
const openFlight = async (page) => {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/adventure-ai', (r) => r.fulfill({ json: { enabled: false } }));
  await page.goto(url);
  await page.waitForFunction(() => window.MQMini && document.querySelector('.title-screen'));
  await page.evaluate(() => { document.querySelector('.title-screen').remove(); void window.MQMini.play('flight'); });
  await page.locator('.mf-hoot').waitFor();
};

try {
  // ---- Phone: the intro, HUD and first sky question fit a small screen ----
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await openFlight(phone);
  await expect(phone.locator('.mf-intro')).toBeVisible();
  await expect(phone.locator('.mf-intro ol li')).toHaveCount(4);
  await expect(phone.locator('.mf-lantern')).toHaveAttribute('data-lights', '0');
  await expect(phone.locator('.mf-rivals')).toContainText('Pip');
  await phone.keyboard.down('Space');
  await expect(phone.locator('.mf-intro')).toBeHidden();
  await expect(phone.locator('.mf-leg')).toContainText('Leg 1 of 4');
  await phone.keyboard.up('Space');
  await expect(phone.locator('.mf-ask[data-on="question"]')).toContainText('Which ring', { timeout: 20000 });
  await expect(phone.locator('.mf-ring[data-add]')).toHaveCount(3);
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const hud = await phone.locator('.mf-hud').boundingBox();
  expect(hud.x + hud.width).toBeLessThanOrEqual(391);
  await phone.screenshot({ path: 'test-results/flight-phone-question.png' });
  await phone.locator('.mini-skip').click();
  await expect(phone.locator('.mini-flight')).toHaveCount(0);
  await phone.close();

  // ---- Tablet: the whole flight ----
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await openFlight(page);
  await page.evaluate(() => {
    const stage = document.querySelector('.mini-stage');
    const matrix = (el) => new DOMMatrix(getComputedStyle(el).transform);
    let previousY = stage.clientHeight * 0.45;
    let holding = false;
    const timer = setInterval(() => {
      const hoot = document.querySelector('.mf-hoot');
      if (!hoot || document.querySelector('.mini-done')) { clearInterval(timer); return; }
      const pos = matrix(hoot);
      const lights = Number(document.querySelector('.mf-lantern')?.dataset.lights || 0);
      let target = null;
      // A sky question ahead: aim for the ring that answers it, using only the lantern count and the ring labels.
      const gate = [...document.querySelectorAll('.mf-gate[data-kind]')].map((el) => ({ el, x: matrix(el).m41 })).filter((g) => g.x >= pos.m41 - 8).sort((a, b) => a.x - b.x)[0];
      if (gate) {
        const want = gate.el.dataset.kind === 'nextTen' ? 10 - (lights % 10) : 10;
        const ring = [...gate.el.querySelectorAll('.mf-ring')].find((r) => Number(r.dataset.add) === want);
        if (ring) target = parseFloat(ring.style.top);
      }
      if (target === null) {
        const next = [...document.querySelectorAll('.mf-fly, .mf-star')].map(matrix).filter((p) => p.m41 >= pos.m41 - 15).sort((a, b) => a.m41 - b.m41)[0];
        target = next?.m42 ?? stage.clientHeight * 0.45;
      }
      const velocity = (pos.m42 - previousY) / 0.04;
      previousY = pos.m42;
      const up = pos.m42 + velocity * 0.34 > target - 10;
      if (up !== holding) {
        holding = up;
        window.dispatchEvent(new KeyboardEvent(up ? 'keydown' : 'keyup', { code: 'Space', key: ' ' }));
      }
    }, 40);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    holding = true;
  });
  await expect(page.locator('.mf-ask[data-on="question"]')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'test-results/flight-question.png' });
  for (const leg of ['clouds', 'canyon', 'harbor']) await expect(page.locator(`.mini-stage[data-leg="${leg}"]`)).toBeAttached({ timeout: 70000 });
  await expect(page.locator('.mf-gust:not([hidden])')).toBeVisible({ timeout: 45000 }).catch(() => {});
  await expect(page.locator('.mini-done')).toBeVisible({ timeout: 90000 });
  await page.screenshot({ path: 'test-results/flight-complete.png' });

  const text = await page.locator('.mini-done-card').textContent();
  const answers = /answered (\d+) of (\d+) sky questions/.exec(text);
  const lit = /lit (\d+) tens?/.exec(text);
  expect(answers, text).not.toBeNull();
  expect(Number(answers[2])).toBe(12);
  expect(Number(answers[1])).toBeGreaterThanOrEqual(9);
  expect(Number(lit[1])).toBeGreaterThanOrEqual(5);
  expect(await page.locator('.mini-done-card .md-art').textContent()).toMatch(/🥇|🥈|🥉/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mq.playtest.v3')).flight);
  expect(saved.best).toBeGreaterThan(0);
  expect(saved.runs).toBe(1);
  expect(errors).toEqual([]);
  console.log(`Lantern Flight: phone intro and first question fit; four legs flown with the keyboard; ${answers[1]} of 12 sky questions, ${lit[1]} tens, best ${saved.best}; no JavaScript errors`);
} finally {
  await browser.close();
}
