"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { clearGame, loadGame, saveGame } from "@/lib/storage";
import { createInitialState, gameReducer, type GameAction } from "./state/reducer";
import { buildScenario, DEMO_SEED, isScenarioId } from "./state/scenarios";
import type { GameState } from "./state/types";

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

function randomSeed(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? Date.now();
}

/** Runs in the browser only: the game is loaded without server rendering. */
function loadInitialState(): GameState {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get("scenario");
  if (isScenarioId(scenario)) return buildScenario(scenario, Date.now());
  const seed = params.get("demo") === "1" ? DEMO_SEED : randomSeed();
  if (params.has("reset")) {
    clearGame();
    return createInitialState(seed);
  }
  return loadGame() ?? createInitialState(seed);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadInitialState);

  // Drop ?reset from the address bar after mount so a refresh doesn't wipe progress again.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("reset")) return;
    url.searchParams.delete("reset");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);

  useEffect(() => {
    saveGame(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameContext value={value}>{children}</GameContext>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used inside GameProvider");
  return context;
}
