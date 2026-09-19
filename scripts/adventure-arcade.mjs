// Arcade layer in the browser: score panel, glow bits, round bonuses, power mode, the boss bar, critical
// spells, a blocked spell that only cools the streak, and the score tally with a saved best. The phone run
// uses reduced motion. AI is mocked off, so this check never makes a paid request.
// Usage: BASE_URL=http://localhost:3000 node scripts/adventure-arcade.mjs  (dev server must be running)
import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve("test-results/adventure-arcade");
mkdirSync(out, { recursive: true });
const url = process.env.BASE_URL ?? "http://localhost:3001";
const browser = await chromium.launch();
const errors = [];

const score = async (page) => Number((await page.locator(".ah-value").textContent()).replace(/\D/g, ""));
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mq.playtest.v3")));

async function open(label, viewport, reducedMotion) {
  const page = await browser.newPage({ viewport, reducedMotion });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
  // Event listeners report their errors through console.error rather than throwing.
  page.on("console", (message) => message.type() === "error" && errors.push(`${label} console: ${message.text()}`));
  await page.route("**/api/adventure-ai", (route) => route.fulfill({ json: { enabled: false } }));
  await page.addInitScript(() => {
    if (!localStorage.getItem("mq.playtest.v3")) localStorage.setItem("mq.playtest.v3", JSON.stringify({ prologue: true, hero: "🧑‍🚀", grade: "1", chapters: {}, unlockAll: true }));
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Continue the adventure" }).click();
  await expect(page.locator(".title-screen")).toHaveCount(0);
  const button = (name, exact = true) => page.getByRole("button", { name, exact }).first();
  const hop = async (ones, bigs = 0) => {
    for (let i = 0; i < bigs; i++) await button("Big hop +10").click();
    for (let i = 0; i < ones; i++) await button("Hop +1").click();
  };
  const shot = (name) => page.screenshot({ path: path.join(out, `${label}-${name}.png`) });
  const card = (n) => page.getByRole("button", { name: `Card ${n}`, exact: true });
  const teachPip = async (answer) => {
    await button("No, it's wrong").click();
    await page.locator(".pip-card").getByRole("button", { name: String(answer), exact: true }).click();
    await page.locator('.teach-chips [data-verdict="got_it"]').click();
    await page.getByRole("button", { name: /Pip learned it/ }).click();
  };
  return { page, button, hop, shot, card, teachPip };
}

async function tablet() {
  const { page, button, hop, shot, card, teachPip } = await open("tablet", { width: 1180, height: 820 }, "no-preference");
  try {
    // Chapter 1: glow bits wait on the path, clean hops build the streak, round bonuses count into the score.
    await page.evaluate(() => window.MQClasses.switchTo("1", { quiet: true })); // The Scattered River is Grade 1's Chapter 1.
    await page.getByRole("button", { name: /^Chapter 1:/ }).click();
    await page.locator(".vp-actions .btn").click();
    await button("Skip story").click();
    await expect(page.locator(".story")).toHaveCount(0);
    await expect(page.locator(".arcade-hud")).toBeVisible();
    await expect(page.locator(".pad-bit")).toHaveCount(4);
    await hop(5);
    await expect(page.locator("#frogSum")).toBeVisible();
    await expect(page.locator(".pad-bit")).toHaveCount(0);
    await expect(page.locator(".sum-bonus")).toContainText("Perfect round");
    await expect(page.locator(".ah-mult")).toHaveText("×2");
    await expect.poll(() => score(page)).toBeGreaterThan(500);
    await shot("01-frog-round-clear");
    await button("Next round").click();
    await teachPipRiver(page, button);
    await expect(page.locator(".arcade-banner")).toContainText("Round 2");
    await hop(4, 1);
    await expect(page.locator(".sum-bonus")).toContainText("Smart hops");
    await expect(page.locator("#levelScreen")).toHaveAttribute("data-power", "on");
    await shot("02-frog-power");
    await button("Next round").click();
    await page.locator(".guess-btn", { hasText: "45" }).click();
    await hop(7, 1);
    await page.getByRole("button", { name: /jumped by tens/ }).click();
    await button("Keep going").click();
    await expect(page.locator(".sum-bonus")).toContainText("Bullseye guess");
    await button("Finish").click();
    await expect(page.locator(".result-score")).toBeVisible();
    await expect(page.locator(".rs-new")).toHaveClass(/show/);
    const frogBest = (await saved(page)).best.frog;
    expect(frogBest).toBeGreaterThan(1000);
    await expect(page.locator(".rs-value")).toHaveText(frogBest.toLocaleString("en-US"));
    await expect(page.locator(".rs-highlights")).toContainText("Power mode");
    await shot("03-frog-result");
    await button("Play again").click();
    await expect(page.locator(".ah-value")).toHaveText("0");
    await page.locator("#homeBtn").click();

    // Chapter 2: three connections in a row turn on power mode; the lantern ends with a score tally.
    await page.evaluate(() => window.MQClasses.switchTo("K", { quiet: true })); // The Dark Glade is Kindergarten's Chapter 2.
    await page.getByRole("button", { name: /^Chapter 2:/ }).click();
    await page.locator(".vp-actions .btn").click();
    await button("Skip story").click();
    await expect(page.locator(".story")).toHaveCount(0);
    await expect(page.locator(".fly")).toHaveCount(8);
    for (let made = 0; made < 5; made++) {
      await expect(page.locator("#swarm")).not.toHaveAttribute("aria-busy", "true");
      const pair = await page.locator(".fly").evaluateAll((els) => {
        for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
          if (!els[i].hidden && !els[j].hidden && Number(els[i].textContent) + Number(els[j].textContent) === 10) return [i, j];
        }
        throw new Error("The glade must always contain a make-ten pair");
      });
      for (const i of pair) await page.locator(".fly").nth(i).press("Enter");
      await expect(page.locator(".slot.lit")).toHaveCount(made + 1);
      if (made === 1) await teachPip(11);
      if (made === 2) {
        await expect(page.locator(".arcade-hud")).toHaveAttribute("data-power", "");
        await shot("04-fireflies-power");
      }
    }
    await expect(page.locator(".result-score")).toBeVisible();
    await expect(page.locator(".rs-highlights")).toContainText("Power mode");
    await expect(page.locator(".rs-new")).toHaveClass(/show/);
    expect((await saved(page)).badges.power_surge).toBeTruthy();
    await shot("05-fireflies-result");
    await button("Play again").click();
    await page.locator("#homeBtn").click();

    // Chapter 3: the boss bar drains shield by shield, first-try spells land as critical hits, and a spell
    // that does not match is blocked: the streak cools and no points are taken away.
    await page.evaluate(() => window.MQClasses.switchTo("2", { quiet: true })); // The Muddled Guardian is Grade 2's Chapter 3.
    await page.getByRole("button", { name: /^Chapter 3:/ }).click();
    await page.locator(".vp-actions .btn").click();
    await button("Skip story").click();
    await expect(page.locator(".story")).toHaveCount(0);
    const bar = page.locator(".boss-bar");
    await expect(bar).toHaveAttribute("aria-label", /3 of 3 shields left/);
    await card(28).press("Enter");
    await card(17).press("Enter");
    await expect(bar).toHaveAttribute("aria-label", /2 of 3 shields left/);
    await page.waitForTimeout(300);
    await shot("06-guardian-critical");
    await expect(page.getByRole("button", { name: "Answer 25", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Answer 25", exact: true }).press("Enter");
    await expect(page.locator(".riddle")).toHaveCount(0);
    await expect(card(38)).toBeEnabled();
    await card(38).press("Enter");
    await card(25).press("Enter");
    await teachPip(63);
    await expect(card(46)).toBeEnabled();
    await expect(page.locator("#levelScreen")).toHaveAttribute("data-power", "on");
    const before = await score(page);
    await card(44).press("Enter");
    await card(26).press("Enter");
    await expect(page.locator("#speech")).toContainText("less than 80");
    await expect(page.locator(".ah-mult")).toHaveText("×1");
    await expect(page.locator("#levelScreen")).not.toHaveAttribute("data-power");
    expect(await score(page)).toBeGreaterThanOrEqual(before);
    await expect(page.locator("#hand")).toHaveAttribute("aria-busy", "false");
    await card(46).press("Enter");
    await card(34).press("Enter");
    await expect(page.locator(".result-score")).toBeVisible();
    await expect(page.locator(".rs-highlights")).toContainText("critical");
    await expect(page.locator(".rs-new")).toHaveClass(/show/);
    await shot("07-guardian-result");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    console.log("tablet: glow bits, round bonuses, power mode, boss bar, critical spells, blocked spell and best scores passed");
  } catch (error) {
    await shot("FAIL");
    throw error;
  } finally {
    await page.close();
  }
}

// The first river's Pip lesson, as in the main smoke run.
async function teachPipRiver(page, button) {
  await button("No, it's wrong").click();
  await button("13").click();
  await page.getByRole("button", { name: /counted the pad/ }).click();
  await page.getByRole("button", { name: /Pip learned it/ }).click();
}

async function phone() {
  const { page, button, hop, shot, card } = await open("phone", { width: 390, height: 844 }, "reduce");
  try {
    await page.evaluate(() => window.MQClasses.switchTo("1", { quiet: true })); // The Scattered River is Grade 1's Chapter 1.
    await page.getByRole("button", { name: /^Chapter 1:/ }).click();
    await page.locator(".vp-actions .btn").click();
    await button("Skip story").click();
    await expect(page.locator(".story")).toHaveCount(0);
    await expect(page.locator(".arcade-hud")).toBeVisible();
    await hop(5);
    await expect(page.locator(".sum-bonus")).toContainText("Perfect round");
    await expect.poll(() => score(page)).toBeGreaterThan(500);
    const hud = await page.locator(".arcade-hud").boundingBox();
    expect(hud.x + hud.width).toBeLessThanOrEqual(390);
    await shot("01-frog-round-clear");
    await page.locator("#homeBtn").click();
    await page.evaluate(() => window.MQClasses.switchTo("2", { quiet: true })); // The Muddled Guardian is Grade 2's Chapter 3.
    await page.getByRole("button", { name: /^Chapter 3:/ }).click();
    await page.locator(".vp-actions .btn").click();
    await button("Skip story").click();
    await expect(page.locator(".story")).toHaveCount(0);
    await expect(page.locator(".boss-bar")).toBeVisible();
    await card(28).press("Enter");
    await card(17).press("Enter");
    await expect(page.getByRole("button", { name: "Answer 25", exact: true })).toBeEnabled();
    await shot("02-guardian-riddle");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    console.log("phone (reduced motion): score panel, round bonuses and boss bar passed");
  } catch (error) {
    await shot("FAIL");
    throw error;
  } finally {
    await page.close();
  }
}

try {
  await tablet();
  await phone();
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
