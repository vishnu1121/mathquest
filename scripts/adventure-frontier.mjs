import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { playCourier } from "./play-courier.mjs";
const expect = baseExpect.configure({ timeout: 15000 });
const out = path.resolve("test-results/frontier"); mkdirSync(out, { recursive: true });
const url = process.env.BASE_URL || "http://localhost:3001", browser = await chromium.launch();
const errors = [];
const snapshot = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mq.playtest.v3")));
async function run(width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: width < 600 ? "reduce" : "no-preference", acceptDownloads: true });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(`${width}: ${e.stack}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${width}: ${m.text()}`); });
  await page.route("**/api/adventure-ai", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { enabled } });
    const body = route.request().postDataJSON(); requests.push(body);
    if (body.task === "hint") return route.fulfill({ json: { ok: true, data: "Look at the outside edges of your garden." } });
    if (body.task === "journey") return route.fulfill({ json: { ok: true, data: "The recorded garden attempts include practice with support. Try building a small garden together and counting its outside edges. Ask which edges can share a fence." } });
    return route.fulfill({ json: { ok: false, reason: "rejected" } });
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem("mq.playtest.v3")) localStorage.setItem("mq.playtest.v3", JSON.stringify({ prologue: true, hero: "🧑‍🚀", muted: true, grade: "3", chapters: { "g3-facts": true, "g3-twostep": true, "g3-fractions": true, "g3-clock": true, robotworks: true, "g3-quarry": true }, voyage: { version: 1, promise: "listen" } }));
  });
  const shot = async (name) => { await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: path.join(out, `${width}-${name}.png`), fullPage: true, animations: "disabled" }); };
  const resume = async () => { await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{}); await expect(page.locator(".title-screen")).toHaveCount(0); };
  const visit = async (id) => { await page.locator('[data-world-view="quests"]').click(); await page.locator(`[data-quest="${id}"]`).click(); await page.locator(".vp-actions .btn").click(); if (await page.locator(".voyage-story").count()) await page.locator('[data-story="skip"]').click(); await expect(page.locator(".fg-goal")).toBeVisible(); };
  const bonus = async () => { await page.locator('#result [data-act="go"]').click(); while (await page.locator(".voyage-story").count()) await page.locator('[data-story="next"]').click(); await expect(page.locator(".mini")).toBeVisible(); };
  const endBonus = async () => { await expect(page.locator(".mini-done")).toBeVisible(); await page.locator(".mini-done .btn").click(); await expect(page.locator(".mini")).toHaveCount(0); };
  const solveGarden = async () => {
    const numbers = (await page.locator(".fg-goal").textContent()).match(/\d+/g).map(Number), area = numbers[0], perimeter = numbers[1];
    let dims;
    for (let h = 1; h <= 5; h++) for (let w = 1; w <= 5; w++) if (w * h === area && (!perimeter || (w + h) * 2 === perimeter)) dims = [w, h];
    if (!dims) throw Error("Garden has no rectangle solution");
    for (let y = 0; y < dims[1]; y++) for (let x = 0; x < dims[0]; x++) await page.locator(`[data-cell="${y * 5 + x}"]`).click();
    await page.locator('[data-fg="check"]').click(); await expect(page.locator(".fg-feedback")).toHaveAttribute("data-state", "correct");
  };
  const solveWater = async () => {
    const capacities = (await page.locator(".water-vessel > p").allTextContents()).map((t) => Number(t.match(/\d+/)[0]));
    const target = Number((await page.locator(".fg-goal").textContent()).match(/\d+/)[0]);
    const queue = [{ jars: [0, 0], path: [] }], seen = new Set(["0,0"]); let solution;
    for (let i = 0; i < queue.length; i++) {
      const { jars: [a, b], path: moves } = queue[i]; if ([a, b].includes(target)) { solution = moves; break; }
      const ab = Math.min(a, capacities[1] - b), ba = Math.min(b, capacities[0] - a);
      for (const [act, jars] of [["fill-a", [capacities[0], b]], ["fill-b", [a, capacities[1]]], ["empty-a", [0, b]], ["empty-b", [a, 0]], ["pour-a", [a - ab, b + ab]], ["pour-b", [a + ba, b - ba]]]) if (!seen.has(jars.join())) { seen.add(jars.join()); queue.push({ jars, path: [...moves, act] }); }
    }
    if (!solution) throw Error("Water puzzle unreachable");
    for (const act of solution) await page.locator(`[data-water="${act}"]`).click();
    await page.locator('[data-fg="check"]').click(); await expect(page.locator(".fg-feedback")).toHaveAttribute("data-state", "correct");
  };
  try {
    await page.goto(url); await resume(); await shot("01-coast");
    await page.locator("#adultBtn").click(); await expect(page.locator(".adult-dashboard")).toContainText("No answers have been recorded yet"); await expect(page.locator('[data-ad="coach"]')).toBeDisabled(); await shot("02-empty-dashboard"); await page.keyboard.press("Escape");
    await visit("garden"); await shot("03-garden");
    await page.locator('[data-cell="0"]').click(); await page.locator('[data-fg="undo"]').click(); await expect(page.locator('[data-cell="0"]')).toHaveAttribute("aria-pressed", "false");
    await page.locator('[data-fg="check"]').click(); await expect(page.locator(".fg-feedback")).toHaveAttribute("data-state", "retry");
    await page.locator('[data-fg="hint"]').click(); await expect(page.locator(".fg-feedback")).toContainText("AI hint");
    expect(requests.find((r) => r.task === "hint").moves.join()).toContain("Current area 0");
    await solveGarden(); expect((await snapshot(page)).voyage.runs.garden).toMatchObject({ round: 1, independent: 0 });
    await page.reload(); await resume(); await visit("garden"); await expect(page.locator(".fg-round")).toHaveText("MISSION 2 / 4");
    for (let round = 1; round < 4; round++) { await solveGarden(); if (round === 3) await shot("04-garden-fences"); await page.locator('[data-fg="next"]').click(); }
    await bonus(); await shot("05-prism-pop");
    for (let i = 0; i < 100 && !await page.locator(".mini-done").count(); i++) {
      const bestIndex = await page.evaluate(() => {
        const board = [...document.querySelectorAll("[data-gem]")].map((b) => b.dataset.shape);
        const groups = board.map((color, start) => { const found = new Set(), todo = [start]; while (todo.length) { const n = todo.pop(); if (found.has(n) || board[n] !== color) continue; found.add(n); todo.push(...[n % 6 ? n - 1 : -1, n % 6 < 5 ? n + 1 : -1, n - 6, n + 6].filter((m) => m >= 0 && m < 36 && !found.has(m))); } return found.size; });
        return groups.indexOf(Math.max(...groups));
      });
      await page.locator(`[data-gem="${bestIndex}"]`).click(); await page.locator(".pop-launch").click();
    }
    await endBonus(); await visit("water"); await shot("06-water");
    await page.locator('[data-fg="check"]').click(); await expect(page.locator(".fg-feedback")).toHaveAttribute("data-state", "retry");
    for (let round = 0; round < 4; round++) { await solveWater(); if (round === 3) await shot("07-water-complete"); await page.locator('[data-fg="next"]').click(); }
    await bonus(); await page.locator('[data-note="0"]').click(); await page.locator('[data-note="10"]').click(); await page.locator('[data-note="20"]').click(); await page.locator('[data-note="31"]').click(); await page.locator('[data-music="sound"]').click(); expect((await snapshot(page)).muted).toBe(false); await page.locator('[data-music="sound"]').click(); expect((await snapshot(page)).muted).toBe(true); await page.locator('[data-music="play"]').click(); await expect(page.locator(".orchestra-row button.current")).toHaveCount(4); await shot("08-orchestra"); await page.locator('[data-music="play"]').click(); await page.locator('[data-music="save"]').click(); await endBonus();
    await page.locator('[data-world-view="arcade"]').click(); await expect(page.locator(".play-card")).toHaveCount(8);
    expect(await page.locator(".play-card").allTextContents()).not.toEqual(expect.arrayContaining([expect.stringContaining("Cloud Kart Rally")]));
    await page.evaluate(() => { window.MQMini.play("courier"); }); await expect(page.locator(".courier-grid")).toBeVisible(); await shot("09-courier"); await playCourier(page); await endBonus();
    const saved = await snapshot(page); expect(saved.voyage.runs.garden.independent).toBe(3); expect(saved.voyage.runs.water.independent).toBe(3); expect(saved.minis).toMatchObject({ courier: 1, prismpop: 1, orchestra: 1 }); expect(saved.orchestra.filter(Boolean)).toHaveLength(4);
    await page.locator("#adultBtn").click(); await expect(page.locator(".adult-dashboard")).toContainText("8 / 8"); await page.locator(".ad-filter").selectOption("practiced"); await expect(page.locator(".ad-row")).toHaveCount(2); await shot("10-dashboard"); await page.locator('[data-ad="coach"]').click(); await expect(page.locator(".ad-coach")).toContainText("AI coaching note");
    const coaching = requests.find((r) => r.task === "journey"); expect(coaching.lines.join()).toContain("Geometry: recent 5 attempts; 3 correct independently, 1 correct after support or retry, 1 not correct");
    const downloadPromise = page.waitForEvent("download"); await page.locator('[data-ad="export"]').click(); expect((await downloadPromise).suggestedFilename()).toBe("mathquest-practice-snapshot.txt"); await page.keyboard.press("Escape");
    await page.locator("#adultBtn").click(); await expect(page.locator('[data-ad="coach"]')).toBeDisabled(); await expect(page.locator(".ad-ai-status")).toContainText("AI is off"); await page.keyboard.press("Escape");
    await page.evaluate(() => { window.MQMini.play("orchestra"); }); await expect(page.locator('[data-note="31"]')).toHaveAttribute("aria-pressed", "true"); await page.locator(".mini-skip").click();
    console.log(`${width}px: chapters 7–8, all three new minis, saved progress, adult evidence/export, AI hint/coach and fallback passed.`);
  } catch (error) { await page.screenshot({ path: path.join(out, `${width}-failure.png`), fullPage: true }).catch(() => {}); console.error(errors.join("\n")); throw error; }
  finally { await page.close(); }
}
try { for (const width of [1440, 390]) await run(width); if (errors.length) throw new Error(errors.join("\n")); console.log("No JavaScript errors. AI requests were mocked; no provider calls."); }
finally { await browser.close(); }
