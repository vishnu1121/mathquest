// Saved progress lives only in this browser. Nothing about the child leaves the device.
import type { GameState } from "@/game/state/types";

const STORAGE_KEY = "mathquest.save.v1";

function looksLikeGameState(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<GameState>;
  return candidate.version === 1 && typeof candidate.screen === "string" && typeof candidate.rngState === "number";
}

export function loadGame(): GameState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return looksLikeGameState(parsed) ? parsed : null;
  } catch {
    // Private browsing, blocked storage or a corrupted save: start fresh.
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked; the game keeps working without saving.
  }
}

export function clearGame(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
