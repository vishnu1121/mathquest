"use client";

import { useMemo } from "react";
import { deriveWorld } from "@/engine/world";
import { useGame } from "../GameProvider";
import { HEROES } from "../state/types";
import { Button } from "../ui/Button";
import { Hud } from "../ui/Hud";
import { SpeakButton } from "../ui/SpeakButton";
import styles from "./WorldMap.module.css";

type RegionStatus = "visited" | "open" | "unlocked" | "locked";

/** Positions are percentages of the map area; the trail path below follows them in order. */
const REGIONS = [
  { id: "village", name: "Starting Village", icon: "🏘️", x: 12, y: 76 },
  { id: "forest", name: "Addition Forest", icon: "🌳", x: 32, y: 50 },
  { id: "desert", name: "Subtraction Desert", icon: "🏜️", x: 56, y: 72 },
  { id: "mountain", name: "Multiplication Mountain", icon: "🏔️", x: 76, y: 44 },
  { id: "castle", name: "Division Castle", icon: "🏰", x: 50, y: 20 },
  { id: "volcano", name: "Fraction Volcano", icon: "🌋", x: 86, y: 16 },
] as const;

export function WorldMap() {
  const { state, dispatch } = useGame();
  const { model, profile, xp, bossPassed } = state;
  const world = useMemo(() => (model ? deriveWorld(model, bossPassed) : null), [model, bossPassed]);
  if (!model || !profile || !world) return null;

  const heroEmoji = HEROES.find((h) => h.id === profile.hero)?.emoji ?? "🧙";
  const statusOf = (id: (typeof REGIONS)[number]["id"]): RegionStatus => {
    if (id === "village") return "visited";
    if (id === "forest") return "open";
    if (id === "desert" && world.regionComplete) return "unlocked";
    return "locked";
  };
  const mission = world.regionComplete
    ? { line: "The forest is glowing! Subtraction Desert opens next.", cta: "Visit the forest" }
    : world.gateOpen
      ? { line: "The Guardian gate is open. Are you ready?", cta: "Go to the gate" }
      : { line: "Today's mission: fix the river bridge.", cta: "Go to the bridge" };
  const enterForest = () => dispatch({ type: "enterForest", at: Date.now() });

  return (
    <div className={styles.map}>
      <Hud title={`${profile.name}'s map`} xp={xp} heroEmoji={heroEmoji} heroName={profile.name} />

      <div className={styles.land}>
        <svg className={styles.path} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path className={styles.walked} d="M12 76 C20 66 24 58 32 50" />
          <path className={styles.trail} d="M32 50 C42 52 50 66 56 72 C66 78 78 56 76 44 C74 30 60 26 50 20 C64 12 76 12 86 16" />
        </svg>
        <ol className={styles.regions} aria-label="World map">
          {REGIONS.map((region) => {
            const status = statusOf(region.id);
            const note =
              status === "open"
                ? `${world.masteredCount} of 4 trails glowing`
                : status === "visited"
                  ? "Visited"
                  : status === "unlocked"
                    ? "Unlocked! Coming soon"
                    : "Coming soon";
            const content = (
              <>
                <span className={styles.icon} aria-hidden="true">
                  {region.icon}
                  {status === "open" ? <span className={styles.here}>{heroEmoji}</span> : null}
                </span>
                <span className={styles.name}>{region.name}</span>
                <span className={styles.note}>{note}</span>
              </>
            );
            return (
              <li
                key={region.id}
                className={styles.region}
                data-status={status}
                style={{ left: `${region.x}%`, top: `${region.y}%` }}
              >
                {status === "open" ? (
                  <button type="button" className={styles.regionBody} onClick={enterForest}>
                    {content}
                  </button>
                ) : (
                  <div className={styles.regionBody}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className={styles.mission}>
        <div className={styles.missionText}>
          <p className={styles.missionLine}>{mission.line}</p>
          <div className={styles.trails} role="img" aria-label={`${world.masteredCount} of 4 forest trails glowing`}>
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} data-on={i < world.masteredCount} />
            ))}
          </div>
        </div>
        <Button variant="quiet" onClick={() => dispatch({ type: "goTo", screen: "grownups" })}>
          Grown-ups
        </Button>
        <SpeakButton text={mission.line} />
        <Button size="lg" onClick={enterForest}>
          {mission.cta}
        </Button>
      </div>
    </div>
  );
}
