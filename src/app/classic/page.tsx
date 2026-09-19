import type { Metadata } from "next";
import { GameRoot } from "@/game/GameRoot";

export const metadata: Metadata = {
  title: "MathQuest classic",
  description: "The first MathQuest MVP: adaptive addition challenges with Hoot's hints and Pip's Puzzle.",
};

/** The original quiz-style MVP, kept for reference. The story adventure lives at "/". */
export default function ClassicPage() {
  return <GameRoot />;
}
