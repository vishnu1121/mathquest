// Apex Mode, the rare gems and AI-written questions, end to end in a real browser.
//
// What this proves, in order of how much it would hurt to get wrong:
//   1. Kindergarten, Grade 1 and Grade 2 can see and open the Apex tab, and are told plainly that it
//      arrives in Grade 3. No Apex level is registered for them and none can be opened.
//   2. Apex stays shut until the whole island is finished, and then opens.
//   3. A generated question really reaches the board, and a question the model got WRONG never does.
//   4. Gameplay is identical with generation switched off: same boards, no stall, no error.
//   5. The full Apex journey pays out gems the way the rules say, ends in the Nova Gem, and the vault
//      keeps the undiscovered ones secret.
//   6. The navigation bar still fits on a phone with Apex on it. Measured, not eyeballed.
//
// The provider is never called: the route is intercepted and answered locally.
// Usage: BASE_URL=http://localhost:3001 node scripts/adventure-apex.mjs  (dev server must be running)
import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve("test-results/apex");
mkdirSync(out, { recursive: true });
const url = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errors = [];
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false });

/** An answer that is right for the format the game asked for, so the mock is always solvable. */
const ANSWER = { int: "19", decimal: "1.5", fraction: "3/4" };

/**
 * A page whose AI route answers locally.
 *   generate:false  — no question writer configured, so every question comes from the bank.
 *   rejected:true   — both writers answered with something the SERVER could not re-solve, so the route
 *                     says so. This is the common case in real use and must be invisible to the child.
 *   corrupt:true    — the route answers ok with a task that is structurally broken. Only a mangled
 *                     response or a stale bundle does this, and the client's own guard has to catch it.
 */
async function newPage(label, viewport, { generate = true, rejected = false, corrupt = false } = {}) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  page.setDefaultTimeout(15000);
  const asked = [];
  page.on("pageerror", (e) => errors.push(`${label}: ${e.stack || e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${label} console: ${m.text()}`); });
  await page.route("**/api/adventure-ai", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { enabled: false, explain: false, generate } });
    const body = route.request().postDataJSON();
    if (body?.task !== "generate") return route.fulfill({ status: 503, json: { ok: false, reason: "unavailable" } });
    asked.push(body);
    // What the route really returns when neither writer produced a question that re-solves.
    if (rejected) return route.fulfill({ json: { ok: false, reason: "rejected" } });
    const answer = ANSWER[body.format] || "19";
    const prompt = `Fresh question ${asked.length}: Pip counts 12 shells and finds 7 more baskets. What is the total?`;
    const task = corrupt
      // A choice board whose answer names an option that is not there: validateTask refuses it.
      ? { kind: "choice", skill: body.skill, prompt, hint: "h", explain: "e", options: [{ id: "g0", label: "4" }, { id: "g1", label: "3" }], answer: "g7" }
      : body.kind === "choice"
        ? { kind: "choice", skill: body.skill, prompt, hint: "h", explain: "e", options: [{ id: "g0", label: answer }, { id: "g1", label: "3" }], answer: "g0" }
        : { kind: "number", skill: body.skill, prompt, answer, format: body.format, hint: "h", explain: "e", visual: { type: "story", emoji: "🐚" } };
    return route.fulfill({ json: { ok: true, data: { task, fingerprint: `fp-${asked.length}` } } });
  });
  return { page, asked };
}

/** Arrive in a class, optionally with the whole island already finished. */
async function arrive(page, grade, { islandDone = false } = {}) {
  await page.addInitScript(() => localStorage.setItem("mq.playtest.v3", JSON.stringify({ grade: "3", prologue: true, muted: true, hero: "🧑‍🚀", chapters: {} })));
  await page.goto(url);
  await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
  await page.evaluate(([g, done]) => {
    window.MQClasses.switchTo(g, { quiet: true });
    if (done) window.MQS.update((s) => { for (const c of window.MQClasses.current().chapters) s.chapters[c.id] = true; });
    window.MQApex.syncNav();
    window.MQApex.renderPanel();
  }, [grade, islandDone]);
}

const apexTab = (page) => page.locator('[data-world-view="apex"]');

/** Answer the question on screen by asking to be shown, then checking. Works for every board kind. */
async function solveRound(page) {
  await expect(page.locator("#cgPrompt")).toBeVisible();
  await page.locator('[data-cg="help"]').click();
  await page.locator('[data-cg="check"]').click();
  await expect(page.locator('[data-cg="next"]')).toBeVisible();
}

/** Play one whole Apex quest, clicking through any treasure that turns up. Returns the gems revealed. */
async function playQuest(page) {
  const found = [];
  for (let round = 0; round < 5; round++) {
    await solveRound(page);
    await page.locator('[data-cg="next"]').click();
  }
  // A gem reveal, and then possibly the island's own treasure, come before the result card.
  for (let guard = 0; guard < 6; guard++) {
    const reveal = page.locator("dialog.apex-reveal[open]");
    if (!(await reveal.count())) break;
    if (await page.locator("dialog.apex-found[open]").count()) {
      // By id, not by tag: roaming-hoot.js re-parents Hoot's bar into any open dialog, heading and all.
      found.push((await page.locator("dialog.apex-found[open] #apexDialogTitle").textContent())?.trim());
    }
    await reveal.locator(".vp-actions button").first().click();
    await page.waitForTimeout(120);
  }
  await expect(page.locator("#result .result-card")).toBeVisible();
  await page.locator('#result [data-act="go"]').click();
  return found;
}

// ---------- 1. The younger classes can look, and are told why they cannot play ----------
{
  const { page } = await newPage("young", { width: 1280, height: 860 });
  for (const grade of ["K", "1", "2"]) {
    await arrive(page, grade, { islandDone: true });
    // Visible and reachable: a mode you cannot see is a mode you cannot look forward to.
    await expect(apexTab(page)).toBeVisible();
    await apexTab(page).click();
    await expect(page.locator("#apexPanel")).toContainText("Grade 3");
    // Tapping a quest says what opens it, rather than doing nothing.
    await page.locator("#apexPanel [data-apex-locked]").first().click();
    await expect(page.locator("dialog.apex-locked-note[open]")).toBeVisible();
    await expect(page.locator("dialog.apex-locked-note[open]")).toContainText("Grades 3, 4 and 5");
    await page.locator("dialog.apex-locked-note[open] .vp-actions button").last().click();
    // But nothing is playable, and a finished island does not change that.
    const registered = await page.evaluate(() => window.MQ.levels.filter((l) => l.id.startsWith("apex-") && l.grade === window.MQClasses.grade()).length);
    if (registered !== 0) throw new Error(`grade ${grade} has ${registered} apex levels registered`);
    await page.evaluate(() => window.MQ.openLevel(window.MQ.levels.find((l) => l.id.startsWith("apex-"))));
    await expect(page.locator("#mapScreen")).toBeVisible();
    if (await page.evaluate(() => Boolean(window.MQApex.offered()))) throw new Error(`grade ${grade} is offered Apex`);
    if (await page.evaluate(() => Boolean(window.MQApex.unlocked()))) throw new Error(`grade ${grade} unlocked Apex`);
  }
  await shot(page, "01-young-classes-can-look");
  await page.close();
}

// ---------- 2. Locked until the island is finished ----------
{
  const { page } = await newPage("locked", { width: 1280, height: 860 });
  await arrive(page, "3");
  await expect(apexTab(page)).toBeVisible();
  await apexTab(page).click();
  await expect(page.locator("#apexPanel .apex-locked")).toBeVisible();
  await expect(page.locator("#apexPanel")).toContainText(/chapters to go/);
  // The quests are shown, but every one of them says what opens it instead of opening.
  await expect(page.locator("#apexPanel .apex-preview button")).toHaveCount(8);
  if (await page.locator("#apexPanel [data-apex-quest]").count()) throw new Error("a locked Apex quest is playable");
  await page.locator("#apexPanel [data-apex-locked]").first().click();
  await expect(page.locator("dialog.apex-locked-note[open]")).toContainText("Finish your island first");
  await expect(page.locator("dialog.apex-locked-note[open]")).toContainText(/chapters to go|chapter to go/);
  await page.locator("dialog.apex-locked-note[open] .vp-actions button").last().click();
  await shot(page, "02-apex-locked");

  await page.evaluate(() => {
    window.MQS.update((s) => { for (const c of window.MQClasses.current().chapters) s.chapters[c.id] = true; });
    window.MQApex.renderPanel();
  });
  await expect(page.locator("#apexPanel .apex-grid button")).toHaveCount(8);
  await expect(page.locator("#apexPanel .apex-grid button").nth(0)).toBeEnabled();
  // Quest 2 is not playable until quest 1 is cleared, and says so when tapped rather than doing nothing.
  await expect(page.locator("#apexPanel .apex-grid button").nth(1)).toHaveClass(/locked/);
  await page.locator("#apexPanel .apex-grid button").nth(1).click();
  await expect(page.locator("dialog.apex-locked-note[open]")).toBeVisible();
  await page.locator("dialog.apex-locked-note[open] .vp-actions button").last().click();
  await shot(page, "03-apex-unlocked");

  // The vault opens before anything is found, and gives nothing away.
  await page.locator('[data-apex="vault"]').click();
  await expect(page.locator("dialog.apex-vault[open]")).toBeVisible();
  await expect(page.locator("dialog.apex-vault #apexDialogTitle")).toContainText("0 of 8");
  await expect(page.locator("dialog.apex-vault .apex-gem")).toHaveCount(8);
  await expect(page.locator("dialog.apex-vault .apex-gem.found")).toHaveCount(0);
  const vaultText = (await page.locator("dialog.apex-vault").textContent()) || "";
  for (const secret of ["Luna Gem", "Cerium", "Prism", "Terra Spark", "Yttrium", "Europium", "Neo Star"]) {
    if (vaultText.includes(secret)) throw new Error(`the vault names ${secret} before it is found`);
  }
  if (!vaultText.includes("Nova")) throw new Error("the Nova Gem should be named: it is the goal, not a secret");
  await shot(page, "04-vault-before-any-find");
  await page.close();
}

// ---------- 3. A generated question reaches the board; a wrong one never does ----------
{
  const { page, asked } = await newPage("generated", { width: 1280, height: 860 });
  await arrive(page, "3", { islandDone: true });
  await apexTab(page).click();
  await page.locator("#apexPanel .apex-grid button").first().click();
  await expect(page.locator("#cgPrompt")).toBeVisible();

  // Round 1 is always the built-in question: there is no cutscene to hide a fetch behind.
  if (await page.locator("#stage").getAttribute("data-question-source") !== "built-in") throw new Error("round 1 should come from the bank");
  let sawAI = false;
  for (let round = 0; round < 5; round++) {
    if ((await page.locator("#stage").getAttribute("data-question-source")) === "ai") {
      sawAI = true;
      await expect(page.locator("#cgPrompt")).toContainText("Fresh question");
    }
    await solveRound(page);
    if (round < 4) await page.locator('[data-cg="next"]').click();
  }
  if (!sawAI) throw new Error("no generated question reached the board across five Apex rounds");
  if (!asked.length) throw new Error("the game never asked for a question");
  const brief = asked[0];
  if (!brief.apex) throw new Error("an Apex round asked for a normal question");
  if (brief.minSteps < 2) throw new Error("Apex asked for a one-step question");
  if (!brief.example?.prompt || !brief.example?.answer) throw new Error("the brief carried no built-in question to match");
  if (!brief.skill.startsWith("g3.")) throw new Error(`Apex asked outside the grade: ${brief.skill}`);
  await shot(page, "05-generated-question");
  await page.close();
}
// The two ways a generated question gets thrown away, and the one thing the child must see either way:
// an ordinary question, straight away.
//
// Semantic wrongness — wording that walks to a different number than the answer key — is caught on the
// SERVER, by running the model's own work program (that is generateChain.test.ts's job, and it cannot be
// tested through a mocked route because the mock IS the server). What reaches the browser is a plain
// "rejected", and this checks the browser does the right thing with it.
for (const [name, options, label] of [
  ["rejected", { rejected: true }, "the server refused both writers' questions"],
  ["corrupt", { corrupt: true }, "a structurally broken task arrived anyway"],
]) {
  const { page, asked } = await newPage(name, { width: 1280, height: 860 }, options);
  await arrive(page, "3", { islandDone: true });
  await apexTab(page).click();
  await page.locator("#apexPanel .apex-grid button").first().click();
  for (let round = 0; round < 5; round++) {
    await expect(page.locator("#cgPrompt")).toBeVisible();
    if ((await page.locator("#stage").getAttribute("data-question-source")) === "ai") throw new Error(`${label}: it was drawn anyway`);
    if (await page.locator("#cgPrompt").textContent() === "") throw new Error(`${label}: the board was left empty`);
    await solveRound(page);
    if (round < 4) await page.locator('[data-cg="next"]').click();
  }
  if (!asked.length) throw new Error(`${label}: the game never even asked`);
  await shot(page, `06-${name}-falls-back-silently`);
  await page.close();
}

// ---------- 4. With no question writer at all, nothing changes ----------
{
  const { page, asked } = await newPage("no-key", { width: 1280, height: 860 }, { generate: false });
  await arrive(page, "3", { islandDone: true });
  await apexTab(page).click();
  await page.locator("#apexPanel .apex-grid button").first().click();
  for (let round = 0; round < 5; round++) {
    await expect(page.locator("#cgPrompt")).toBeVisible();
    if ((await page.locator("#stage").getAttribute("data-question-source")) !== "built-in") throw new Error("a question appeared with no writer configured");
    await solveRound(page);
    if (round < 4) await page.locator('[data-cg="next"]').click();
  }
  if (asked.length) throw new Error("the game asked a writer that is not configured");
  await shot(page, "07-apex-with-ai-off");
  await page.close();
}

// ---------- 5. The whole journey: eight quests, the gems, the Nova ----------
{
  const { page } = await newPage("journey", { width: 1280, height: 860 });
  await arrive(page, "3", { islandDone: true });
  await apexTab(page).click();
  const revealed = [];
  for (let slot = 1; slot <= 8; slot++) {
    const card = page.locator("#apexPanel .apex-grid button").nth(slot - 1);
    await expect(card).toBeEnabled();
    await card.click();
    revealed.push(...(await playQuest(page)));
    await apexTab(page).click();
    await expect(page.locator("#apexPanel")).toContainText(`${slot}/8 Apex quests`);
  }
  // Every round was solved by asking to be shown, so no first-try answers: only the gems that ask for
  // nothing turn up. That is the point — a gem is not a prize for finishing.
  const names = revealed.join(" | ");
  for (const common of ["Luna Gem", "Prism Gem", "Yttrium Crystal"]) {
    if (!names.includes(common)) throw new Error(`${common} should have been found on a cleared quest. Found: ${names}`);
  }
  for (const rare of ["Cerium Sun Gem", "Terra Spark Gem", "Europium Glow Gem", "Neo Star Gem"]) {
    if (names.includes(rare)) throw new Error(`${rare} was handed over for a supported run. Found: ${names}`);
  }
  if (!names.includes("Nova")) throw new Error(`the Nova Gem did not appear after all eight quests. Found: ${names}`);

  await page.locator('[data-apex="vault"]').click();
  await expect(page.locator("dialog.apex-vault #apexDialogTitle")).toContainText("4 of 8");
  await expect(page.locator("dialog.apex-vault .apex-gem.found")).toHaveCount(4);
  // Rarity must never be carried by colour alone. It is written on each card in generated content, which
  // is read out by a screen reader but is not part of textContent — so it has to be read from the style.
  const tierWords = await page.evaluate(() => [...document.querySelectorAll("dialog.apex-vault .apex-gem.found")]
    .map((card) => getComputedStyle(card.querySelector("b"), "::after").content));
  if (!tierWords.some((word) => /rarest/.test(word))) throw new Error(`the Nova card does not say how rare it is: ${tierWords.join(", ")}`);
  await shot(page, "08-vault-after-the-journey");
  await page.locator("dialog.apex-vault .vp-actions button").click();
  await expect(page.locator("#apexPanel")).toContainText("Nova Gem is yours");
  await shot(page, "09-apex-complete");

  // A per-class treasure: Grade 5 must not inherit what Grade 3 dug up.
  await page.evaluate(() => window.MQClasses.switchTo("5"));
  await page.evaluate(() => window.MQApex.renderPanel());
  const grade5 = await page.evaluate(() => window.MQApex.read());
  if (grade5.gems.length || grade5.nova) throw new Error("Grade 3's treasure followed the child into Grade 5");
  await page.evaluate(() => window.MQClasses.switchTo("3"));
  const grade3 = await page.evaluate(() => window.MQApex.read());
  if (!grade3.nova) throw new Error("Grade 3's treasure was lost on the way back");
  await page.close();
}

// ---------- 6. The playtest switch opens it without finishing the island ----------
{
  const { page } = await newPage("playtest", { width: 1280, height: 860 });
  await arrive(page, "3");
  await apexTab(page).click();
  await expect(page.locator("#apexPanel .apex-locked")).toBeVisible();
  await page.evaluate(() => { window.MQS.update((s) => { s.unlockAll = true; }); window.MQApex.renderPanel(); });
  await expect(page.locator("#apexPanel .apex-grid button")).toHaveCount(8);
  // Every quest is reachable while testing, not just the first.
  await expect(page.locator("#apexPanel .apex-grid button").nth(7)).toBeEnabled();
  await page.locator("#apexPanel .apex-grid button").nth(7).click();
  await expect(page.locator("#cgPrompt")).toBeVisible();
  await expect(page.locator("#cgRound")).toContainText("APEX CHALLENGE");
  await shot(page, "11-playtest-unlock");

  // But it is still a Grades 3-5 feature: the switch must not hand Apex to a Kindergartener.
  await page.evaluate(() => window.MQ.showMap());
  for (const grade of ["K", "1", "2"]) {
    await page.evaluate((g) => { window.MQClasses.switchTo(g, { quiet: true }); window.MQApex.syncNav(); }, grade);
    // The tab is there for every class, but the switch must not hand a Kindergartener a playable Apex.
    await expect(apexTab(page)).toBeVisible();
    if (await page.evaluate(() => window.MQApex.unlocked())) throw new Error(`the playtest switch unlocked Apex for grade ${grade}`);
    if (await page.evaluate(() => window.MQApex.offered())) throw new Error(`grade ${grade} is offered Apex`);
  }
  await page.close();
}

// ---------- 7. The nav bar on a phone, measured ----------
for (const width of [360, 400, 768]) {
  const { page } = await newPage(`phone-${width}`, { width, height: 780 });
  await arrive(page, "3", { islandDone: true });
  await apexTab(page).click();
  const nav = await page.evaluate(() => {
    const bar = document.querySelector(".voyage-nav");
    const buttons = [...bar.querySelectorAll("button")].filter((b) => !b.hidden);
    return {
      overflow: bar.scrollWidth - bar.clientWidth,
      count: buttons.length,
      minHeight: Math.min(...buttons.map((b) => b.getBoundingClientRect().height)),
      minWidth: Math.min(...buttons.map((b) => b.getBoundingClientRect().width)),
      bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  // Six since Story Lab was removed: Explore, Quests, Arena, Practice, Arcade, Apex.
  if (nav.count !== 6) throw new Error(`${width}px: expected 6 tabs, found ${nav.count}`);
  if (nav.overflow > 1) throw new Error(`${width}px: the navigation bar overflows by ${nav.overflow}px`);
  if (nav.bodyOverflow > 1) throw new Error(`${width}px: the page scrolls sideways by ${nav.bodyOverflow}px`);
  if (nav.minHeight < 48) throw new Error(`${width}px: a tab is only ${nav.minHeight}px tall (48 is the floor)`);
  console.log(`  ${width}px · ${nav.count} tabs · smallest ${Math.round(nav.minWidth)}x${Math.round(nav.minHeight)}px · no overflow`);
  const panel = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (panel > 1) throw new Error(`${width}px: the Apex panel scrolls sideways by ${panel}px`);
  await shot(page, `10-phone-${width}`);
  await page.close();
}

await browser.close();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`\nApex passed: visible but unplayable for K/1/2, locked until the island is done, generated questions checked before they are drawn, unchanged with AI off, eight quests to the Nova Gem, per-class treasure, and the nav bar measured at 360px. Screenshots: ${out}`);
