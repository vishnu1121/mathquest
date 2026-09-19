import type { Rng } from "../../engine/rng";
import type { SceneTask } from "./tasks";

export function picnic(r: Rng, max = 5): SceneTask {
  const target = r.int(1, max), berries = target === 1 ? "berry" : "berries";
  return { kind: "scene", mode: "collect", skill: "k.cc.count", emoji: "🍓", size: max + 2, columns: 5, fixed: 0, target,
    prompt: `Put ${target} ${berries} in Pip’s basket.`, hint: "Touch a berry to put it in. Touch it again to take it out.", explain: `One touch for each berry: ${target} ${berries} for Pip.` };
}
export function fireflyHomes(r: Rng, toTen = true): SceneTask {
  const target = toTen ? 10 : 5, fixed = r.int(1, target - 1);
  return { kind: "scene", mode: "tenframe", skill: toTen ? "k.oa.maketen" : "k.oa.fluency", emoji: "✨", size: target - fixed, columns: 5, fixed, target,
    prompt: `Help the fireflies fill all ${target} homes.`, hint: "Some homes are already glowing. Touch an empty home.", explain: `${fixed} and ${target - fixed} make ${target}. Every firefly has a home.` };
}
export function balanceBridge(r: Rng, max = 20): SceneTask {
  const target = r.int(4, max), fixed = r.int(1, target - 1);
  return { kind: "scene", mode: "balance", skill: "g1.oa.unknown", emoji: "🪨", size: max, columns: 5, fixed, target,
    prompt: `The bridge needs ${target} stones on each side. Finish the right side.`, hint: "Both sides must weigh the same. Add a stone and see which side is lower.", explain: `${fixed} + ${target - fixed} = ${target}. The equal sign means the same amount on both sides.` };
}
export function seedRows(r: Rng, grade: "2" | "3" | "4"): SceneTask {
  const rows = r.int(2, grade === "2" ? 4 : 5), each = r.int(2, grade === "2" ? 5 : 6);
  return { kind: "scene", mode: "array", skill: grade === "2" ? "g2.oa.arrays" : grade === "3" ? "g3.oa.multiply" : "g4.oa.factors", emoji: grade === "4" ? "💎" : "🌱", size: rows * (each + 1), columns: each + 1, rows, fixed: 0, target: rows * each,
    prompt: grade === "2" ? `Plant ${rows} rows with ${each} seeds in each row.` : grade === "3" ? `Give each of ${rows} robots ${each} power seeds.` : `Pack ${rows * each} crystals equally into ${rows} rows.`,
    hint: "Fill a row, then make the other rows match it.", explain: grade === "2" ? `${Array(rows).fill(each).join(" + ")} = ${rows * each}. Equal rows are an array.` : `${rows} × ${each} = ${rows * each}. Every row has the same number.` };
}
export function fractionWindow(r: Rng, grade: "3" | "4"): SceneTask {
  const parts = r.pick([4, 6, 8]), numerator = grade === "3" ? 1 : r.int(1, parts / 2 - 1), denominator = grade === "3" ? parts : parts / 2;
  const target = numerator * parts / denominator;
  return { kind: "scene", mode: "fraction", skill: grade === "3" ? "g3.nf.unit" : "g4.nf.equivalent", emoji: "💠", size: parts, columns: parts, fixed: 0, target, parts,
    prompt: `Light ${numerator}/${denominator} of the lighthouse window.`, hint: "The whole window has equal panes. Think about how much of the whole should glow.", explain: `${target}/${parts} of this window equals ${numerator}/${denominator}. Equal-sized parts let us compare fairly.` };
}
/**
 * A plotting problem with something to work out. The grid carries no coordinate labels: the child is told
 * where the depot is and how far the drop is from it, and has to find the square that answer lands on.
 * `far` allows a move back down the grid as well as up, which is the harder version.
 */
export function coordinateRescue(r: Rng, far = false): SceneTask {
  const ox = r.int(0, far ? 4 : 3), oy = r.int(far ? 1 : 0, far ? 5 : 3);
  const dx = r.int(1, 5 - ox), dy = far && r.int(0, 1) === 1 ? -r.int(1, oy) : r.int(1, 5 - oy);
  const x = ox + dx, y = oy + dy;
  const up = dy >= 0 ? `${dy} up` : `${-dy} down`;
  return { kind: "scene", mode: "coordinate", skill: "g5.g.plot", emoji: "🚤", size: 36, columns: 6, fixed: 0, target: y * 6 + x,
    destination: { x, y }, origin: { x: ox, y: oy, emoji: "🏚️" },
    prompt: `The depot 🏚️ is at (${ox}, ${oy}). The drop point is ${dx} across and ${up} from the depot. Send the delivery there.`,
    hint: "Find the depot first. Count across from it, then up or down. The across number is always written first.",
    explain: `From (${ox}, ${oy}), ${dx} across makes the first number ${x}, and ${up} makes the second ${y}. The drop point is (${x}, ${y}).` };
}
