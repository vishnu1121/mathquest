// Solve the visible depot, then use the actual game controls. No save/score writes.
export async function playCourier(page) {
  for (let round = 0; round < 3; round++) {
    const path = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll(".courier-cell")];
      const walls = tiles.flatMap((el, i) => el.classList.contains("wall") ? [i] : []), goals = tiles.flatMap((el, i) => el.classList.contains("goal") ? [i] : []);
      const initial = { player: tiles.findIndex((el) => el.classList.contains("player")), boxes: tiles.flatMap((el, i) => el.classList.contains("box") ? [i] : []), path: [] };
      const key = (b) => `${b.player}:${[...b.boxes].sort((a, c) => a - c).join()}`, queue = [initial], seen = new Set([key(initial)]);
      for (let i = 0; i < queue.length && i < 40000; i++) {
        const b = queue[i]; if (b.boxes.every((n) => goals.includes(n))) return b.path;
        for (const [dir, delta] of [["up", -6], ["down", 6], ["left", -1], ["right", 1]]) {
          const to = b.player + delta; if (walls.includes(to) || to < 0 || to >= 36 || Math.abs(to % 6 - b.player % 6) > 1) continue;
          const boxes = [...b.boxes], index = boxes.indexOf(to);
          if (index >= 0) { const pushed = to + delta; if (walls.includes(pushed) || boxes.includes(pushed) || pushed < 0 || pushed >= 36 || Math.abs(pushed % 6 - to % 6) > 1) continue; boxes[index] = pushed; }
          const next = { player: to, boxes, path: [...b.path, dir] }; if (!seen.has(key(next))) { seen.add(key(next)); queue.push(next); }
        }
      }
      return null;
    });
    if (!path) throw new Error("Visible courier room has no solution");
    for (const move of path) await page.locator(`[data-dir="${move}"]`).click();
    await page.locator('[data-courier="next"]').click();
  }
}
