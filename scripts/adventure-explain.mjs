// "You wanna know how?" — the step-by-step explainer, end to end in the browser.
//
// Checks the three things that make the feature safe rather than just present: the button only exists
// after the question is already scored, it is absent entirely when the explainer's own key is not set,
// and the request carries the answer the CODE computed rather than asking the model to work one out.
// The provider is never called: the route is intercepted and answered locally.
// Usage: BASE_URL=http://localhost:3001 node scripts/adventure-explain.mjs  (dev server must be running)
import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve("test-results/explain");
mkdirSync(out, { recursive: true });
const url = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errors = [];

const STEPS = { steps: ["Start with the tens you already have.", "Add the ones, then trade ten ones for a ten."], answerLine: "So the total is ANSWER in the basket." };

/** A page whose AI route answers locally. `explain` decides whether the second key is "configured". */
async function newPage(label, viewport, { explain = true } = {}) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  page.setDefaultTimeout(15000);
  const asked = [];
  page.on("pageerror", (e) => errors.push(`${label}: ${e.stack || e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${label} console: ${m.text()}`); });
  await page.route("**/api/adventure-ai", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { enabled: false, explain } });
    const body = route.request().postDataJSON();
    asked.push(body);
    if (body?.task !== "explain") return route.fulfill({ status: 503, json: { ok: false, reason: "unavailable" } });
    // Echo the answer the game sent, which is how the closing-line guard is meant to be satisfied.
    return route.fulfill({ json: { ok: true, data: { ...STEPS, answerLine: STEPS.answerLine.replace("ANSWER", String(body.answer)) } } });
  });
  await page.addInitScript(() => localStorage.setItem("mq.playtest.v3", JSON.stringify({ grade: "2", prologue: true, muted: true, hero: "🧑‍🚀", chapters: {} })));
  return { page, asked };
}

async function toFirstQuestion(page, grade) {
  await page.goto(url);
  await page.getByRole("button", { name: /Continue the adventure|Start the adventure/ }).first().click();
  // Unlock first. `MQ.openLevel` on a chapter that is still locked hangs the renderer — not reachable
  // through the UI, which only offers unlocked chapters, but every smoke script has to avoid it.
  await page.evaluate((g) => {
    window.MQClasses.switchTo(g, { quiet: true });
    window.MQS.update((s) => { for (const c of window.MQClasses.current().chapters) s.chapters[c.id] = true; });
  }, grade);
  const ids = await page.evaluate(() => window.MQClasses.current().chapters.filter((c) => c.kind === "engine").map((c) => c.id));
  // The explainer is only offered where the answer is a single value its closing line can be checked
  // against. Sorting and ordering boards have no such answer, so find a chapter that does rather than
  // asserting against whichever question happens to come first.
  for (const id of ids) {
    await page.evaluate((levelId) => window.MQ.openLevel(window.MQ.levels.find((l) => l.id === levelId)), id);
    await expect(page.locator("#cgPrompt")).toBeVisible();
    if (await page.locator("#cgBoard .cg-options, #cgBoard .cg-keypad").count()) return id;
    await page.evaluate(() => window.MQ.showMap());
  }
  throw new Error(`no chapter with a single-value answer for grade ${grade}`);
}

/** A board whose answer is a whole arrangement: the button must NOT appear on these. */
async function openSortingBoard(page) {
  const ids = await page.evaluate(() => window.MQClasses.current().chapters.filter((c) => c.kind === "engine").map((c) => c.id));
  for (const id of ids) {
    await page.evaluate((levelId) => window.MQ.openLevel(window.MQ.levels.find((l) => l.id === levelId)), id);
    await expect(page.locator("#cgPrompt")).toBeVisible();
    if (await page.locator("#cgBoard .cg-sort, #cgBoard .cg-order").count()) return true;
    await page.evaluate(() => window.MQ.showMap());
  }
  return false;
}

const solve = async (page) => {
  await page.locator('[data-cg="help"]').click();
  await page.locator('[data-cg="check"]').click();
  await expect(page.locator("#cgFeedback")).toContainText("✓ You got it!");
};

try {
  // ---- Grade 2, explainer configured ----
  {
    const { page, asked } = await newPage("grade2", { width: 1280, height: 900 });
    await toFirstQuestion(page, "2");
    const ask = page.locator('.cg-how-ask');

    // Before the question is finished there is nothing to explain, and nothing on screen offering to.
    await expect(ask).toBeHidden();
    await expect(page.locator(".cg-how")).toBeHidden();

    const question = await page.locator("#cgPrompt").textContent();
    await solve(page);
    await expect(ask).toBeVisible();
    await expect(ask).toHaveText("💡 You wanna know how?");
    expect(asked.filter((b) => b.task === "explain")).toHaveLength(0);
    await page.screenshot({ path: path.join(out, "01-offered.png") });

    await ask.click();
    await expect(page.locator(".cg-how-steps li")).toHaveCount(2);
    await expect(page.locator(".cg-how-answer")).toContainText("So the total is");
    await expect(ask).toHaveText("💡 Hide the steps");
    await page.screenshot({ path: path.join(out, "02-steps.png") });

    // What was sent: the question the child saw, and the answer the CODE computed — bounded.
    const sent = asked.find((b) => b.task === "explain");
    expect(sent.grade).toBe("2");
    expect(sent.question).toBe(question.replace(/\s+/g, " ").trim());
    expect(sent.answer.length).toBeGreaterThan(0);
    expect(sent.question.length).toBeLessThanOrEqual(300);
    expect(sent.board.length).toBeLessThanOrEqual(600);
    expect(Object.keys(sent).sort()).toEqual(["answer", "board", "firstTry", "given", "grade", "question", "skill", "task"]);

    // Toggling is free: the walk-through is kept, not re-fetched.
    await ask.click();
    await expect(page.locator(".cg-how")).toBeHidden();
    await ask.click();
    await expect(page.locator(".cg-how-steps li")).toHaveCount(2);
    expect(asked.filter((b) => b.task === "explain")).toHaveLength(1);

    // A fresh question closes it again and offers nothing until that one is solved too. Rounds vary in
    // kind inside one chapter, so the offer is asserted against what this board actually is.
    await page.locator('[data-cg="next"]').click();
    await expect(page.locator(".cg-how")).toBeHidden();
    await expect(ask).toBeHidden();
    const singleValue = await page.locator("#cgBoard .cg-options, #cgBoard .cg-keypad").count();
    await solve(page);
    if (singleValue) {
      await expect(ask).toBeVisible();
      await ask.click();
      await expect(page.locator(".cg-how-steps li")).toHaveCount(2);
      expect(asked.filter((b) => b.task === "explain")).toHaveLength(2);
    } else {
      await expect(ask).toBeHidden();
      expect(asked.filter((b) => b.task === "explain")).toHaveLength(1);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.close();
  }

  // ---- A sorting board offers nothing, deliberately ----
  {
    const { page, asked } = await newPage("sorting", { width: 1280, height: 900 });
    await page.goto(url);
    await page.getByRole("button", { name: /Continue the adventure|Start the adventure/ }).first().click();
    await page.evaluate(() => {
      window.MQClasses.switchTo("2", { quiet: true });
      window.MQS.update((s) => { for (const c of window.MQClasses.current().chapters) s.chapters[c.id] = true; });
    });
    if (await openSortingBoard(page)) {
      await solve(page);
      // No single answer means the closing-line guard could not hold, so the offer is withheld rather
      // than made with the guard switched off.
      await expect(page.locator('.cg-how-ask')).toBeHidden();
      expect(asked.filter((b) => b.task === "explain")).toHaveLength(0);
      await page.screenshot({ path: path.join(out, "05-sorting-excluded.png") });
    }
    await page.close();
  }

  // ---- The second key is not set: the button does not exist at all ----
  {
    const { page, asked } = await newPage("nokey", { width: 1280, height: 900 }, { explain: false });
    await toFirstQuestion(page, "2");
    await solve(page);
    await expect(page.locator('.cg-how-ask')).toBeHidden();
    await expect(page.locator(".cg-how")).toBeHidden();
    expect(asked.filter((b) => b.task === "explain")).toHaveLength(0);
    await page.screenshot({ path: path.join(out, "03-no-key.png") });
    await page.close();
  }

  // ---- Kindergarten on a phone: read-aloud, and the panel fits ----
  {
    const { page } = await newPage("phoneK", { width: 390, height: 844 });
    await toFirstQuestion(page, "K");
    await solve(page);
    await page.locator('.cg-how-ask').click();
    await expect(page.locator(".cg-how-steps li").first()).toBeVisible();
    await expect(page.locator(".cg-how-listen")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(out, "04-phone-k.png") });
    await page.close();
  }

  // ---- Grade 5 gets no read-aloud button: it is there for the children who cannot read the steps ----
  {
    const { page } = await newPage("grade5", { width: 1280, height: 900 });
    await toFirstQuestion(page, "5");
    await solve(page);
    await page.locator('.cg-how-ask').click();
    await expect(page.locator(".cg-how-steps li").first()).toBeVisible();
    await expect(page.locator(".cg-how-listen")).toHaveCount(0);
    await page.close();
  }

  // ---- Every other surface that asks a question: the offer must exist there too ----
  // The first version of this feature lived only in class-games.js, so a voyage mission showed nothing.
  {
    const { page, asked } = await newPage("surfaces", { width: 1280, height: 900 });
    await page.goto(url);
    await page.getByRole("button", { name: /Continue the adventure|Start the adventure/ }).first().click();
    await page.evaluate(() => {
      window.MQClasses.switchTo("4", { quiet: true });
      window.MQS.update((s) => { s.unlockAll = true; for (const c of window.MQClasses.current().chapters) s.chapters[c.id] = true; });
    });

    // A voyage mission (the bridge / rail / robot chapters from the original adventure).
    const voyage = await page.evaluate(() => (window.MQ.levels.find((l) => l.id === "cloudbridge") || window.MQ.levels.find((l) => l.stageClass === "voyage-stage") || {}).id);
    if (!voyage) throw new Error("no voyage mission registered");
    await page.evaluate((id) => window.MQ.openLevel(window.MQ.levels.find((l) => l.id === id)), voyage);
    await expect(page.locator(".vg-shell")).toBeVisible();
    await expect(page.locator(".cg-how-ask")).toBeHidden();
    // "Build it with Hoot" is a hint here, not an auto-solve, so the bridge has to be built for real:
    // read the gap in twelfths off the board and lay planks that add up to it.
    const target = await page.evaluate(() => Math.round(parseFloat(document.querySelector(".bridge-gap").style.width) * 12 / 100));
    const planks = await page.evaluate(() => [...document.querySelectorAll('[data-vg="plank"]')].map((b) => Number(b.dataset.n)));
    const needTwo = (await page.locator(".vg-mission p").textContent()).includes("at least two");
    let combo = null;
    (function search(left, start, acc) {
      if (combo || left < 0 || acc.length > 6) return;
      if (left === 0 && (!needTwo || acc.length >= 2)) { combo = [...acc]; return; }
      for (let i = start; i < planks.length && !combo; i++) { acc.push(planks[i]); search(left - planks[i], i, acc); acc.pop(); }
    })(target, 0, []);
    if (!combo) throw new Error(`no plank combination reaches ${target}/12 from ${planks}`);
    for (const n of combo) await page.locator(`[data-vg="plank"][data-n="${n}"]`).click();
    await page.locator('[data-vg="launch"]').click();
    await expect(page.locator(".vg-feedback[data-state=correct]")).toBeVisible({ timeout: 25000 });
    await expect(page.locator(".cg-how-ask")).toBeVisible();
    await page.locator(".cg-how-ask").click();
    await expect(page.locator(".cg-how-steps li").first()).toBeVisible();
    expect(asked.filter((b) => b.task === "explain").pop().answer.length).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(out, "06-voyage.png") });
    await page.evaluate(() => window.MQ.showMap());

    // A learning trail.
    // Trails and the Arena: presence, not a full play-through.
    //
    // Both need per-concept manipulation to reach a correct answer (a trail's "Show me a step" nudges the
    // model rather than solving it), which is more test machinery than it is worth here. What IS asserted
    // is the thing that actually broke: the control must EXIST on the surface and start hidden. A surface
    // that was never wired has no `.cg-how-ask` in its DOM at all — that is exactly what the owner hit on
    // a voyage mission, and this catches it. The solved-state behaviour is covered end to end by the class
    // and voyage sections above, which share one implementation with these.
    for (const [label, id, ready] of [
      ["trail", await page.evaluate(() => (window.MQ.levels.find((l) => l.stageClass === "trail-stage" && l.pathway) || {}).id), "#trailPrompt"],
    ]) {
      if (!id) throw new Error(`no ${label} level registered`);
      await page.evaluate((levelId) => window.MQ.openLevel(window.MQ.levels.find((l) => l.id === levelId)), id);
      await expect(page.locator(ready)).toBeVisible();
      await expect(page.locator(".cg-how-ask")).toHaveCount(1);
      await expect(page.locator(".cg-how-ask")).toBeHidden();
      await page.screenshot({ path: path.join(out, `07-${label}-wired.png`) });
      await page.evaluate(() => window.MQ.showMap());
    }
    await page.close();
  }

  // ---- The standalone Arena, which only opens when no class is chosen ----
  {
    const { page } = await newPage("arena", { width: 1280, height: 900 });
    await page.addInitScript(() => localStorage.setItem("mq.playtest.v3", JSON.stringify({ prologue: true, muted: true, hero: "🧑‍🚀", chapters: {} })));
    await page.goto(url);
    await page.getByRole("button", { name: /Continue the adventure|Start the adventure/ }).first().click();
    const arena = await page.evaluate(() => (window.MQ.levels.find((l) => l.id === "arena") || {}).id);
    if (!arena) throw new Error("no arena level registered");
    await page.evaluate(() => window.MQ.openLevel(window.MQ.levels.find((l) => l.id === "arena")));
    await expect(page.locator("#arEquation")).toBeVisible();
    await expect(page.locator(".cg-how-ask")).toHaveCount(1);
    await expect(page.locator(".cg-how-ask")).toBeHidden();
    await page.screenshot({ path: path.join(out, "08-arena-wired.png") });
    await page.close();
  }

  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Explainer passed: offered only after scoring, hidden with no key, bounded request carrying the code's answer, cached on toggle, read-aloud for the youngest, phone layout. Screenshots: ${out}`);
} finally {
  await browser.close();
}
