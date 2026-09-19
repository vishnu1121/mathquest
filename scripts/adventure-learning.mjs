// Observe real inputs and saved evidence: visual help, retries, adaptation and reloads.
// AI is disabled by the route mock; no paid request or learner account is needed.
import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve("test-results/adventure-learning");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  for (const width of [1180, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/adventure-ai", (route) => route.fulfill({ json: { enabled: false } }));
    await page.addInitScript(() => {
      if (!localStorage.getItem("mq.playtest.v3")) localStorage.setItem("mq.playtest.v3", JSON.stringify({ prologue: true, hero: "🧑‍🚀", grade: "2", chapters: { "g2-evenodd": true, "g2-castle": true }, coins: 11 }));
    });
    const shot = (name) => page.screenshot({ path: path.join(out, `${width}-${name}.png`), fullPage: true });
    const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("mq.playtest.v3")));
    const enterGuardian = async () => {
      await page.getByRole("button", { name: /^Chapter 3:/ }).click();
      await page.locator(".vp-actions .btn").click();
      await page.getByRole("button", { name: "Skip story", exact: true }).click();
      await expect(page.locator(".story")).toHaveCount(0);
      await expect(page.locator("#hand .card")).toHaveCount(5);
    };
    const card = (n) => page.getByRole("button", { name: `Card ${n}`, exact: true });
    try {
      await page.goto(process.env.BASE_URL ?? "http://localhost:3001");
      await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
      if (width < 600) {
        await expect(page.locator(".title-screen")).toHaveCount(0);
        const heading = await page.locator("#journeyHeading").boundingBox();
        // The island replaced the old journey map; this overlap check applies only while that map is shown.
        for (const node of heading ? await page.locator(".node-disc").all() : []) {
          const box = await node.boundingBox();
          if (box) expect(box.y).toBeGreaterThan(heading.y + heading.height);
        }
      }
      await enterGuardian();
      await card(28).press("Enter");
      await page.getByRole("button", { name: "Build the spell with blocks" }).click();
      await expect(page.getByRole("dialog", { name: "Build a number spell" })).toBeVisible();
      await expect(page.locator(".builder-models section")).toHaveCount(2);
      await expect(page.locator(".builder-models section").first().getByRole("img")).toHaveAttribute("aria-label", "4 tens and 5 ones");
      await expect(page.locator(".builder-models section").last().getByRole("img")).toHaveAttribute("aria-label", "2 tens and 8 ones");
      await shot("01-build-with-blocks");
      await page.keyboard.press("Escape");
      await expect(page.locator(".builder-dialog")).toHaveCount(0);
      await expect(page.locator(".spell-help")).toBeFocused();
      await card(28).press("Enter"); // Unpick the comparison card.
      for (let attempt = 0; attempt < 2; attempt++) {
        await card(20).press("Enter");
        await card(15).press("Enter");
        await expect(page.locator("#speech")).toContainText("less than 45");
        await expect(page.locator("#spellTotal")).toHaveText("?");
        await expect(page.locator("#hand")).toHaveAttribute("aria-busy", "false");
      }
      await card(28).press("Enter");
      await card(17).press("Enter");
      await expect(page.getByRole("button", { name: "Answer 25", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Answer 25", exact: true }).press("Enter");
      await expect(page.locator(".riddle")).toHaveCount(0);
      await expect(page.locator("#speech")).toContainText("one small card");
      const supported = (await state()).learning.skills.regroup;
      expect(supported.level).toBe(2);
      expect(supported.recent.map((r) => [r.correct, r.independent])).toEqual([[false, false], [false, false], [true, false]]);
      const hasSmallSolution = await page.locator("#hand .card").evaluateAll((els) => {
        const target = Number(document.querySelector(".shield.current span").textContent);
        const nums = els.map((el) => Number(el.dataset.n));
        return nums.some((a, i) => nums.some((b, j) => i !== j && a + b === target && Math.min(a, b) < 10));
      });
      expect(hasSmallSolution).toBe(true);
      await shot("02-adaptive-spell");
      await page.locator("#homeBtn").click();
      await page.locator('[data-world-view="quests"]').click();
      await page.locator("[data-journal]").click();
      await page.locator(".learning-note summary").click();
      await expect(page.locator(".learning-skills")).toContainText("1 correct with help or a retry");
      await page.locator(".learning-skills").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `${width}-03-learning-journal.png`) });
      await page.locator(".journal-card > button").click();
      await page.reload();
      await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
      expect((await state()).learning.skills.regroup).toEqual(supported);
      expect((await state()).chapters).toEqual({ "g2-evenodd": true, "g2-castle": true });
      await enterGuardian();
      expect((await state()).learning.skills.regroup.level).toBe(2);
      await page.locator("#homeBtn").click();

      // The glade retains its make-ten objective and provides a steadier view after retries.
      // The Dark Glade is Kindergarten's Chapter 2; its chapters are marked finished so the story intro is skipped.
      await page.evaluate(() => { window.MQClasses.switchTo("K", { quiet: true }); window.MQS.update((s) => { s.chapters["k-count"] = true; s.chapters.fireflies = true; }); });
      await page.getByRole("button", { name: /^Chapter 2:/ }).click();
      await page.locator(".vp-actions .btn").click();
      for (let attempt = 0; attempt < 2; attempt++) {
        const wrong = await page.locator(".fly").evaluateAll((els) => {
          for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
            if (Number(els[i].textContent) + Number(els[j].textContent) !== 10) return [i, j];
          }
        });
        for (const i of wrong) await page.locator(".fly").nth(i).press("Enter");
      }
      await expect(page.locator("#swarm")).toHaveAttribute("data-steady", "true");
      await expect(page.locator("#gladeSub")).toContainText("stay still");
      await shot("04-steady-fireflies");
      expect((await state()).learning.skills.simple.recent.every((r) => !r.independent)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      console.log(`${width}px: block helper, retry evidence, adaptive shield, journal, save migration and steady fireflies passed`);
    } catch (error) {
      await shot("FAIL");
      throw error;
    } finally { await page.close(); }
  }
  expect(errors).toEqual([]);
} finally { await browser.close(); }
