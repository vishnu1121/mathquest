// Complete Skybound story, all new missions and bonus games, checkpoint reload, and island controls.
// No paid AI calls. Run against the local Next server: npm run smoke:voyage.
import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { playCourier } from "./play-courier.mjs";
const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve("test-results/voyage"); mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const url = process.env.BASE_URL || "http://localhost:3001";
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mq.playtest.v3")));
// Skybound chapters now live in Grade 2 (Skyrail), Grade 3 (Workshop) and Grade 4 (Bridge). Earlier chapters are marked finished.
const enterClass = (page, grade, done = []) => page.evaluate(([g, ids]) => { window.MQClasses.switchTo(g, { quiet: true }); window.MQS.update((s) => { for (const id of ids) s.chapters[id] = true; }); }, [grade, done]);
const overflow = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
async function run(width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: width < 600 ? "reduce" : "no-preference" });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(`${width}: ${e.stack}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${width}: ${m.text()}`); });
  await page.route("**/api/adventure-ai", (r) => r.fulfill({ json: { enabled: false } }));
  await page.addInitScript(() => {
    if (!localStorage.getItem("mq.playtest.v3")) localStorage.setItem("mq.playtest.v3", JSON.stringify({ prologue: true, hero: "🧑‍🚀", muted: true, grade: "2", chapters: { "g2-evenodd": true, "g2-castle": true, guardian: true } }));
  });
  const shot = (name) => page.screenshot({ path: path.join(out, `${width}-${name}.png`), fullPage: true, animations: "disabled" });
  const resume = async () => { await page.getByRole("button", { name: "Continue the adventure" }).click(); await expect(page.locator(".title-screen")).toHaveCount(0); };
  const visit = async (id) => { await page.locator(`[data-place="${id}"]`).click(); await page.locator(".vp-actions .btn").click(); };
  const skipIntro = async () => { await page.locator('[data-story="skip"]').click(); await expect(page.locator(".vg-mission")).toBeVisible(); };
  const continueBonus = async () => {
    await page.locator('#result [data-act="go"]').click();
    while (await page.locator(".voyage-story").count()) {
      await page.locator('[data-story="next"]').click();
    }
    await expect(page.locator(".mini")).toBeVisible();
  };
  const endBonus = async () => { await expect(page.locator(".mini-done")).toBeVisible(); await page.locator(".mini-done .btn").click(); await expect(page.locator(".mini")).toHaveCount(0); await expect(page.locator("#voyageWorld")).toBeVisible(); };
  try {
    await page.goto(url); await shot("00-cover"); await resume(); await overflow(page); await shot("01-island");
    await page.locator('[data-place="g2-bridge"]').click();
    await expect(page.locator(".voyage-panel")).toContainText("First, finish Chapter 4");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.locator('[data-keepsake="feather"]').click();
    await expect(page.locator(".voyage-panel")).toContainText("Keepsake discovered");
    await page.keyboard.press("Escape");
    await page.locator("[data-camp]").click();
    await page.locator('[data-paint="lantern"]').click(); await page.locator('[data-patch="4"]').click();
    await shot("02-camp"); await page.keyboard.press("Escape");
    await page.locator('[data-world-view="practice"]').click(); await expect(page.locator("#learningAtlas")).toBeVisible(); await overflow(page);
    await page.locator('[data-world-view="quests"]').click(); await expect(page.locator("[data-quest]")).toHaveCount(8); await shot("03-quests");
    await page.locator('[data-world-view="explore"]').click();
    await visit("skyrail");
    await page.locator('[data-story="next"]').click();
    await page.locator('[data-choice="listen"]').click();
    await page.locator('[data-story="next"]').click();
    expect((await saved(page)).voyage.promise).toBe("listen");
    await shot("04-rail");

    const railPaths = () => page.evaluate(() => {
      const start = Number(document.querySelector(".rail-platform.start b").textContent), target = Number(document.querySelector(".rail-platform.goal b").textContent);
      const gates = [...document.querySelectorAll(".rail-gates fieldset")].map((f) => [...f.querySelectorAll("button")].map((b) => b.textContent));
      const routes = gates.reduce((routes, gate) => routes.flatMap((r) => gate.map((_, i) => [...r, i])), [[]]);
      const value = (route) => route.reduce((n, pick, i) => { const op = gates[i][pick], v = Number(op.slice(1)); return op[0] === "+" ? n + v : op[0] === "−" ? n - v : n * v; }, start);
      return { correct: routes.find((r) => value(r) === target), wrong: routes.find((r) => value(r) !== target), start, target };
    });
    const pickRoute = async (route) => { for (let i = 0; i < route.length; i++) await page.locator(`#vg-gate-${i}-${route[i]}`).click(); };
    let paths = await railPaths();
    await pickRoute(paths.wrong); await page.locator('[data-vg="launch"]').click();
    await expect(page.locator(".vg-feedback")).toHaveAttribute("data-state", "retry");
    expect((await saved(page)).voyage.runs.skyrail.helped).toBe(true);
    for (let round = 0; round < 4; round++) {
      paths = await railPaths(); await pickRoute(paths.correct); await page.locator('[data-vg="launch"]').click();
      await expect(page.locator('[data-vg="next"]')).toBeVisible();
      if (round === 0) {
        expect((await saved(page)).voyage.runs.skyrail.round).toBe(1);
        await page.reload(); await resume();
        expect((await saved(page)).voyage.camp[4]).toBe("lantern");
        expect((await saved(page)).voyage.keepsakes).toContain("feather");
        await visit("skyrail"); await skipIntro();
        await expect(page.locator(".vg-round")).toHaveText("MISSION 2 / 4");
      } else await page.locator('[data-vg="next"]').click();
    }
    await expect(page.locator("#result")).toBeVisible(); await shot("05-rail-result");
    expect((await saved(page)).voyage.runs.skyrail.independent).toBe(3);
    await continueBonus(); await shot("06-courier");
    await playCourier(page);
    await endBonus();
    await enterClass(page, "3", ["g3-facts", "g3-twostep", "g3-fractions", "g3-clock"]);
    await visit("robotworks");
    // Story choices belong to a class: Grade 3 did not ride the Skyrail, so Nimbus uses the “together” line.
    await expect(page.locator(".vs-copy")).toContainText("find a way together"); await shot("07-workshop-intro"); await skipIntro();
    for (let round = 0; round < 4; round++) {
      const recipe = await page.locator(".vg-mission p").textContent();
      const [robots, cells, gears] = recipe.match(/\d+/g).map(Number);
      const packs = await page.locator(".supply-bin > div > span").allTextContents();
      const counts = [robots * cells / Number(packs[0].match(/\d+/)[0]), robots * gears / Number(packs[1].match(/\d+/)[0])];
      if (round === 0) { await page.locator('[data-vg="launch"]').click(); await expect(page.locator(".vg-feedback")).toHaveAttribute("data-state", "retry"); }
      for (let i = 0; i < 2; i++) for (let n = 0; n < counts[i]; n++) await page.locator(`#vg-add-${i}`).click();
      if (round === 2) { await overflow(page); await shot("08-workshop"); }
      await page.locator('[data-vg="launch"]').click(); await expect(page.locator('[data-vg="next"]')).toBeVisible(); await page.locator('[data-vg="next"]').click();
    }
    await continueBonus(); await shot("09-bowls");
    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Power", { exact: true }).fill("8");
      await page.locator(".bowls-roll").click();
      if (i < 4) { await expect(page.locator(".bowls-roll")).toHaveText("Next throw →"); await page.locator(".bowls-roll").click(); }
    }
    await endBonus(); await enterClass(page, "4", ["g4-mine", "g4-express", "g4-factors", "g4-falls", "g4-docks"]); await visit("cloudbridge"); await skipIntro();
    const bridges = [[6], [3,6], [4,4], [4,4,4]];
    for (let i = 0; i < 4; i++) {
      if (i === 0) { await page.locator('[data-vg="help"]').click(); await page.locator('[data-vg="launch"]').click(); await expect(page.locator(".vg-feedback")).toHaveAttribute("data-state", "retry"); }
      for (const n of bridges[i]) await page.locator(`#vg-plank-${n}`).click();
      if (i === 3) { await overflow(page); await shot("10-bridge"); }
      await page.locator('[data-vg="launch"]').click(); await expect(page.locator('[data-vg="next"]')).toBeVisible(); await page.locator('[data-vg="next"]').click();
    }
    await shot("11-finale-result"); await continueBonus(); await shot("12-constellations");
    const symbols = await page.locator("[data-star]").allTextContents();
    await page.locator(".match-ready").click();
    // Deliberate miss first: observe the computer turn and reveal/continue boundary.
    const other = symbols.findIndex((s) => s !== symbols[0]);
    await page.locator('[data-star="0"]').click(); await page.locator(`[data-star="${other}"]`).click();
    for (let turns = 0; turns < 12 && !(await page.locator(".mini-done").count()); turns++) {
      if (await page.locator(".match-next:visible").count()) {
        await page.locator(".match-next").click();
        if (await page.locator(".mini-done").count()) break;
        await page.locator(".match-next").click();
      }
      const available = await page.locator("[data-star]:not(:disabled)").evaluateAll((buttons) => buttons.map((b) => Number(b.dataset.star)));
      const a = available.find((i) => available.some((j) => i !== j && symbols[i] === symbols[j]));
      const b = available.find((i) => i !== a && symbols[i] === symbols[a]);
      await page.locator(`[data-star="${a}"]`).click(); await page.locator(`[data-star="${b}"]`).click();
    }
    await endBonus();
    const state = await saved(page);
    expect(state.chapters.cloudbridge).toBe(true);
    expect(state.classes["2"].chapters.skyrail).toBe(true);
    expect(state.classes["3"].chapters.robotworks).toBe(true);
    for (const id of ["courier", "bowls", "starmatch"]) expect(state.minis[id]).toBe(1);
    expect(state.curriculum.trails.fractions.recent.some((r) => r.correct && !r.independent)).toBe(true);
    await page.locator('[data-keepsake="bell"]').click(); await page.keyboard.press("Escape");
    await page.locator('[data-keepsake="shell"]').click(); await page.keyboard.press("Escape");
    expect((await saved(page)).voyage.keepsakes).toHaveLength(3);
    await page.locator('[data-world-view="arcade"]').click(); await expect(page.locator(".play-card")).toHaveCount(8); await shot("13-arcade");
    await page.locator('[data-world-view="explore"]').click(); await shot("14-world-restored"); await overflow(page);
    // Leaving mid-animation must not advance an abandoned run or write stale evidence.
    await enterClass(page, "2"); await visit("skyrail"); paths = await railPaths(); await pickRoute(paths.correct);
    await page.locator('[data-vg="launch"]').click(); await page.locator("#homeBtn").click();
    const before = (await saved(page)).voyage.runs.skyrail.round;
    await page.waitForTimeout(1400); expect((await saved(page)).voyage.runs.skyrail.round).toBe(before);
    console.log(`${width}px: all new chapters, narrative choice, checkpoint reload, all bonuses, keepsakes and camp passed`);
  } catch (error) { await shot("FAIL"); throw error; }
  finally { await page.close(); }
}
try { await run(1440); await run(390); if (errors.length) throw new Error(errors.join("\n")); }
finally { await browser.close(); }
