// Tiny chimes synthesized with Web Audio, so there are no audio files to license.
// Mistakes get a soft, gentle cue, never a buzzer.

export type Cue = "tap" | "correct" | "almost" | "plank" | "celebrate";

/** [frequency Hz, start s, duration s] */
const CUES: Readonly<Record<Cue, readonly (readonly [number, number, number])[]>> = {
  tap: [[660, 0, 0.05]],
  correct: [
    [660, 0, 0.12],
    [880, 0.1, 0.2],
  ],
  almost: [
    [494, 0, 0.14],
    [440, 0.12, 0.2],
  ],
  plank: [
    [523, 0, 0.1],
    [659, 0.08, 0.1],
    [784, 0.16, 0.18],
  ],
  celebrate: [
    [523, 0, 0.12],
    [659, 0.1, 0.12],
    [784, 0.2, 0.12],
    [1047, 0.3, 0.32],
  ],
};

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

export function playCue(cue: Cue): void {
  const ac = audioContext();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const now = ac.currentTime;
  for (const [frequency, start, duration] of CUES[cue]) {
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.16, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    oscillator.connect(gain).connect(ac.destination);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + 0.02);
  }
}
