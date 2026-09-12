"use client";

import { useEffect, useMemo, useState } from "react";
import { askAi } from "@/ai/client";
import { acceptTutorNote } from "@/ai/guards";
import { focusSkill } from "@/engine/adaptive";
import { starsFor, type SkillState } from "@/engine/learnerModel";
import { MISCONCEPTIONS } from "@/engine/misconceptions";
import { SKILL_ORDER, SKILLS } from "@/engine/skills";
import { buildTutorFacts, templateNote } from "@/engine/tutorNote";
import { useGame } from "../GameProvider";
import type { LogEntry } from "../state/types";
import { Button } from "../ui/Button";
import { Stars } from "../ui/Stars";
import styles from "./GrownUps.module.css";

/** A simple grown-up gate: multiplication is beyond what the forest's players are learning. */
const GATE = { question: "What is 7 × 8?", answer: 56, choices: [54, 56, 64] } as const;

const KIND_LABELS: Readonly<Record<LogEntry["kind"], string>> = {
  practice: "Practice",
  stepUp: "Moved up a level",
  stepDown: "Made it easier",
  probe: "Checked again",
  scaffold: "Switched to blocks",
  return: "Back to the original",
  pipPuzzle: "Pip's Puzzle",
  review: "Review",
  boss: "Guardian",
  warmup: "Warm-up",
};

const OUTCOME_LABELS = { solved: "Solved alone", helped: "Solved with help", missed: "Not yet" } as const;
const GRADE_NAMES = ["kindergarten", "grade 1", "grade 2", "grade 3", "grade 4", "grade 5"] as const;

function skillStatus(state: SkillState): { label: string; tone: "good" | "sun" | "sky" | "plain" } {
  if (state.mastered) return { label: "Mastered", tone: "good" };
  if (state.mastery >= 0.5) return { label: "Growing", tone: "sun" };
  if (state.evidence > 0 || state.mastery > 0) return { label: "Just started", tone: "sky" };
  return { label: "Not started", tone: "plain" };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function clock(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function ParentGate({ onUnlock, onBack }: { onUnlock: () => void; onBack: () => void }) {
  const [wrong, setWrong] = useState(false);
  return (
    <div className={styles.gate}>
      <section className={styles.gateCard} aria-labelledby="gate-title">
        <h1 id="gate-title" className={styles.gateTitle}>
          Grown-ups only
        </h1>
        <p className={styles.gateText}>To open the learning report, answer this: {GATE.question}</p>
        <div className={styles.gateChoices}>
          {GATE.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={styles.gateChoice}
              onClick={() => (choice === GATE.answer ? onUnlock() : setWrong(true))}
            >
              {choice}
            </button>
          ))}
        </div>
        <p className={styles.gateHint} role="status">
          {wrong ? "That's not it. Please ask a grown-up." : ""}
        </p>
        <Button variant="quiet" onClick={onBack}>
          Back to the game
        </Button>
      </section>
    </div>
  );
}

export function GrownUps() {
  const { state, dispatch } = useGame();
  const [unlocked, setUnlocked] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [confirmReset, setConfirmReset] = useState(false);
  const { model, profile, log, session } = state;

  const facts = useMemo(
    () => (model && profile ? buildTutorFacts(model, log, profile.name, focusSkill(model, session.focus)) : null),
    [model, profile, log, session.focus],
  );

  // Claude may reword the note; it is shown only if every number in it comes from the facts.
  const [aiNote, setAiNote] = useState<string | null>(null);
  useEffect(() => {
    if (!unlocked || !facts) return;
    let cancelled = false;
    void askAi({ task: "tutorNote", facts, template: templateNote(facts) }, 8000).then((text) => {
      if (!cancelled && text && acceptTutorNote(text, facts)) setAiNote(text);
    });
    return () => {
      cancelled = true;
    };
  }, [unlocked, facts]);

  const back = () => dispatch({ type: "goTo", screen: "map" });
  if (!model || !profile || !facts) return null;
  if (!unlocked) return <ParentGate onUnlock={() => setUnlocked(true)} onBack={back} />;

  const note = aiNote ?? templateNote(facts);
  const firstAt = log[0]?.at ?? 0;
  const recent = log.slice(-12).reverse();

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(note);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  const startOver = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
    dispatch({ type: "reset", seed });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{profile.name}&apos;s learning</h1>
          <p className={styles.subtitle}>Addition Forest, {GRADE_NAMES[profile.grade]}</p>
        </div>
        <Button variant="secondary" onClick={back}>
          Back to the game
        </Button>
      </header>

      <div className={styles.columns}>
        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby="skills-title">
            <h2 id="skills-title" className={styles.panelTitle}>
              Skills
            </h2>
            <ul className={styles.skills}>
              {SKILL_ORDER.map((id) => {
                const skill = model.skills[id];
                const status = skillStatus(skill);
                return (
                  <li key={id} className={styles.skill}>
                    <div>
                      <p className={styles.skillName}>{SKILLS[id].name}</p>
                      <p className={styles.skillMeta}>
                        {plural(skill.evidence, "answer")}, {plural(skill.independentFormats.length, "kind")} of problem
                        solved alone
                      </p>
                    </div>
                    <Stars count={starsFor(skill)} />
                    <span className={styles.pill} data-tone={status.tone}>
                      {status.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.panel} aria-labelledby="noticed-title">
            <h2 id="noticed-title" className={styles.panelTitle}>
              What the game noticed
            </h2>
            <dl className={styles.facts}>
              <dt>Pattern seen</dt>
              <dd>
                {facts.pattern ? (
                  <>
                    {MISCONCEPTIONS[facts.pattern.misconception].grownUp}.
                    {facts.pattern.examples.length > 0 ? (
                      <span className={styles.examples}>
                        {facts.pattern.examples.map((example) => (
                          <span key={example} className={styles.example}>
                            {example}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "No repeated mistakes so far."
                )}
              </dd>
              <dt>What helped</dt>
              <dd>
                {facts.helped ? `${facts.helped}.` : "No extra help needed yet."}
                {facts.caughtInPuzzle ? " Later caught the same kind of mistake in Pip's Puzzle." : ""}
              </dd>
              <dt>Next focus</dt>
              <dd>{facts.nextFocus ? SKILLS[facts.nextFocus].name : "Subtraction with regrouping, in the next region"}</dd>
            </dl>
          </section>
        </div>

        <div className={styles.column}>
          <section className={`${styles.panel} ${styles.notePanel}`} aria-labelledby="note-title">
            <h2 id="note-title" className={styles.panelTitle}>
              Note for a tutor
            </h2>
            <blockquote className={styles.note}>{note}</blockquote>
            <div className={styles.noteActions}>
              <Button onClick={copyNote}>{copyStatus === "copied" ? "Copied" : "Copy note"}</Button>
              <p className={styles.caption} role="status">
                {copyStatus === "failed"
                  ? "Copying isn't allowed here. Select the note to copy it."
                  : aiNote
                    ? "Worded by Claude from the facts on this page. Numbers checked by code."
                    : "Written only from the facts on this page."}
              </p>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="timeline-title">
            <h2 id="timeline-title" className={styles.panelTitle}>
              Why the game chose each question
            </h2>
            {recent.length === 0 ? (
              <p className={styles.empty}>Decisions show up here once {profile.name} starts playing.</p>
            ) : (
              <ol className={styles.timeline}>
                {recent.map((entry, i) => (
                  <li key={`${entry.at}-${i}`} className={styles.event}>
                    <time className={styles.time}>{clock(entry.at - firstAt)}</time>
                    <div>
                      <p className={styles.eventTitle}>
                        {KIND_LABELS[entry.kind]}: {entry.problem}
                        {entry.wrongAnswer !== null ? <span className={styles.wrong}> (first answer {entry.wrongAnswer})</span> : null}
                      </p>
                      <p className={styles.reason}>{entry.reason}</p>
                    </div>
                    {entry.outcome ? (
                      <span
                        className={styles.pill}
                        data-tone={entry.outcome === "solved" ? "good" : entry.outcome === "helped" ? "sun" : "plain"}
                      >
                        {OUTCOME_LABELS[entry.outcome]}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>Progress is saved only on this device. MathQuest has no accounts and never asks for a child&apos;s name.</p>
        <Button variant="quiet" onClick={startOver}>
          {confirmReset ? "Tap again to erase all progress" : "Start over"}
        </Button>
      </footer>
    </div>
  );
}
