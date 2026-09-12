#!/usr/bin/env node
// Visual QA: plays through the game in a headless browser and saves screenshots at tablet and
// phone sizes. Usage: node scripts/screenshots.mjs <output-dir>  (dev server must be starting or running)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "screenshots";
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "tablet", width: 1180, height: 820 },
  { name: "phone", width: 390, height: 844 },
];

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server at ${BASE} did not start`);
}

/** Reads "47 + 38 = ?" or "28 + ? = 45" and returns the answer. */
function answerFor(text) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  const addend = clean.match(/^(\d+) \+ \? = (\d+)$/);
  if (addend) return String(Number(addend[2]) - Number(addend[1]));
  const total = clean.match(/^(\d+) \+ (\d+) =/);
  if (total) return String(Number(total[1]) + Number(total[2]));
  throw new Error(`Unrecognized equation: ${clean}`);
}

await waitForServer();
const browser = await chromium.launch();

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") console.log(`[${viewport.name} ${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => console.log(`[${viewport.name} pageerror] ${err.message}`));
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${viewport.name}-${name}.png`) });

  await page.goto(`${BASE}/?reset&demo=1`);
  const start = page.getByRole("button", { name: "Start the adventure" });
  await start.waitFor({ timeout: 60000 });
  await page.waitForTimeout(900);
  await shot("1-welcome");

  await start.click();
  await page.getByRole("button", { name: "Grade 2" }).click();
  await shot("2-profile");
  await page.getByRole("button", { name: "Start the warm-up" }).click();

  for (let i = 0; i < 8; i++) {
    const equation = page.locator('[class*="equation"]').first();
    await equation.waitFor();
    await page.waitForTimeout(150);
    if ([0, 2, 5].includes(i)) await shot(`3-warmup-${i + 1}`);
    for (const digit of answerFor(await equation.textContent())) {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.getByRole("button", { name: "Check my answer" }).click();
  }

  await page.getByRole("button", { name: "Enter Addition Forest" }).waitFor();
  await page.waitForTimeout(500);
  await shot("4-placement");

  // The forest: a wrong answer, Hoot's hints, then a solve.
  await page.getByRole("button", { name: "Enter Addition Forest" }).click();
  const equation = page.locator('[class*="equation"]').first();
  await equation.waitFor();
  await page.waitForTimeout(900);
  await shot("5-forest");
  const answer = answerFor(await equation.textContent());
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.waitForTimeout(400);
  await shot("6-forest-almost");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /Ask Hoot|Another hint|Show me how/ }).click();
  }
  await page.waitForTimeout(500);
  await shot("7-forest-hint");
  for (const digit of answer) await page.getByRole("button", { name: digit, exact: true }).click();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.waitForTimeout(500);
  await shot("8-forest-solved");
  await page.getByRole("button", { name: "Back to the map" }).click();
  await page.waitForTimeout(600);
  await shot("9-map");

  // Scenes that take longer to reach in live play.
  await page.goto(`${BASE}/?scenario=pip`);
  await page.getByText("Tap the part Pip got wrong.").waitFor({ timeout: 60000 });
  await page.waitForTimeout(700);
  await shot("10-pip");

  // Teach Pip: find the mistake, then explain it with a card.
  await page.getByRole("button", { name: /^Pip's ones/ }).click();
  await page.getByText("Teach Pip: why was my answer wrong?").waitFor();
  await page.waitForTimeout(400);
  await shot("10b-teach-pip");

  // Build-it blocks on a picture problem.
  await page.goto(`${BASE}/?scenario=blocks`);
  await page.getByText("Build your answer").waitFor({ timeout: 60000 });
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Add a ten" }).click();
  for (let i = 0; i < 12; i++) await page.getByRole("button", { name: "Add a one" }).click();
  await page.waitForTimeout(400);
  await shot("10c-build-blocks");
  await page.goto(`${BASE}/?scenario=gate`);
  await page.getByRole("button", { name: "Face the Forest Guardian" }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(900);
  await shot("11-gate");

  // The Forest Guardian round, answered correctly, then the glowing forest.
  await page.getByRole("button", { name: "Face the Forest Guardian" }).click();
  for (let i = 0; i < 5; i++) {
    const bossEquation = page.locator('[class*="equation"]').first();
    await bossEquation.waitFor();
    await page.waitForTimeout(300);
    if (i === 0) await shot("12-boss");
    const bossAnswer = answerFor(await bossEquation.textContent());
    if (await page.getByRole("button", { name: "Add a ten" }).isVisible()) {
      // Picture shields use Build-it blocks instead of the number pad.
      const total = Number(bossAnswer);
      for (let t = 0; t < Math.floor(total / 10); t++) await page.getByRole("button", { name: "Add a ten" }).click();
      for (let o = 0; o < total % 10; o++) await page.getByRole("button", { name: "Add a one" }).click();
    } else {
      for (const digit of bossAnswer) await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.getByRole("button", { name: "Check my answer" }).click();
    await page.waitForTimeout(450);
    if (i === 1) await shot("13-boss-shield-falls");
    await page.getByRole("button", { name: /Next challenge|See how I did/ }).click();
  }
  await page.getByRole("button", { name: "Back to the map" }).waitFor();
  await page.waitForTimeout(1000);
  await shot("14-complete");

  // The grown-ups report behind the parent gate.
  await page.getByRole("button", { name: "Grown-ups view" }).click();
  await page.getByRole("button", { name: "56", exact: true }).click();
  await page.getByRole("heading", { name: /learning/ }).waitFor();
  await page.waitForTimeout(400);
  await shot("15-grownups");
  await page.close();
}

await browser.close();
console.log(`Screenshots saved to ${OUT}`);
