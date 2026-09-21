"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Text-to-speech using the browser's own voices, so the assistant can answer
 * out loud with no key and no audio leaving the device.
 *
 * Every major browser ships `speechSynthesis`, but the voice list loads
 * asynchronously and the API has a few well-known quirks, handled below.
 */
export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voice = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setSupported(true);

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Prefer a local voice in the page's language: local voices don't need
      // a network round trip, so playback starts immediately.
      const language = navigator.language || "en-US";
      const base = language.split("-")[0];

      voice.current =
        voices.find((v) => v.lang === language && v.localService) ??
        voices.find((v) => v.lang.startsWith(base) && v.localService) ??
        voices.find((v) => v.lang.startsWith(base)) ??
        voices[0];
    };

    pickVoice();
    // The list is usually empty on first call and arrives via this event.
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
      window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  /** Speaks `text`, resolving once playback finishes (or fails). */
  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }

        // Anything still queued would otherwise play first.
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (voice.current) utterance.voice = voice.current;
        utterance.rate = 1.02;
        utterance.pitch = 1;

        let settled = false;
        let watchdog: ReturnType<typeof setInterval> | undefined;
        let cap: ReturnType<typeof setTimeout> | undefined;

        const finish = () => {
          if (settled) return;
          settled = true;
          if (watchdog) clearInterval(watchdog);
          if (cap) clearTimeout(cap);
          setSpeaking(false);
          resolve();
        };

        utterance.onend = finish;
        // Treat an error as "done" — the caller must not hang waiting on it.
        utterance.onerror = finish;

        setSpeaking(true);
        window.speechSynthesis.speak(utterance);

        // `onend` is not dependable: it never fires with no audio output
        // device, and Chrome has long-standing bugs where it is dropped on
        // longer utterances. A caller awaiting this promise — the voice call
        // loop — would wedge with the microphone closed, so fall back to
        // observing the queue, and to a hard ceiling sized from the text.
        watchdog = setInterval(() => {
          if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            finish();
          }
        }, 250);

        // Roughly 2.5 words a second, doubled for headroom, floor of 5s.
        const words = utterance.text.trim().split(/\s+/).length;
        cap = setTimeout(finish, Math.min(60_000, Math.max(5_000, (words / 2.5) * 2000)));
      }),
    []
  );

  return { supported, speaking, speak, cancel };
}
