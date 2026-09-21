"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal typings for the Web Speech API, which TypeScript's DOM lib still
 * doesn't ship. Only the members these hooks touch are declared.
 */
type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

type Options = {
  /** The best-so-far transcript, fired repeatedly while someone speaks. */
  onInterim?: (transcript: string) => void;
  /** A completed utterance — the point at which it's worth acting on. */
  onFinal?: (transcript: string) => void;
  /**
   * Keep the microphone open across pauses. Used by the hands-free voice
   * call; dictation leaves it off so the mic closes when the speaker stops.
   */
  continuous?: boolean;
};

/**
 * Speech-to-text using the browser's own recognition engine — no keys, no
 * vendor, no audio leaving the device. Support varies (Chrome and Safari yes,
 * Firefox no), so `supported` gates the UI rather than the button failing.
 */
export function useSpeechRecognition({
  onInterim,
  onFinal,
  continuous = false,
}: Options) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognition = useRef<SpeechRecognitionLike | null>(null);

  // Callbacks live in refs so changing them never tears down the recogniser
  // mid-utterance.
  const interimRef = useRef(onInterim);
  const finalRef = useRef(onFinal);
  interimRef.current = onInterim;
  finalRef.current = onFinal;

  /** Whether the caller wants the mic open, as opposed to the engine's view. */
  const wantsToListen = useRef(false);

  useEffect(() => {
    const Constructor = getConstructor();
    if (!Constructor) return;

    setSupported(true);

    const instance = new Constructor();
    instance.continuous = continuous;
    instance.interimResults = true;
    instance.lang =
      typeof navigator !== "undefined" ? navigator.language : "en-US";

    instance.onresult = (event) => {
      let settled = "";
      let pending = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) settled += result[0].transcript;
        else pending += result[0].transcript;
      }

      if (pending.trim()) interimRef.current?.(`${settled}${pending}`.trim());
      if (settled.trim()) finalRef.current?.(settled.trim());
    };

    instance.onerror = (event) => {
      // "no-speech" and "aborted" are routine in a long call; only surface
      // things the visitor can act on.
      if (event.error === "no-speech" || event.error === "aborted") return;

      setError(
        event.error === "not-allowed"
          ? "Microphone access was blocked — allow it in your browser settings"
          : "Couldn't hear that — try again"
      );
      wantsToListen.current = false;
      setListening(false);
    };

    instance.onend = () => {
      // Chrome ends the session after a pause even with continuous set, so
      // restart while the caller still wants the mic open.
      if (wantsToListen.current) {
        try {
          instance.start();
          return;
        } catch {
          // Falls through to reporting the mic as closed.
        }
      }
      setListening(false);
    };

    recognition.current = instance;

    return () => {
      wantsToListen.current = false;
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
      try {
        // abort() rather than stop() so teardown emits no final result.
        instance.abort();
      } catch {
        // Already stopped.
      }
    };
  }, [continuous]);

  const start = useCallback(() => {
    if (!recognition.current || wantsToListen.current) return;

    setError(null);
    wantsToListen.current = true;
    try {
      recognition.current.start();
      setListening(true);
    } catch {
      // start() throws if the engine is already running; treat as a no-op.
    }
  }, []);

  const stop = useCallback(() => {
    wantsToListen.current = false;
    if (!recognition.current) return;
    try {
      recognition.current.stop();
    } catch {
      // Already stopped.
    }
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop };
}
