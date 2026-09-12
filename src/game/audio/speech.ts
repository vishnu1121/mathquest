// Read-aloud with the browser's built-in voice. Speech output only: no microphone, nothing recorded.
import type { Challenge } from "@/engine/types";

const EMOJI = /\p{Extended_Pictographic}|️|‍/gu;

/** Makes on-screen math sound natural: "28 + ? = 45" becomes "28 plus what number equals 45". */
export function toSpeech(text: string): string {
  return text
    .replace(EMOJI, "")
    .replace(/(^|\s)\?(?=\s|$)/g, "$1what number")
    .replace(/\s*\+\s*/g, " plus ")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/\s+/g, " ")
    .trim();
}

export function challengeSpeech(challenge: Challenge): string {
  if (challenge.story) return challenge.story.text;
  if (challenge.unknown === "addend") return `${challenge.a} plus what number equals ${challenge.total}?`;
  return `What is ${challenge.a} plus ${challenge.b}?`;
}

export const canSpeak = (): boolean => typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(toSpeech(text));
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  const voices = synth.getVoices();
  const voice = voices.find((v) => v.lang === "en-US" && v.localService) ?? voices.find((v) => v.lang.startsWith("en"));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
