"use client";

import { useState } from "react";
import { scoreBossRound, type BossOutcome } from "@/engine/boss";
import { evaluateAnswer } from "@/engine/evaluate";
import { SKILLS } from "@/engine/skills";
import type { HintLevel } from "@/engine/types";
import { playCue } from "../audio/sound";
import { BuildBlocks } from "../challenge/BuildBlocks";
import { ChallengeCard } from "../challenge/ChallengeCard";
import { HootHint } from "../challenge/HootHint";
import { useGame } from "../GameProvider";
import { GuardianScene, type GuardianMood } from "../scene/GuardianScene";
import { HEROES, type BossRun } from "../state/types";
import { Button } from "../ui/Button";
import { Hud, LeafIcon } from "../ui/Hud";
import { NumberPad } from "../ui/NumberPad";
import { SpeakButton } from "../ui/SpeakButton";
import styles from "./Boss.module.css";

const MAX_BOSS_HINT = 4;

function guardianLine(boss: BossRun, name: string): string {
  if (boss.outcome) return boss.outcome.passed ? `You did it, ${name}!` : "Yawn... I'm still sleepy. Train a little and come back!";
  if (boss.turn.status === "solved") return "Oof! A leaf shield fell. Nice math!";
  if (boss.turn.status === "shown") return "That one was tricky. Keep going!";
  if (boss.turn.attempt > 1) return "Almost! Try once more.";
  return boss.index === 0 ? `Show me what you've learned, ${name}!` : "Here comes the next one!";
}

function moodFor(boss: BossRun): GuardianMood {
  if (boss.outcome) return boss.outcome.passed ? "proud" : "sleepy";
  return boss.turn.status === "solved" ? "hit" : "ready";
}

function TrainPlan({ outcome, onTrain }: { outcome: BossOutcome; onTrain: () => void }) {
  const line = "The Guardian is still sleepy. Let's train and come back stronger!";
  return (
    <div className={styles.train}>
      <div className={styles.trainHeader}>
        <h2 className={styles.trainTitle}>{line}</h2>
        <SpeakButton text={line} />
      </div>
      <div className={styles.lists}>
        {outcome.strengths.length > 0 ? (
          <div className={styles.list}>
            <p className={styles.listTitle}>You were strong at</p>
            <ul>
              {outcome.strengths.map((skill) => (
                <li key={skill}>
                  <span className={styles.check} aria-hidden="true">
                    ✓
                  </span>
                  {SKILLS[skill].kidName}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className={styles.list}>
          <p className={styles.listTitle}>Let&apos;s train</p>
          <ul>
            {outcome.trainOn.map((skill) => (
              <li key={skill}>
                <LeafIcon size={20} />
                {SKILLS[skill].kidName}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Button size="lg" onClick={onTrain}>
        Train and come back
      </Button>
    </div>
  );
}

export function Boss() {
  const { state, dispatch } = useGame();
  const [value, setValue] = useState("");
  const { boss, profile, xp } = state;
  if (!boss || !profile) return null;

  const heroEmoji = HEROES.find((h) => h.id === profile.hero)?.emoji ?? "🧙";
  const { turn } = boss;
  const answering = turn.status === "answering" && !boss.outcome;
  const shieldsLeft = boss.items.length - boss.results.filter((r) => r.correct).length;
  const line = guardianLine(boss, profile.name);
  const lastItem = boss.index === boss.items.length - 1;

  const submit = (input: string) => {
    if (!answering || input === "") return;
    const result = evaluateAnswer(turn.challenge, input);
    if (result.value === null) return;
    playCue(result.correct ? "plank" : "almost");
    dispatch({ type: "submitBossAnswer", value: input, at: Date.now() });
    setValue("");
  };

  const next = () => {
    setValue("");
    if (lastItem && scoreBossRound(boss.results).passed) playCue("celebrate");
    dispatch({ type: "nextBossItem", at: Date.now() });
  };

  return (
    <div className={styles.boss}>
      <div className={styles.sceneBand}>
        <GuardianScene
          shieldsLeft={shieldsLeft}
          total={boss.items.length}
          mood={moodFor(boss)}
          hero={heroEmoji}
          className={styles.scene}
          speech={
            <div className={styles.bubble}>
              <p>{line}</p>
              <SpeakButton text={line} label="Read the Guardian's words aloud" />
            </div>
          }
        />
        <Hud title="The Forest Guardian" xp={xp} heroEmoji={heroEmoji} heroName={profile.name} />
      </div>

      <section className={styles.deck} aria-label="Guardian challenge">
        {boss.outcome && !boss.outcome.passed ? (
          <TrainPlan outcome={boss.outcome} onTrain={() => dispatch({ type: "enterForest", at: Date.now() })} />
        ) : (
          <div className={styles.play}>
            <div className={styles.left}>
              <ol className={styles.progress} aria-label={`Challenge ${boss.index + 1} of ${boss.items.length}`}>
                {boss.items.map((item, i) => {
                  const result = boss.results[i];
                  const status = result ? (result.correct ? "won" : "missed") : i === boss.index ? "now" : "todo";
                  return (
                    <li key={item.challenge.id} className={styles.step} data-state={status}>
                      {status === "won" ? <span aria-hidden="true">✓</span> : null}
                      {item.label}
                    </li>
                  );
                })}
              </ol>

              <ChallengeCard
                challenge={turn.challenge}
                value={turn.status === "answering" ? value : String(turn.challenge.answer)}
                tone={turn.status === "solved" ? "good" : "neutral"}
                onChoose={turn.challenge.choices ? (choice) => submit(String(choice)) : undefined}
                disabled={!answering}
                compact={turn.hintLevel > 0}
              />

              {turn.status === "solved" ? (
                <p className={styles.feedback} data-tone="good" role="status">
                  <span aria-hidden="true">✅</span> A leaf shield fell!
                </p>
              ) : turn.status === "shown" ? (
                <p className={styles.feedback} data-tone="almost" role="status">
                  The answer is {turn.challenge.answer}. You&apos;ll get the next one!
                </p>
              ) : turn.attempt > 1 ? (
                <p className={styles.feedback} data-tone="almost" role="status">
                  <span aria-hidden="true">🤔</span> Almost! {turn.lastEvaluation?.value} isn&apos;t it. One more try.
                </p>
              ) : null}

              {answering && turn.hintLevel > 0 ? (
                <HootHint
                  challenge={turn.challenge}
                  level={turn.hintLevel as Exclude<HintLevel, 0>}
                  misconception={turn.lastEvaluation?.misconception ?? null}
                  wrongAnswer={turn.firstWrong}
                />
              ) : null}
            </div>

            <div className={styles.right}>
              {answering && !turn.challenge.choices ? (
                turn.challenge.format === "visual" && turn.challenge.unknown === "total" ? (
                  <BuildBlocks
                    key={`${turn.challenge.id}-${turn.attempt}`}
                    onChange={setValue}
                    onSubmit={() => submit(value)}
                  />
                ) : (
                  <NumberPad value={value} onChange={setValue} onSubmit={() => submit(value)} />
                )
              ) : null}
              <div className={styles.actions}>
                {answering ? (
                  <Button
                    variant="secondary"
                    onClick={() => dispatch({ type: "showBossHint" })}
                    disabled={turn.hintLevel >= MAX_BOSS_HINT}
                  >
                    <span aria-hidden="true">🦉</span>
                    {turn.hintLevel === 0 ? "Ask Hoot" : "Another hint"}
                  </Button>
                ) : (
                  <Button size="lg" onClick={next}>
                    {lastItem ? "See how I did" : "Next challenge"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
