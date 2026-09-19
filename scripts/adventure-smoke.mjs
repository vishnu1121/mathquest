// Browser smoke run of the story adventure (AI off unless the server has a key): title, unisex hero picker, prologue, map and
// Playground, Chapter 1 with its story ending, Mist Painter, then Lantern Flight and the Dance Party.
// Usage: BASE_URL=http://localhost:3000 node scripts/adventure-smoke.mjs [out-dir]  (dev server must be running)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const here = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? path.join(here, "..", "test-results", "adventure-shots");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function run(vp, full) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.route("**/api/adventure-ai", (route) => route.fulfill({ json: { enabled: false } }));
  page.on("pageerror", (e) => errors.push(`[${vp.name}] ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`[${vp.name} console] ${m.text()}`));
  const shot = (n) => page.screenshot({ path: path.join(out, `${vp.name}-${n}.png`) });
  const click = (name, opts = {}) => page.getByRole("button", { name, ...opts }).first().click();
  const step = async (label, fn) => {
    try {
      await fn();
    } catch (e) {
      errors.push(`[${vp.name}] step "${label}" failed: ${e.message}`);
      await shot(`fail-${label.replace(/\W+/g, "-")}`);
      throw e;
    }
  };
  const hop = async (n, big = 0) => {
    for (const step of [...Array(big).fill(10), ...Array(n).fill(1)]) {
      const position = Number((await page.locator("#riverPlaceValue").getAttribute("aria-label")).match(/On (\d+)/)[1]);
      await click(step === 10 ? "Big hop +10" : "Hop +1", { exact: true });
      await page.waitForFunction((target) => document.querySelector("#riverPlaceValue")?.getAttribute("aria-label").startsWith(`On ${target}:`), position + step);
    }
  };
  const closeMini = async () => {
    await page.locator(".mini-skip").click();
    await page.waitForTimeout(500);
  };

  try {
    await page.goto(url);
    await step("title and hero", async () => {
      await page.waitForTimeout(1900);
      await shot("00-title");
      // The name box is asked once; a later visit goes straight in.
      await page.getByRole("button",{name:/Continue the adventure|Start the adventure/}).first().click({timeout:4000}).catch(()=>{});
      await page.waitForTimeout(700);
      await shot("01-class-picker");
      await page.locator('.class-picker [data-grade="1"]').click(); // Grade 1 begins with The Scattered River.
      await page.waitForTimeout(500);
      await shot("01-hero-picker");
      await page.getByRole("button", { name: "Astronaut" }).click();
      await click("Let's go!");
      await page.waitForTimeout(2500);
      await shot("02-prologue");
      await click("Skip story");
      await page.waitForTimeout(900);
      await shot("03-map");
      await page.locator('[data-world-view="arcade"]').click();
      await page.locator("#playground").scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await shot("04-playground");
      await page.locator('[data-world-view="explore"]').click();
      await page.evaluate(() => window.scrollTo(0, 0));
    });

    if (full) {
      await step("chapter 1", async () => {
        await page.getByRole("button", { name: /^Chapter 1:/ }).click();
        await page.locator(".vp-actions .btn").click();
        await page.waitForTimeout(2500);
        await click("Start Chapter 1");
        await page.waitForTimeout(700);
        await hop(5);
        await page.waitForTimeout(2400);
        await click("Next round");
        await page.waitForTimeout(600);
        await click("No, it's wrong");
        await click("13", { exact: true });
        await page.getByRole("button", { name: /counted the pad/ }).click();
        await page.waitForTimeout(300);
        await click(/Pip learned it/);
        await page.waitForTimeout(500);
        await hop(4, 1);
        await page.waitForTimeout(2400);
        await click("Next round");
        await page.waitForTimeout(700);
        await page.locator(".guess-btn", { hasText: "45" }).click();
        await hop(7, 1);
        await page.waitForTimeout(3200);
        await page.getByRole("button", { name: /jumped by tens/ }).click();
        await page.waitForTimeout(300);
        await click("Keep going");
        await page.waitForTimeout(600);
        await click("Finish");
        await page.waitForTimeout(2500);
        await shot("05-result");
        await click("Continue the story");
        await page.waitForTimeout(3000);
        await click("Next", { exact: true });
        await page.waitForTimeout(3500);
        await page.getByRole("button", { name: /Give/ }).click();
        await page.waitForTimeout(2500);
        await page.locator(".story").getByRole("button", { name: "Back to the map" }).click();
      });

      await step("mist painter", async () => {
        await page.locator(".mini-mist").waitFor({ timeout: 8000 });
        await page.waitForTimeout(900);
        await shot("06-mist-start");
        const box = await page.locator(".mm-mist").boundingBox();
        for (let r = 0; r < 11 && !(await page.locator(".mini-done").count()); r++) {
          const y = box.y + ((r + 0.5) * box.height) / 11;
          await page.mouse.move(box.x + 10, y);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width - 10, y, { steps: 14 });
          await page.mouse.up();
          if (r === 4) await shot("07-mist-painting");
        }
        await page.locator(".mini-done").waitFor({ timeout: 8000 });
        await page.waitForTimeout(700);
        await shot("08-mist-done");
        await click("Continue the story");
        await page.waitForTimeout(1800);
        await shot("09-map-after-chapter");
      });
    }

    await step("lantern flight", async () => {
      await page.evaluate(() => void window.MQMini.play("flight"));
      await page.waitForTimeout(1200);
      await shot("10-flight-hint");
      const c = await page.locator(".mini-stage").boundingBox();
      await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(500);
      await page.mouse.up();
      await page.waitForTimeout(1600);
      await shot("11-flight");
      await closeMini();
    });

    await step("dance party", async () => {
      await page.evaluate(() => void window.MQMini.play("dance"));
      await page.waitForTimeout(3000);
      await shot("12-dance-watch");
      await page.locator(".md-say", { hasText: "Your turn" }).waitFor({ timeout: 10000 });
      await shot("13-dance-turn");
      await page.locator(".md-pad").first().dispatchEvent("pointerdown");
      await page.waitForTimeout(400);
      await closeMini();
    });
  } catch {
    // Already recorded.
  } finally {
    await page.close();
  }
}

await run({ name: "tablet", width: 1180, height: 820 }, true);
await run({ name: "phone", width: 390, height: 844 }, false);
await browser.close();
console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "No JS errors");
if (errors.length) process.exitCode = 1;
