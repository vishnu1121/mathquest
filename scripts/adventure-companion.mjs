// Hoot as a companion across the game: the same bar in a story chapter, a practice trail, a Skybound mission and
// a Place to Grow mission. It checks that the bar never covers the controls, that "Hoot sees" follows the child's
// moves, and that Hoot speaks up after a pause, a request for help, a miss and a success.
// AI is switched off, so no provider request is made.
// Usage: BASE_URL=http://localhost:3001 node scripts/adventure-companion.mjs  (dev server must be running)
import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve("test-results/companion");
mkdirSync(out, { recursive: true });
const url = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errors = [];

async function run({ label, width, height, reducedMotion }) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(`${label}: ${e.stack || e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${label} console: ${m.text()}`); });
  const posts = [];
  await page.route("**/api/adventure-ai", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { enabled: false } });
    posts.push(route.request().postDataJSON());
    return route.fulfill({ status: 503, json: { ok: false, reason: "unavailable" } });
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem("mq.playtest.v3")) localStorage.setItem("mq.playtest.v3", JSON.stringify({ prologue: true, hero: "🧑‍🚀", muted: true, unlockAll: true, grade: "1", chapters: {} }));
  });
  const bar = page.locator("#companion"), said = page.locator("#companionText"), sees = page.locator("#companionSees");
  const shot = (name) => page.screenshot({ path: path.join(out, `${label}-${name}.png`) });
  // Opens a level the way the map does; the promise is not awaited because a story intro may wait for the child.
  const open = (id) => page.evaluate((levelId) => { window.MQ.openLevel(window.MQ.levels.find((l) => l.id === levelId)); }, id);
  // Each story chapter lives in one class: switch to it, marking chapters finished so their story intro is skipped.
  const enterClass = (grade, done = []) => page.evaluate(([g, ids]) => { window.MQClasses.switchTo(g, { quiet: true }); window.MQS.update((s) => { for (const id of ids) s.chapters[id] = true; }); }, [grade, done]);
  const home = async () => { await page.locator("#homeBtn").click(); await expect(page.locator("#levelScreen")).toBeHidden(); };
  /** The bar sits at the bottom of the screen, and a control the child needs can still be clicked. */
  const clearOf = async (control) => {
    const box = await bar.boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    await control.click({ trial: true });
  };
  const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const river = async () => {
    const text = await sees.textContent();
    const m = /is on (\d+) · (\d+) to go/.exec(text);
    if (!m) throw new Error(`Unexpected river status: ${text}`);
    return { pos: Number(m[1]), toGo: Number(m[2]) };
  };

  try {
    await page.goto(url);
    await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
    await expect(page.locator(".title-screen")).toHaveCount(0);

    // ---- Chapter 1: Hoot watches the river ----
    await open("frog");
    await page.getByRole("button", { name: "Skip story", exact: true }).click();
    await expect(page.locator(".story")).toHaveCount(0);
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute("data-moment", "start");
    await expect(said).toContainText("I’m right here with you");
    await expect(sees).toContainText(/is on \d+ · \d+ to go/);
    await expect(page.locator("#oneBtn")).toBeEnabled();
    await clearOf(page.locator("#oneBtn"));
    await clearOf(page.locator("#tenBtn"));
    await noOverflow();
    await shot("01-river-start");
    const before = await river();
    await page.locator("#oneBtn").click();
    await expect(sees).toContainText(`is on ${before.pos + 1} ·`);
    // A pause: Hoot asks about the river without giving the landing pad away.
    await expect(bar).toHaveAttribute("data-moment", "hesitate", { timeout: 14000 });
    await expect(said).toContainText("?");
    await shot("02-river-pause");
    await page.locator("#companionHelp").click();
    await expect(bar).toHaveAttribute("data-moment", "ask");
    await expect(said).not.toBeEmpty();
    expect((await page.evaluate(() => JSON.parse(localStorage.getItem("mq.playtest.v3")))).stats.hootAsks).toBeGreaterThanOrEqual(1);
    // A miss (a big hop past the target), then hopping back to catch it.
    let { toGo } = await river();
    while (toGo >= 10) {
      await page.locator("#oneBtn").click();
      toGo -= 1;
      await expect(sees).toContainText(` ${toGo} to go`);
    }
    await page.locator("#tenBtn").click();
    await expect(sees).toContainText(`${10 - toGo} too far`);
    await expect(bar).toHaveAttribute("data-moment", "mistake");
    await shot("03-river-miss");
    for (let i = 0; i < 10 - toGo; i++) await page.locator("#backBtn").click();
    await expect(bar).toHaveAttribute("data-moment", /^(solved|streak)$/);
    await home();

    // ---- A practice trail ----
    await page.evaluate(() => { window.MQ.openLevel(window.MQ.levels.find((l) => l.stageClass === "trail-stage" && l.id !== "expedition")); });
    await expect(bar).toHaveAttribute("data-moment", "start");
    await expect(said).toContainText("What is one thing you could try on the board first?");
    await expect(sees).toContainText("discovery 1 of 5");
    await clearOf(page.locator('[data-action="check"]'));
    await noOverflow();
    await shot("04-trail");
    await home();

    // ---- Skybound: the number rail ----
    await enterClass("2", ["skyrail"]);
    await open("skyrail");
    await expect(sees).toContainText("Train leaves");
    await expect(sees).toContainText(" 0 of ");
    await page.locator('[data-vg="gate"]').first().click();
    await expect(sees).toContainText(" 1 of ");
    await clearOf(page.locator('[data-vg="launch"]'));
    await noOverflow();
    await shot("05-rail");
    await home();

    // ---- A Place to Grow: the garden ----
    await enterClass("3", ["garden"]);
    await open("garden");
    await expect(sees).toContainText(/^Hoot sees: 0 of \d+ squares/);
    await page.locator("#fg-cell-12").click();
    await expect(sees).toContainText(/^Hoot sees: 1 of \d+ squares/);
    await clearOf(page.locator('[data-fg="check"]'));
    await noOverflow();
    await shot("06-garden");
    await home();

    expect(posts).toEqual([]);
    console.log(`${label}: one Hoot bar in a chapter, a trail, a Skybound and a Place to Grow mission; sees, pause, help, miss and success passed`);
  } catch (error) {
    await shot("FAIL").catch(() => {});
    throw error;
  } finally {
    await page.close();
  }
}

try {
  await run({ label: "tablet", width: 1180, height: 820, reducedMotion: "no-preference" });
  await run({ label: "phone", width: 390, height: 844, reducedMotion: "reduce" });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("No JavaScript errors. AI was off; no provider calls.");
} finally {
  await browser.close();
}
