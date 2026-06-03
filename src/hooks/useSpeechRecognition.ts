"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseSpeechRecognitionOptions = {
  onFinalTranscript: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  lang?: string;
};

export function useSpeechRecognition({
  onFinalTranscript,
  onListeningChange,
  lang = "en-US",
}: UseSpeechRecognitionOptions) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  const onListeningRef = useRef(onListeningChange);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
    onListeningRef.current = onListeningChange;
  });

  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    if (!SR) {
      setSupported(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        if (text) onFinalRef.current(text);
      }
    };

    recognition.onend = () => {
      setListening(false);
      onListeningRef.current?.(false);
    };

    recognition.onerror = () => {
      setListening(false);
      onListeningRef.current?.(false);
    };

    recognitionRef.current = recognition;
  }, [lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return false;
    try {
      setListening(true);
      onListeningRef.current?.(true);
      recognitionRef.current.start();
      return true;
    } catch {
      setListening(false);
      onListeningRef.current?.(false);
      return false;
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
    onListeningRef.current?.(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    start();
  }, [listening, start, stop]);

  return { listening, supported, start, stop, toggle };
}
