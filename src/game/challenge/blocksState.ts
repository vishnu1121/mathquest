// Build-it blocks: the child builds an answer from tens rods and ones cubes, and bundles 10 ones
// into a ten. Pure state logic, kept apart from the component so it can be tested.

export const MAX_TENS = 19;
export const MAX_ONES = 19;

export interface BlocksCount {
  tens: number;
  ones: number;
}

export interface BlocksState extends BlocksCount {
  history: BlocksCount[];
}

export type BlocksAction = { type: "addTen" } | { type: "addOne" } | { type: "bundle" } | { type: "undo" };

export const emptyBlocks = (): BlocksState => ({ tens: 0, ones: 0, history: [] });

export const blocksValue = (state: BlocksCount): number => state.tens * 10 + state.ones;

/** Returns the same object when an action can't apply, so callers can skip no-op updates. */
export function blocksReducer(state: BlocksState, action: BlocksAction): BlocksState {
  const step = (next: BlocksCount): BlocksState => ({
    ...next,
    history: [...state.history, { tens: state.tens, ones: state.ones }].slice(-30),
  });

  switch (action.type) {
    case "addTen":
      return state.tens >= MAX_TENS ? state : step({ tens: state.tens + 1, ones: state.ones });
    case "addOne":
      return state.ones >= MAX_ONES ? state : step({ tens: state.tens, ones: state.ones + 1 });
    case "bundle":
      return state.ones < 10 || state.tens >= MAX_TENS ? state : step({ tens: state.tens + 1, ones: state.ones - 10 });
    case "undo": {
      const previous = state.history.at(-1);
      return previous ? { ...previous, history: state.history.slice(0, -1) } : state;
    }
  }
}
