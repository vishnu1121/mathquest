// Muddle Monster Arena in the browser: the Arena tab, Elo-matched problems, hesitation and error scaffolding,
// rule-based and AI diagnoses, Hoot as an always-present companion (start, pause, draft, mistake, boss move and
// "Help me think"), all three boss mechanics, saved evidence and results.
// AI requests are mocked, so this check never makes a paid request.
// Usage: BASE_URL=http://localhost:3001 node scripts/adventure-arena.mjs  (dev server must be running)
import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve("test-results/arena");
mkdirSync(out, { recursive: true });
const url = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errors = [];
const gcd = (x, y) => (y ? gcd(y, x % y) : x);
const lcm = (x, y) => (x * y) / gcd(x, y);

async function run({ label, width, height, reducedMotion, ai }) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(`${label}: ${e.stack || e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${label} console: ${m.text()}`); });
  const requests = [];
  let diagnoseCode = "ERR_ADD_CARRY";
  await page.route("**/api/adventure-ai", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { enabled: ai } });
    const body = route.request().postDataJSON();
    requests.push(body);
    if (body.task === "companion") {
      const p = body.problem;
      const mistake = p.kind === "add" ? `When ${p.a % 10} ones and ${p.b % 10} ones make ten or more, where should the new ten go?`
        : p.kind === "sub" ? "How could you get enough ones on top before taking some away?" : "Is one slice from each pizza the same size?";
      const question = { mistake, hesitate: "Which part of the problem will you look at first?", boss: "What could you do with the blocks you see right now?", ask: "What is one small step you could try next?" }[body.moment];
      return route.fulfill({ json: { ok: true, data: { question } } });
    }
    if (body.task === "diagnose") return route.fulfill({ json: { ok: true, data: { code: diagnoseCode, label: "mock", boss: null, mechanic: null, event: null, source: "ai" } } });
    return route.fulfill({ json: { ok: false, reason: "rejected" } });
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem("mq.playtest.v3")) localStorage.setItem("mq.playtest.v3", JSON.stringify({ prologue: true, hero: "🧑‍🚀", muted: true, grade: "3", chapters: {} }));
  });
  const shot = (name) => page.screenshot({ path: path.join(out, `${label}-${name}.png`), fullPage: true });
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("mq.playtest.v3")));
  const eq = page.locator("#arEquation");
  const hoot = page.locator("#companion");
  const said = page.locator("#companionText");
  const companionRequests = (moment) => requests.filter((r) => r.task === "companion" && r.moment === moment);
  const problem = () => eq.evaluate((el) => {
    const p = { kind: el.dataset.kind, a: Number(el.dataset.a), b: Number(el.dataset.b) };
    return p.kind === "frac" ? { ...p, c: Number(el.dataset.c), d: Number(el.dataset.d) } : p;
  });
  const correct = (p) => {
    if (p.kind === "add") return String(p.a + p.b);
    if (p.kind === "sub") return String(p.a - p.b);
    const common = lcm(p.b, p.d);
    return `${(p.a * common) / p.b + (p.c * common) / p.d}/${common}`;
  };
  const answer = async (text) => { await page.locator("#arInput").fill(text); await page.locator("#arForm .ar-submit").click(); };
  const attack = async (text) => { await page.locator("#arBossInput").fill(text); await page.locator("#arBossForm .ar-submit").click(); };
  const enter = async (rating) => {
    if (rating) await page.evaluate((r) => sessionStorage.setItem("mq.arena.elo", JSON.stringify({ version: 1, rating: r, start: r, history: [] })), rating);
    await page.locator('[data-world-view="arena"]').click();
    await expect(page.locator("#arenaLanding")).toBeVisible();
    await page.locator(".ar-start").click();
    await expect(eq).toBeVisible();
  };
  const leave = async () => { await page.locator("#homeBtn").click(); await expect(page.locator("#arenaLanding")).toBeVisible(); };
  const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  /** Hoot must be on screen, whatever the child scrolled to. */
  const hootInView = async () => {
    const box = await hoot.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    return box;
  };

  try {
    await page.goto(url);
    await page.getByRole("button", { name: "Continue the adventure" }).click();
    await expect(page.locator(".title-screen")).toHaveCount(0);
    await expect(page.locator(".voyage-nav button")).toHaveCount(6);
    await page.locator('[data-world-view="arena"]').click();
    await expect(page.locator("#arenaTitle")).toContainText("Mix-ups make monsters");
    await expect(page.locator(".ar-monster")).toHaveCount(3);
    await expect(page.locator("[data-landing-rating]")).toHaveText("1000");
    await expect(page.locator(".ar-status")).toContainText(ai ? "AI companion connected" : "Built-in mode");
    await noOverflow();
    await shot("01-landing");

    // ---- Carry Colossus: Hoot from the first second, Elo pick, rule diagnosis, companion questions, bundle mechanic ----
    await page.locator(".ar-start").click();
    await expect(eq).toHaveAttribute("data-kind", "add");
    await expect(page.locator("#arTitle")).toHaveText("Addition with carrying");
    await expect(page.locator("#arRating")).toHaveText("1000");
    await expect(page.locator("#arTierLabel")).toHaveText("0 · Equation");
    await expect(hoot).toBeVisible();
    await expect(hoot).toHaveAttribute("data-moment", "start");
    await expect(said).toContainText("?");
    await expect(page.locator("#companionSees")).toContainText("first try");
    await expect(hoot.locator("#hootBtn")).toBeVisible();
    await hootInView();
    if (reducedMotion !== "reduce") {
      await expect(eq).toHaveAttribute("data-tier", "1", { timeout: 9000 });
      await expect(page.locator("#arTierLabel")).toHaveText("1 · Highlight");
      await expect(hoot).toHaveAttribute("data-moment", "hesitate");
      if (ai) {
        await expect(hoot).toHaveAttribute("data-source", "ai");
        expect(companionRequests("hesitate")[0]).toMatchObject({ tier: 1, wrongAnswers: [], code: null, bossStep: null });
      }
      await shot("02-hesitation-highlight");
    }
    const carry = await problem();
    const dropped = String(carry.a + carry.b - 10);
    for (const digit of dropped) await page.locator(`#arForm [data-key="${digit}"]`).click();
    await expect(page.locator("#arInput")).toHaveValue(dropped);
    await page.locator("#arForm .ar-submit").click();
    await expect(page.locator("#arRating")).toHaveText("984");
    await expect(page.locator("#arChange")).toHaveText("↓ -16");
    await expect(page.locator("#arDiagnosis")).toHaveAttribute("data-code", "ERR_ADD_CARRY");
    await expect(page.locator("#arDiagnosis")).toHaveAttribute("data-source", "rules");
    await expect(page.locator("#arDiagnosis")).toContainText("FOUND INSTANTLY BY CODE");
    await expect(page.locator("#arScaffold")).toHaveAttribute("data-tier", "2");
    await expect(page.locator("#arScaffold .ar-rod")).not.toHaveCount(0);
    await expect(hoot).toHaveAttribute("data-moment", "mistake");
    await expect(said).toContainText("?");
    if (ai) {
      await expect(hoot).toHaveAttribute("data-source", "ai");
      await expect(page.locator("#companionTitle")).toContainText("AI COMPANION");
      expect(companionRequests("mistake")[0]).toMatchObject({ code: "ERR_ADD_CARRY", tier: 2, problem: carry, wrongAnswers: [dropped], bossStep: null });
      expect(requests.some((r) => r.task === "diagnose")).toBe(false);
    } else {
      await expect(hoot).toHaveAttribute("data-source", "built-in");
    }
    await expect(page.locator("#arBoss")).toHaveAttribute("data-boss", "carry-colossus");
    await expect(page.locator("#arBoss")).toHaveAttribute("data-event", "SPAWN_CARRY_COLOSSUS");
    await expect(page.locator("#arForm")).toBeHidden();
    await expect(page.locator("#companionSees")).toContainText("next move: bundle ten ones");
    const dock = await hootInView();
    await expect.poll(async () => (await page.locator("#arBoss").boundingBox()).y + 40 <= dock.y).toBe(true);
    await noOverflow();
    await shot("03-diagnosis-question-boss");
    await page.locator('[data-boss-act="bundle"]').click();
    await expect(page.locator("#arBoss")).toHaveAttribute("data-armor", "1");
    await expect(hoot).toHaveAttribute("data-moment", "boss");
    await expect(page.locator("#companionSees")).toContainText("next move: count and attack");
    await attack(dropped);
    await expect(page.locator(".ar-boss-say")).toContainText("bounces off");
    if (ai) await expect.poll(() => companionRequests("boss").at(-1)).toMatchObject({ bossStep: "count", code: "ERR_ADD_CARRY", wrongAnswers: [dropped, dropped] });
    await hootInView();
    await attack(String(carry.a + carry.b));
    await expect(page.locator(".ar-boss-say")).toContainText("defeated");
    await expect(page.locator("#arFeedback")).toContainText("✓");
    await expect(hoot).toHaveAttribute("data-moment", "solved");
    await expect(page.locator("#arNext")).toBeVisible();
    await shot("04-colossus-defeated");
    let state = await saved();
    expect(state.arena.bosses["carry-colossus"]).toBe(1);
    const regroup = state.learning.skills.regroup.recent;
    expect(regroup.slice(-3).map((r) => [r.correct, r.independent])).toEqual([[false, false], [false, false], [true, false]]);

    // ---- A quick correct answer raises the rating and leaves help at tier 0 ----
    await page.locator("#arNext").click();
    await expect(hoot).toHaveAttribute("data-moment", "start");
    const second = await problem();
    await answer(correct(second));
    await expect(page.locator("#arChange")).toContainText("↑");
    expect(Number(await page.locator("#arRating").textContent())).toBeGreaterThan(984);
    await expect(eq).toHaveAttribute("data-tier", "0");
    for (let i = 2; i < 6; i++) {
      await page.locator("#arNext").click();
      await answer(correct(await problem()));
      await expect(page.locator("#arNext")).toBeVisible();
    }
    await expect(page.locator("#arNext")).toHaveText("See my results →");
    const finalRating = await page.locator("#arRating").textContent();
    await page.locator("#arNext").click();
    await expect(page.locator("#result")).toBeVisible();
    await expect(page.locator(".result-chapter")).toHaveText("MUDDLE MONSTER ARENA");
    await expect(page.locator(".result-note")).toContainText(`Challenge level 1000 → ${finalRating}`);
    await expect(page.locator(".result-note")).toContainText("1 monster defeated");
    await shot("05-result");
    await page.getByRole("button", { name: "Back to the arena" }).click();
    await expect(page.locator("#arenaLanding")).toBeVisible();
    await expect(page.locator('[data-boss-card="carry-colossus"]')).toHaveAttribute("data-met", "true");
    await expect(page.locator('[data-boss-card="carry-colossus"] .ar-monster-status')).toContainText("Defeated 1×");
    await expect(page.locator("[data-landing-rating]")).toHaveText(finalRating);

    // ---- Borrowing Behemoth: shatter a ten before taking away ones; Hoot follows each move ----
    await enter(1100);
    await expect(page.locator("#arTitle")).toHaveText("Subtraction with borrowing");
    const borrow = await problem();
    const flipped = (Math.floor(borrow.a / 10) - Math.floor(borrow.b / 10)) * 10 + ((borrow.b % 10) - (borrow.a % 10));
    await answer(String(flipped));
    await expect(page.locator("#arDiagnosis")).toHaveAttribute("data-code", "ERR_SUB_BORROW");
    await expect(page.locator("#arBoss")).toHaveAttribute("data-boss", "borrowing-behemoth");
    await expect(page.locator("#companionSees")).toContainText("next move: shatter a ten");
    await page.locator('[data-boss-act="ones"]').click();
    await expect(page.locator(".ar-boss-say")).toContainText("Only");
    await expect(hoot).toHaveAttribute("data-moment", "boss");
    if (ai) await expect.poll(() => companionRequests("boss").at(-1)).toMatchObject({ bossStep: "shatter", code: "ERR_SUB_BORROW", problem: borrow });
    await page.locator('[data-boss-act="shatter"]').click();
    await expect(page.locator('[data-boss-act="shatter"]')).toBeDisabled();
    await expect(page.locator("#companionSees")).toContainText("next move: take away ones");
    await page.locator('[data-boss-act="ones"]').click();
    await expect(page.locator("#companionSees")).toContainText("next move: take away tens");
    await page.locator('[data-boss-act="tens"]').click();
    await attack(String(borrow.a - borrow.b));
    await expect(page.locator(".ar-boss-say")).toContainText("defeated");
    await shot("06-behemoth-defeated");
    state = await saved();
    expect(state.curriculum.trails.subtraction.recent.at(-1)).toMatchObject({ correct: true, independent: false, mode: "arena-equation" });
    await leave();

    // ---- Denominator Demon: Hoot reads a fraction typed without a slash; a wrong slice size taunts ----
    await enter(1350);
    await expect(page.locator("#arTitle")).toHaveText("Adding fractions with different denominators");
    const pizza = await problem();
    await page.locator("#arInput").fill(`${pizza.a + pizza.c}${pizza.b + pizza.d}`);
    await expect(said).toContainText("slash");
    await expect(hoot).toHaveAttribute("data-moment", "draft");
    await answer(`${pizza.a + pizza.c}/${pizza.b + pizza.d}`);
    await expect(page.locator("#arDiagnosis")).toHaveAttribute("data-code", "ERR_ADD_DENOMINATOR");
    await expect(page.locator("#arBoss")).toHaveAttribute("data-boss", "denominator-demon");
    const sizes = (await page.locator(".ar-slices button").allTextContents()).map((t) => Number(t.match(/\d+/)[0]));
    const common = lcm(pizza.b, pizza.d);
    const badSize = sizes.find((s) => s % pizza.b || s % pizza.d);
    await page.locator(`[data-boss-act="slice"][data-size="${badSize}"]`).click();
    await expect(page.locator(".ar-boss-say")).toContainText("can’t be re-cut");
    await page.locator(`[data-boss-act="slice"][data-size="${common}"]`).click();
    await expect(page.locator("#companionSees")).toContainText("next move: put the slices together");
    await page.locator('[data-boss-act="combine"]').click();
    await expect(page.locator("#arBossForm [data-key='/']")).toBeVisible();
    await attack(`${(pizza.a * common) / pizza.b + (pizza.c * common) / pizza.d}/${common}`);
    await expect(page.locator(".ar-boss-say")).toContainText("defeated");
    await shot("07-demon-defeated");
    await leave();

    // ---- Unknown answers: AI diagnosis when connected, rejected labels, a repeated draft, "Help me think", grouped blocks ----
    await enter(1000);
    const unknown = await problem();
    await answer(String(unknown.a + unknown.b - 9));
    let retry = unknown;
    if (ai) {
      await expect(page.locator("#arDiagnosis")).toHaveAttribute("data-source", "ai");
      await expect(page.locator("#arDiagnosis")).toContainText("FOUND BY AI");
      await expect(page.locator("#arBoss")).toHaveAttribute("data-boss", "carry-colossus");
      expect(requests.filter((r) => r.task === "diagnose").at(-1)).toMatchObject({ problem: unknown, answer: String(unknown.a + unknown.b - 9) });
      await leave();
      diagnoseCode = "ERR_ADD_DENOMINATOR";
      await enter(1000);
      retry = await problem();
      await answer(String(retry.a + retry.b - 9));
      await expect(page.locator("#arDiagnosis")).toContainText("The blocks and Hoot’s questions can help you find it");
    }
    await expect(page.locator("#arDiagnosis")).toHaveAttribute("data-code", "ERR_UNKNOWN");
    await expect(page.locator("#arBoss")).toBeHidden();
    await page.locator("#arInput").fill(String(retry.a + retry.b - 9));
    await expect(said).toContainText(`already tried ${retry.a + retry.b - 9}`);
    await expect(hoot).toHaveAttribute("data-moment", "draft");
    await page.locator("#companionHelp").click();
    await expect(hoot).toHaveAttribute("data-moment", "ask");
    await expect(said).toContainText("?");
    if (ai) await expect.poll(() => companionRequests("ask").at(-1)).toMatchObject({ problem: retry, code: "ERR_UNKNOWN", tier: 2, bossStep: null });
    await answer(String(retry.a + retry.b - 8));
    await expect(page.locator("#arScaffold")).toHaveAttribute("data-tier", "3");
    await expect(page.locator("#arScaffold .ar-ten-group")).toHaveCount(1);
    await expect(page.locator("#arTierLabel")).toHaveText("3 · Blocks by tens");
    await hootInView();
    await noOverflow();
    await shot("08-grouped-blocks");
    await leave();

    if (!ai) expect(requests).toEqual([]);
    for (const button of await page.locator(".voyage-nav button").all()) {
      const box = await button.boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
      expect(box.height).toBeGreaterThanOrEqual(48);
    }
    console.log(`${label}: arena tab, Elo, scaffolds, ${ai ? "AI and rule" : "rule"} diagnoses, always-present companion (start, ${reducedMotion !== "reduce" ? "pause, " : ""}draft, mistake, boss, help), three bosses, evidence and results passed`);
  } catch (error) {
    await shot("FAIL").catch(() => {});
    throw error;
  } finally {
    await page.close();
  }
}

try {
  await run({ label: "desktop-ai", width: 1440, height: 900, reducedMotion: "no-preference", ai: true });
  await run({ label: "phone-offline", width: 390, height: 844, reducedMotion: "reduce", ai: false });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("No JavaScript errors. AI requests were mocked; no provider calls.");
} finally {
  await browser.close();
}
