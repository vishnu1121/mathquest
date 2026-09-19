// Live check: play a real level against the REAL provider accounts and see whether replaying it gives
// different questions. Nothing is mocked — this is the route, both accounts and the guard, exactly as a
// child hits them.
//
// THIS SPENDS REAL PROVIDER QUOTA. It is deliberately not in `npm run check` and not one of the smoke
// suites, all of which mock or disable AI. Run it by hand, with the owner's say-so, when the keys change
// or the prompt changes:
//
//   BASE_URL=http://localhost:3001 node scripts/live-question-check.mjs
//   LEVEL=apex-g5-cargo node scripts/live-question-check.mjs     (any registered level id)
//
// It waits between rounds on purpose. A free tier is limited per MINUTE, and real play has a child
// thinking for half a minute between questions; firing five in five seconds measures the rate limiter
// rather than the question writer.
import { chromium } from "@playwright/test";

const url = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));

await page.addInitScript(() => localStorage.setItem("mq.playtest.v3", JSON.stringify({ grade: "5", prologue: true, muted: true, hero: "🧑‍🚀", chapters: {}, unlockAll: true })));
await page.goto(url);
await page.getByRole('button',{name:/Continue the adventure|Start the adventure/}).click({timeout:4000}).catch(()=>{});
await page.evaluate(() => {
  window.MQClasses.switchTo("5", { quiet: true });
  // Mark the island finished: it skips the chapter cutscene (openLevel awaits it, and it only resolves on
  // a click) and it is also what unlocks Apex.
  window.MQS.update((s) => { for (const c of window.MQClasses.current().chapters) s.chapters[c.id] = true; });
  window.MQApex.syncNav(); window.MQApex.renderPanel();
});
console.log("AI status:", JSON.stringify(await page.evaluate(() => ({ generate: window.MQAI.generateStatus() }))));

/** One full run of a level, returning each question and where it came from. */
async function run(levelId) {
  await page.evaluate((id) => window.MQ.openLevel(window.MQ.levels.find((l) => l.id === id)), levelId);
  await page.locator("#cgPrompt").waitFor({ state: "visible", timeout: 20000 });
  const seen = [];
  for (let round = 0; round < 5; round++) {
    // Give the prefetch the time a child would: they spend twenty seconds or more on a question, and the
    // next one is written during that. Clicking through in three seconds measures the network, not the
    // feature. PAUSE lets this be dialled to match real reading pace.
    await page.waitForTimeout(Number(process.env.PAUSE || 3500));
    const prompt = (await page.locator("#cgPrompt").textContent())?.trim();
    const source = await page.locator("#stage").getAttribute("data-question-source");
    seen.push({ round: round + 1, source, prompt });
    await page.evaluate(() => window.MQClassGames.fillAnswer());
    await page.locator('[data-cg="check"]').click();
    await page.locator('[data-cg="next"]').waitFor({ state: "visible", timeout: 20000 });
    await page.locator('[data-cg="next"]').click();
  }
  // Finish properly. A level left part-way keeps its checkpoint, and a checkpoint keeps its SEED — so an
  // abandoned run really does replay the same five questions, and a test that abandons measures that
  // instead of what it meant to.
  // An Apex quest may pay out a gem, and each reveal beat opens the next one, so this has to loop rather
  // than collect whatever happens to be open at this instant.
  for (let guard = 0; guard < 6; guard++) {
    const reveal = page.locator("dialog.apex-reveal[open]");
    if (!(await reveal.count())) break;
    const title = await reveal.locator("#apexDialogTitle").textContent().catch(() => null);
    if (await page.locator("dialog.apex-found[open]").count()) console.log(`  ** treasure: ${title?.trim()}`);
    await reveal.locator(".vp-actions button").first().click();
    await page.waitForTimeout(200);
  }
  await page.locator("#result .result-card").waitFor({ state: "visible", timeout: 25000 });
  // The checkpoint is already cleared by the time this card shows, so leave by the back door rather than
  // through the card's button, which would start the chapter outro and its bonus game.
  await page.evaluate(() => { document.getElementById("result").hidden = true; window.MQ.showMap(); });
  return seen;
}

const level = process.env.LEVEL || "g5-cargo";
const runs = [];
for (let i = 0; i < 2; i++) {
  console.log(`\n=== ${level}: play ${i + 1} ===`);
  const seen = await run(level);
  for (const q of seen) console.log(`  ${q.round}. [${q.source === "ai" ? "AI " : "bank"}] ${q.prompt}`);
  runs.push(seen);
}

const [a, b] = runs;
const same = a.filter((q, i) => q.prompt === b[i].prompt).length;
const ai = [...a, ...b].filter((q) => q.source === "ai").length;
console.log(`\n--- replay ---`);
console.log(`AI-written across both plays: ${ai}/10`);
console.log(`identical between play 1 and play 2: ${same}/5`);
console.log(`every question distinct across both plays: ${new Set([...a, ...b].map((q) => q.prompt)).size}/10`);
if (errors.length) console.log("JS errors:", errors.join(" | "));
await browser.close();
