"use client";

import { useEffect, useMemo, useState } from "react";
import { askAi } from "@/ai/client";
import { acceptStory } from "@/ai/guards";
import { evaluateAnswer } from "@/engine/evaluate";
import { MAX_HINT_LEVEL } from "@/engine/hints";
import { SKILLS } from "@/engine/skills";
import type { HintLevel } from "@/engine/types";
import { deriveWorld } from "@/engine/world";
import { playCue } from "../audio/sound";
import { BuildBlocks } from "../challenge/BuildBlocks";
import { ChallengeCard } from "../challenge/ChallengeCard";
import { HootHint } from "../challenge/HootHint";
import { PipPuzzleCard } from "../challenge/PipPuzzleCard";
import { useGame } from "../GameProvider";
import { ForestScene } from "../scene/ForestScene";
import { HEROES, type Celebration, type ForestTurn } from "../state/types";
import { Button } from "../ui/Button";
import { Hud, LeafIcon } from "../ui/Hud";
import { NumberPad } from "../ui/NumberPad";
import { SpeakButton } from "../ui/SpeakButton";
import { Toast } from "../ui/Toast";
import styles from "./Forest.module.css";

function celebrationText(celebration: Celebration): string {
  switch (celebration.kind) {
    case "plank":
      return "A new plank is in place!";
    case "mastered":
      return `You mastered ${SKILLS[celebration.skill].kidName}!`;
    case "pip":
      return "Pip says thank you!";
    case "boss":
      return "The Guardian is proud of you!";
  }
}

interface ChallengeTurnProps {
  turn: ForestTurn;
  value: string;
  setValue: (value: string) => void;
  onNext: () => void;
}

function ChallengeTurn({ turn, value, setValue, onNext }: ChallengeTurnProps) {
  const { state, dispatch } = useGame();
  const theme = state.profile?.interest ?? "forest";
  const { challenge, status, lastEvaluation, hintLevel, attempt } = turn;
  const answering = status === "answering";
  const missed = answering && lastEvaluation !== null && !lastEvaluation.correct;

  // Hoot writes a fresh story for story problems. If AI is off, slow or its story fails the
  // checks, the built-in story shows instead.
  const [story, setStory] = useState<{ pending: boolean; text: string | null }>(() => ({
    pending: challenge.story?.source === "template",
    text: null,
  }));
  useEffect(() => {
    const template = challenge.story;
    if (!template || template.source !== "template") return;
    let cancelled = false;
    void askAi({ task: "story", a: challenge.a, b: challenge.b, kind: template.kind, theme }, 2500).then((text) => {
      if (cancelled) return;
      setStory({ pending: false, text: text && acceptStory(text, challenge.a, challenge.b, template.kind) ? text : null });
    });
    return () => {
      cancelled = true;
    };
  }, [challenge.a, challenge.b, challenge.story, theme]);

  const submit = (input: string) => {
    if (!answering || input === "") return;
    const result = evaluateAnswer(challenge, input);
    if (result.value === null) return;
    playCue(result.correct ? "correct" : "almost");
    dispatch({ type: "submitAnswer", value: input, at: Date.now() });
    if (!result.correct) setValue("");
  };

  const independent = attempt === 1 && hintLevel === 0;

  return (
    <div className={styles.play}>
      <div className={styles.left}>
        <ChallengeCard
          challenge={challenge}
          value={answering ? value : String(challenge.answer)}
          tone={status === "solved" ? "good" : "neutral"}
          onChoose={challenge.choices ? (choice) => submit(String(choice)) : undefined}
          disabled={!answering}
          compact={hintLevel > 0}
          storyText={story.text ?? undefined}
          storyPending={story.pending}
        />

        {status === "solved" ? (
          <p className={styles.feedback} data-tone="good" role="status">
            <span aria-hidden="true">✅</span> Nice thinking!
            <span className={styles.reward}>
              <LeafIcon size={18} /> +{independent ? 10 : 5}
            </span>
          </p>
        ) : missed ? (
          <p className={styles.feedback} data-tone="almost" role="status">
            <span aria-hidden="true">🤔</span> Almost! {lastEvaluation?.value} isn&apos;t it yet. Try one more time.
          </p>
        ) : null}

        {hintLevel > 0 ? (
          <HootHint
            challenge={challenge}
            level={hintLevel as Exclude<HintLevel, 0>}
            misconception={lastEvaluation?.misconception ?? null}
            wrongAnswer={turn.firstWrong}
          />
        ) : null}
      </div>

      <div className={styles.right}>
        {answering && !challenge.choices ? (
          challenge.format === "visual" && challenge.unknown === "total" ? (
            // Remount after each try so the mat starts empty again.
            <BuildBlocks key={`${challenge.id}-${attempt}`} onChange={setValue} onSubmit={() => submit(value)} />
          ) : (
            <NumberPad value={value} onChange={setValue} onSubmit={() => submit(value)} />
          )
        ) : null}
        <div className={styles.actions}>
          {answering ? (
            <Button variant="secondary" onClick={() => dispatch({ type: "showHint", at: Date.now() })}>
              <span aria-hidden="true">🦉</span>
              {hintLevel === 0 ? "Ask Hoot" : hintLevel === MAX_HINT_LEVEL - 1 ? "Show me how" : "Another hint"}
            </Button>
          ) : (
            <Button size="lg" onClick={onNext}>
              {status === "solved" ? "Next" : "Try a new one"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function GateReady({ onEnter }: { onEnter: () => void }) {
  const line = "The Guardian gate is open! Show the Forest Guardian everything you've learned.";
  return (
    <div className={styles.gate}>
      <div className={styles.gateLine}>
        <span className={styles.gateIcon} aria-hidden="true">
          🌳
        </span>
        <p>{line}</p>
        <SpeakButton text={line} />
      </div>
      <Button size="lg" onClick={onEnter}>
        Face the Forest Guardian
      </Button>
    </div>
  );
}

export function Forest() {
  const { state, dispatch } = useGame();
  const [value, setValue] = useState("");
  const { model, profile, turn, bossPassed, xp, celebration } = state;
  const world = useMemo(() => (model ? deriveWorld(model, bossPassed) : null), [model, bossPassed]);

  useEffect(() => {
    if (!celebration) return;
    playCue(celebration.kind === "plank" ? "plank" : "celebrate");
    const timer = window.setTimeout(() => dispatch({ type: "dismissCelebration" }), 2600);
    return () => window.clearTimeout(timer);
  }, [celebration, dispatch]);

  if (!model || !profile || !world) return null;

  const heroEmoji = HEROES.find((h) => h.id === profile.hero)?.emoji ?? "🧙";
  const next = () => {
    setValue("");
    dispatch({ type: "nextTurn", at: Date.now() });
  };

  return (
    <div className={styles.forest}>
      <div className={styles.sceneBand}>
        <ForestScene world={world} hero={heroEmoji} className={styles.scene} />
        <Hud
          title="Addition Forest"
          xp={xp}
          heroEmoji={heroEmoji}
          heroName={profile.name}
          onMap={() => dispatch({ type: "goTo", screen: "map" })}
        />
      </div>

      <section className={styles.deck} aria-label="Challenge">
        {turn?.kind === "challenge" ? (
          <ChallengeTurn key={turn.challenge.id} turn={turn} value={value} setValue={setValue} onNext={next} />
        ) : turn?.kind === "pip" ? (
          <PipPuzzleCard
            key={turn.puzzle.id}
            turn={turn}
            onTap={(part) => dispatch({ type: "pipTap", part, at: Date.now() })}
            onPick={(choice) => dispatch({ type: "pipPick", value: choice, at: Date.now() })}
            onNext={next}
          />
        ) : world.gateOpen ? (
          <GateReady onEnter={() => dispatch({ type: "enterBoss", at: Date.now() })} />
        ) : (
          <div className={styles.gate}>
            <Button size="lg" onClick={() => dispatch({ type: "enterForest", at: Date.now() })}>
              Keep going
            </Button>
          </div>
        )}
      </section>

      {celebration ? <Toast>{celebrationText(celebration)}</Toast> : null}
    </div>
  );
}
