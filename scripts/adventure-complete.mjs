// Later chapters, learning supports, keyboard controls, persistence and the ending.
// Uses built-in story text, so this check never makes a paid AI request.
import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const out = path.resolve("test-results/adventure-complete");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const expect = baseExpect.configure({ timeout: 15000 });
try {
  for (const viewport of [{ width: 1180, height: 820 }, { width: 390, height: 844 }]) {
    const label = viewport.width > 600 ? "tablet" : "phone";
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
    await page.route("**/api/adventure-ai", (route) => route.fulfill({ json: { enabled: false } }));
    await page.addInitScript(() => {
      if (!localStorage.getItem("mq.playtest.v3")) localStorage.setItem("mq.playtest.v3", JSON.stringify({ prologue: true, hero: "🧑‍🚀", grade: "K", chapters: { "k-count": true }, choice: "gave" }));
    });
    const shot = (name) => page.screenshot({ path: path.join(out, `${label}-${name}.png`), fullPage: true });
    const click = (name) => page.getByRole("button", { name, exact: true }).click();
    const teach = async (answer) => {
      await click("No, it's wrong");
      await page.locator(".pip-card").getByRole("button", { name: String(answer), exact: true }).click();
      await page.locator('.teach-chips [data-verdict="got_it"]').click();
      await page.getByRole("button", { name: /Pip learned it/ }).click();
    };
    try {
      await page.goto(process.env.BASE_URL ?? "http://localhost:3001");
      await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
      await expect(page.locator(".title-screen")).toHaveCount(0);
      await shot("01-map");
      await page.locator('[data-world-view="quests"]').click();
      await page.locator("[data-journal]").click();
      await expect(page.locator(".journal-card")).toBeVisible();
      await page.keyboard.press("Tab");
      await expect(page.locator(".learning-note summary")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator(".journal-card button")).toBeFocused();
      await shot("02-journal");
      await page.locator(".journal-card button").click();
      await page.locator('[data-world-view="explore"]').click();
      await page.getByRole("button", { name: /^Chapter 2:/ }).click();
      await page.locator(".vp-actions .btn").click();
      await click("Skip story");
      await expect(page.locator(".story")).toHaveCount(0);
      await expect(page.locator(".fly")).toHaveCount(8);
      await expect(page.locator(".glade-frame i")).toHaveCount(10);
      await shot("03-fireflies");

      // A wrong pair gives useful feedback, then a sequence of valid pairs fills the lantern.
      const wrong = await page.locator(".fly").evaluateAll((els) => {
        for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
          if (Number(els[i].textContent) + Number(els[j].textContent) !== 10) return [i, j];
        }
      });
      for (const index of wrong) await page.locator(".fly").nth(index).press("Enter");
      await expect(page.locator("#gladeSub")).toContainText("Try a");
      await expect(page.locator(".slot.lit")).toHaveCount(0);
      for (let made = 0; made < 5; made++) {
        await expect(page.locator("#swarm")).not.toHaveAttribute("aria-busy", "true");
        const pair = await page.locator(".fly").evaluateAll((els) => {
          for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
            if (!els[i].hidden && !els[j].hidden && Number(els[i].textContent) + Number(els[j].textContent) === 10) return [i, j];
          }
          throw new Error("The glade must always contain a make-ten pair");
        });
        await page.locator(".fly").nth(pair[0]).focus();
        await page.keyboard.press("Enter");
        await expect(page.locator(".glade-frame .filled")).not.toHaveCount(0);
        await page.locator(".fly").nth(pair[1]).focus();
        // Deliver the second activation and extra input in the same task, so the latter
        // actually tests the animation lock instead of accidentally selecting a new pair later.
        await page.evaluate((second) => {
          const flies = document.querySelectorAll(".fly");
          flies[second].click();
          flies[(second + 1) % 8].click();
        }, pair[1]);
        await expect(page.locator(".slot.lit")).toHaveCount(made + 1);
        if (made === 1) { await teach(11); await shot("04-pip-learned"); }
      }
      await expect(page.locator("#result")).toBeVisible();
      await shot("05-fireflies-result");
      await click("Continue the story");
      await click("Skip story");
      await expect(page.locator(".story")).toHaveCount(0);
      await expect(page.locator(".mini-flight")).toBeVisible();
      await page.locator(".mini-skip").click();
      await expect(page.locator(".mini-flight")).toHaveCount(0);
      // The Dark Glade is Kindergarten's Chapter 2; the Muddled Guardian is Grade 2's Chapter 3.
      await page.evaluate(() => { window.MQClasses.switchTo("2", { quiet: true }); window.MQS.update((s) => { s.chapters["g2-evenodd"] = true; s.chapters["g2-castle"] = true; }); });
      await page.getByRole("button", { name: /^Chapter 3:/ }).click();
      await page.locator(".vp-actions .btn").click();
      await click("Skip story");
      await expect(page.locator(".story")).toHaveCount(0);
      await expect(page.locator("#hand .card")).toHaveCount(5);
      await page.waitForTimeout(900);
      await shot("06-guardian");
      for (const [index, cards] of [[28, 17], [38, 25], [46, 34]].entries()) {
        for (const n of cards) await page.getByRole("button", { name: `Card ${n}`, exact: true }).press("Enter");
        if (index === 0) {
          await expect(page.getByRole("button", { name: "Answer 25", exact: true })).toBeEnabled();
          await page.getByRole("button", { name: "Answer 25", exact: true }).press("Enter");
          await expect(page.locator(".riddle")).toHaveCount(0);
          await expect(page.getByRole("button", { name: "Card 38", exact: true })).toBeEnabled();
        } else if (index === 1) {
          await teach(63);
          await expect(page.getByRole("button", { name: "Card 46", exact: true })).toBeEnabled();
        }
      }
      await expect(page.locator("#result")).toBeVisible();
      await shot("07-guardian-result");
      await click("Continue the story");
      // Observe the visible drum demonstration; replay through the public keyboard controls.
      await page.evaluate(() => {
        window.drumBeats = [];
        new MutationObserver((records) => {
          // remove/add of a class can produce two records in the same demonstration beat.
          for (const pad of new Set(records.map((r) => r.target))) if (pad.matches?.(".md-pad.hit") && pad.disabled) window.drumBeats.push(Number(pad.dataset.i));
        }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });
      });
      await click("Skip story");
      await expect(page.locator(".story")).toHaveCount(0);
      await expect(page.locator(".mini-dance")).toBeVisible();
      for (let round = 0; round < 3; round++) {
        await expect(page.locator(".md-say")).toContainText("Your turn");
        const beats = await page.evaluate(() => window.drumBeats.splice(0));
        expect(beats).toHaveLength(round + 3);
        for (const beat of beats) await page.keyboard.press(String(beat + 1));
        await expect(page.locator(".mini-label")).toHaveText(`${round + 1} of 3 beats`);
      }
      await expect(page.locator(".mini-done")).toBeVisible();
      await shot("08-dance-complete");
      await click("Continue the story");
      // In classes the chapter ends back on the island; the Lantern Keeper certificate belonged to the original three-chapter story.
      await expect(page.locator(".mini-dance")).toHaveCount(0);
      await expect(page.locator(".cert-card")).toHaveCount(0);
      await expect(page.locator("#voyage-place-guardian")).toHaveAttribute("aria-label", "Chapter 3: The Muddled Guardian, restored");
      await shot("09-island");
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("mq.playtest.v3")));
      expect(saved.chapters.guardian).toBe(true);
      expect(saved.classes.K.chapters.fireflies).toBe(true);
      await page.reload();
      await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
      await expect(page.locator("#voyage-place-guardian")).toHaveAttribute("aria-label", "Chapter 3: The Muddled Guardian, restored");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      console.log(`${label}: Chapters 2–3 in their classes, Teach Pip, dance, journal and saved progress passed`);
    } catch (error) {
      await shot("FAIL");
      throw error;
    } finally { await page.close(); }
  }
  expect(errors).toEqual([]);
} finally { await browser.close(); }
