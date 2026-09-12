import { describe, expect, it } from "vitest";
import { blocksReducer, blocksValue, emptyBlocks, MAX_TENS, type BlocksAction, type BlocksState } from "./blocksState";

const run = (actions: BlocksAction[], start: BlocksState = emptyBlocks()) => actions.reduce(blocksReducer, start);
const repeat = (action: BlocksAction, n: number) => Array.from({ length: n }, () => action);

describe("blocksReducer", () => {
  it("builds a number from tens and ones", () => {
    const state = run([...repeat({ type: "addTen" }, 4), ...repeat({ type: "addOne" }, 7)]);
    expect(state).toMatchObject({ tens: 4, ones: 7 });
    expect(blocksValue(state)).toBe(47);
  });

  it("bundles 10 ones into a ten without changing the value", () => {
    const before = run([...repeat({ type: "addTen" }, 7), ...repeat({ type: "addOne" }, 15)]);
    const after = blocksReducer(before, { type: "bundle" });
    expect(after).toMatchObject({ tens: 8, ones: 5 });
    expect(blocksValue(after)).toBe(blocksValue(before));
  });

  it("only bundles when there are at least 10 ones", () => {
    const state = run(repeat({ type: "addOne" }, 9));
    expect(blocksReducer(state, { type: "bundle" })).toBe(state);
  });

  it("undoes one step at a time, including a bundle", () => {
    const bundled = run([...repeat({ type: "addOne" }, 12), { type: "bundle" }]);
    expect(blocksReducer(bundled, { type: "undo" })).toMatchObject({ tens: 0, ones: 12 });
    expect(blocksReducer(emptyBlocks(), { type: "undo" })).toMatchObject({ tens: 0, ones: 0 });
  });

  it("stops adding at the limits", () => {
    const full = run(repeat({ type: "addTen" }, MAX_TENS));
    expect(blocksReducer(full, { type: "addTen" })).toBe(full);
  });
});
