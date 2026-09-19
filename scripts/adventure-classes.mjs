// Classes: a new player picks a class; a Grade 3 chapter runs from story intro to bonus game; a chapter resumes from
// its checkpoint; class practice; the grown-ups class switch keeps progress separate; an older save moves its chapters
// to their classes; every class chapter and practice trail is drawn and solved; and the phone layout never overflows.
// AI is switched off, so no provider request is made.
// Usage: BASE_URL=http://localhost:3001 node scripts/adventure-classes.mjs  (dev server must be running)
import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve("test-results/classes");
mkdirSync(path.join(out, "boards"), { recursive: true });
const url = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errors = [];
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mq.playtest.v3")));
const open = (page, id) => page.evaluate((levelId) => { window.MQ.openLevel(window.MQ.levels.find((l) => l.id === levelId)); }, id);
const noOverflow = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

async function newPage(label, viewport, init) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(`${label}: ${e.stack || e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${label} console: ${m.text()}`); });
  await page.route("**/api/adventure-ai", (route) => (route.request().method() === "GET" ? route.fulfill({ json: { enabled: false } }) : route.fulfill({ status: 503, json: { ok: false, reason: "unavailable" } })));
  if (init) await page.addInitScript((s) => { if (!localStorage.getItem("mq.playtest.v3")) localStorage.setItem("mq.playtest.v3", JSON.stringify(s)); }, init);
  return page;
}

/** Solves the question on screen with "Show me how" and Check. */
async function solveOne(page, boardShot) {
  await expect(page.locator('[data-cg="check"]')).toBeVisible();
  if (boardShot) await page.locator("#cgBoard").screenshot({ path: path.join(out, "boards", `${boardShot}.png`) });
  await page.locator('[data-cg="help"]').click();
  await page.locator('[data-cg="check"]').click();
  await expect(page.locator("#cgFeedback")).toContainText("✓ You got it!");
}

try {
  // ---- A new player, Grade 3, on a tablet ----
  {
    const page = await newPage("tablet", { width: 1024, height: 768 });
    const shot = (name) => page.screenshot({ path: path.join(out, `tablet-${name}.png`) });
    await page.goto(url);
    await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
    const picker = page.locator(".class-picker");
    await expect(picker.getByRole("heading", { name: "Which class are you in?" })).toBeVisible();
    await expect(picker.locator("[data-grade]")).toHaveCount(6);
    await page.keyboard.press("Escape");
    await expect(picker).toBeVisible();
    await shot("01-picker");
    await picker.locator('[data-grade="3"]').click();
    await page.getByRole("button", { name: "Let's go!" }).click();
    await page.getByRole("button", { name: "Skip story", exact: true }).click();
    expect((await saved(page)).grade).toBe("3");

    const world = page.locator("#voyageWorld");
    await expect(world).toContainText("GRADE 3 · TINKER HOLLOW");
    await expect(world.locator("[data-place]")).toHaveCount(8);
    await expect(page.locator("#voyage-place-g3-facts")).toHaveAttribute("aria-label", "Chapter 1: The Fact Forge, ready");
    await expect(page.locator("#voyage-place-g3-twostep")).toHaveAttribute("aria-label", "Chapter 2: The Two-Step Trail, locked");
    await expect(page.locator("#voyage-place-robotworks")).toHaveAttribute("aria-label", "Chapter 5: The Moonbeam Workshop, locked");
    await shot("02-island");

    await page.locator("#voyage-place-g3-facts").click();
    await expect(page.locator(".voyage-panel")).toContainText("BONUS UNLOCK · ");
    // The landmark stays inside its strip above the text; it used to stretch to the dialog width and cover it.
    const strip = await page.locator(".voyage-panel .vp-portrait").boundingBox();
    const badge = await page.locator(".voyage-panel .vp-portrait .vw-emoji-building > span").boundingBox();
    const kicker = await page.locator(".voyage-panel .voyage-kicker").boundingBox();
    expect(badge.height).toBeLessThanOrEqual(strip.height + 1);
    expect(badge.y + badge.height).toBeLessThanOrEqual(kicker.y + 1);
    await shot("02b-quest-panel");
    await page.locator(".vp-actions .btn").click();
    await expect(page.locator(".voyage-story")).toContainText("GRADE 3 · CHAPTER 1");
    await page.locator('[data-story="skip"]').click();
    await expect(page.locator(".class-stage")).toBeVisible();
    await shot("03-question");
    for (let i = 0; i < 5; i++) {
      await expect(page.locator("#cgRound")).toHaveText(`${(await saved(page)).grade === "K" ? "PLAY" : "MISSION"} ${i + 1} OF 5`);
      await solveOne(page);
      await page.locator('[data-cg="next"]').click();
    }
    await expect(page.locator("#result")).toBeVisible();
    await expect(page.locator(".result-chapter")).toHaveText("GRADE 3 · CHAPTER 1");
    await shot("04-result");
    await page.locator('#result [data-act="go"]').click();
    await page.locator('[data-story="skip"]').click();
    await expect(page.locator(".mini")).toBeVisible();
    await page.locator(".mini-skip").click();
    await expect(page.locator(".mini")).toHaveCount(0);
    let s = await saved(page);
    expect(s.chapters["g3-facts"]).toBe(true);
    expect(s.classRuns["g3-facts"]).toBeUndefined();
    expect(s.classWork.skills["g3.oa.multiply"].recent.length).toBeGreaterThan(0);
    expect(s.classWork.skills["g3.oa.multiply"].recent.every((r) => !r.independent)).toBe(true);
    await expect(page.locator("#voyage-place-g3-twostep")).toHaveAttribute("aria-label", "Chapter 2: The Two-Step Trail, ready");

    // A chapter left partway resumes at the same question.
    await page.locator("#voyage-place-g3-twostep").click();
    await page.locator(".vp-actions .btn").click();
    await page.locator('[data-story="skip"]').click();
    for (let i = 0; i < 2; i++) { await solveOne(page); await page.locator('[data-cg="next"]').click(); }
    await expect(page.locator("#cgRound")).toHaveText("MISSION 3 OF 5");
    const prompt = await page.locator("#cgPrompt").textContent();
    await page.locator("#homeBtn").click();
    await page.locator("#voyage-place-g3-twostep").click();
    await expect(page.locator(".voyage-panel")).toContainText("Saved: 2 of 5 questions complete.");
    await page.getByRole("button", { name: "Continue my chapter →" }).click();
    await page.locator('[data-story="skip"]').click();
    await expect(page.locator("#cgRound")).toHaveText("MISSION 3 OF 5");
    await expect(page.locator("#cgPrompt")).toHaveText(prompt);
    await page.locator("#homeBtn").click();

    // Practice for the class.
    await page.locator('[data-world-view="practice"]').click();
    const atlas = page.locator("#learningAtlas");
    await expect(atlas).toContainText("GRADE 3 · TINKER HOLLOW");
    await expect(atlas.locator(".atlas-grid [data-trail]")).toHaveCount(6);
    await shot("05-practice");
    await atlas.locator('.atlas-grid [data-trail="g3-p-round"]').click();
    await solveOne(page);
    await page.locator("#homeBtn").click();
    await atlas.locator('.atlas-grid [data-trail="g3-trail-division"]').click();
    await expect(page.locator("#cgPrompt")).toBeVisible();
    await page.locator("#homeBtn").click();

    // Grown-ups switch class; each class keeps its own chapters, and coins are shared.
    const coins = (await saved(page)).coins;
    await page.locator("#adultBtn").click();
    const dash = page.locator(".adult-dashboard");
    await expect(dash).toContainText("Class: Grade 3");
    await expect(dash.locator(".ad-rows")).toContainText("Multiplication facts");
    await expect(dash.locator(".ad-metrics")).toContainText("/ 8");
    await shot("06-dashboard");
    await dash.locator('[data-ad="class"]').click();
    await page.locator('.class-picker [data-grade="K"]').click();
    await expect(dash).toHaveCount(0);
    await page.locator('[data-world-view="explore"]').click();
    await expect(page.locator("#voyageWorld")).toContainText("KINDERGARTEN · FIREFLY MEADOW");
    await expect(page.locator("#voyage-place-k-count")).toHaveAttribute("aria-label", "Chapter 1: The Counting Meadow, ready");
    await expect(page.locator("#voyage-place-fireflies")).toHaveAttribute("aria-label", "Chapter 2: Firefly Homes, locked");
    s = await saved(page);
    expect(s.grade).toBe("K");
    expect(s.chapters["g3-facts"]).toBeUndefined();
    expect(s.classes["3"].chapters["g3-facts"]).toBe(true);
    expect(s.coins).toBeGreaterThanOrEqual(coins);
    await page.locator("#adultBtn").click();
    await page.locator('.adult-dashboard [data-ad="class"]').click();
    await page.locator('.class-picker [data-grade="3"]').click();
    await expect(page.locator("#voyage-place-g3-facts")).toHaveAttribute("aria-label", "Chapter 1: The Fact Forge, restored");
    await page.locator('[data-world-view="arcade"]').click();
    await expect(page.locator('#playground .play-card[data-game="mist"]')).not.toHaveAttribute("data-locked", "");
    await expect(page.locator('#playground .play-card[data-game="flight"]')).toHaveAttribute("data-locked", "");
    await noOverflow(page);
    console.log("tablet: picker, Grade 3 chapter, checkpoint, practice, class switch and bonus unlocks passed");
    await page.close();
  }

  // ---- A save from before classes ----
  {
    const page = await newPage("legacy", { width: 1024, height: 768 }, { prologue: true, hero: "🧑‍🚀", muted: true, coins: 9, chapters: { frog: true, fireflies: true, guardian: true, skyrail: true }, stars: { frog: 3, guardian: 2 } });
    await page.goto(url);
    await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
    await page.locator('.class-picker [data-grade="2"]').click();
    await expect(page.locator("#voyage-place-guardian")).toHaveAttribute("aria-label", "Chapter 3: The Muddled Guardian, restored");
    await expect(page.locator("#voyage-place-g2-evenodd")).toHaveAttribute("aria-label", "Chapter 1: Odd & Even Stepping Stones, ready");
    const s = await saved(page);
    expect(s).toMatchObject({ grade: "2", coins: 9, chapters: { guardian: true, skyrail: true }, stars: { guardian: 2 } });
    expect(s.classes["1"]).toMatchObject({ chapters: { frog: true }, stars: { frog: 3 } });
    expect(s.classes.K.chapters).toEqual({ fireflies: true });
    console.log("legacy: older chapters moved to their classes");
    await page.close();
  }

  // ---- Every class chapter and practice trail ----
  {
    const page = await newPage("every-level", { width: 1024, height: 768 }, { prologue: true, hero: "🧑‍🚀", muted: true, grade: "K", unlockAll: true, chapters: {} });
    await page.goto(url);
    await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
    const classes = await page.evaluate(() => window.MQClasses.CLASS_LIST.map((c) => ({ id: c.id, chapters: c.chapters.filter((ch) => ch.kind === "engine").map((ch) => ch.id), practice: c.practice.map((p) => ({ id: p.id, kind: p.kind })), expedition: c.expedition.id })));
    let solved = 0;
    for (const c of classes) {
      await page.evaluate((g) => { window.MQClasses.switchTo(g, { quiet: true }); window.MQS.update((s) => { for (const ch of window.MQClasses.current().chapters) s.chapters[ch.id] = true; }); }, c.id);
      for (const id of c.chapters) {
        await open(page, id);
        await expect(page.locator(".class-stage")).toBeVisible();
        for (let i = 0; i < 5; i++) {
          await expect(page.locator("#cgRound")).toHaveText(`${(await saved(page)).grade === "K" ? "PLAY" : "MISSION"} ${i + 1} OF 5`);
          await solveOne(page, `${id}-${i + 1}`);
          await page.locator('[data-cg="next"]').click();
          solved += 1;
        }
        await expect(page.locator("#result")).toBeVisible();
        await page.evaluate(() => window.MQ.showMap());
      }
      for (const p of [...c.practice, { id: c.expedition, kind: "engine" }]) {
        await open(page, p.id);
        if (p.kind === "trail") await expect(page.locator("#cgPrompt")).toBeVisible();
        else { await solveOne(page); solved += 1; }
        await page.evaluate(() => window.MQ.showMap());
      }
    }
    expect(solved).toBe(classes.reduce((n, c) => n + c.chapters.length * 5 + c.practice.filter((p) => p.kind === "engine").length + 1, 0));
    console.log(`every level: ${solved} class questions drawn and solved`);
    await page.close();
  }

  // ---- Phone ----
  {
    const page = await newPage("phone", { width: 390, height: 844 }, { prologue: true, hero: "🧑‍🚀", muted: true, grade: "4", unlockAll: true, chapters: { "g4-mine": true, "g4-express": true, "g4-factors": true, "g4-falls": true, "g4-docks": true, cloudbridge: true, "g4-angles": true } });
    const shot = (name) => page.screenshot({ path: path.join(out, `phone-${name}.png`), fullPage: true });
    await page.goto(url);
    await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
    await expect(page.locator("#voyageWorld")).toContainText("GRADE 4 · CRYSTAL CANYON");
    await noOverflow(page);
    await shot("01-island");
    for (const id of ["g4-angles", "g4-caravan"]) {
      await open(page, id);
      if (id === "g4-caravan") await page.locator('[data-story="skip"]').click();
      for (let i = 0; i < 5; i++) {
        await expect(page.locator("#cgRound")).toHaveText(`${(await saved(page)).grade === "K" ? "PLAY" : "MISSION"} ${i + 1} OF 5`);
        await noOverflow(page);
        if (i < 2) await shot(`${id}-${i + 1}`);
        await solveOne(page);
        await page.locator('[data-cg="next"]').click();
      }
      await expect(page.locator("#result")).toBeVisible();
      await page.evaluate(() => window.MQ.showMap());
    }
    await page.locator("#adultBtn").click();
    await page.locator('.adult-dashboard [data-ad="class"]').click();
    await expect(page.locator(".class-picker")).toBeVisible();
    await shot("02-picker");
    await page.getByRole("button", { name: "Keep my class" }).click();
    await expect(page.locator(".class-picker")).toHaveCount(0);
    await page.locator('.adult-dashboard [data-ad="close"]').click();
    await page.locator('[data-world-view="practice"]').click();
    await noOverflow(page);
    await shot("03-practice");
    console.log("phone: Grade 4 island, two chapters, picker and practice fit the screen");
    await page.close();
  }
} finally {
  await browser.close();
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Classes smoke passed. Screenshots in test-results/classes");
