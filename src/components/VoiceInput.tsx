"use client";

import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { stripTextForTts } from "@/lib/tts-text";

type VoiceInputProps = {
  onTranscript: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  disabled?: boolean;
};

export function VoiceInput({
  onTranscript,
  onListeningChange,
  disabled,
}: VoiceInputProps) {
  const { listening, supported, toggle } = useSpeechRecognition({
    onFinalTranscript: onTranscript,
    onListeningChange,
  });

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        Voice input needs a browser with Web Speech API (Chrome/Edge).
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        listening
          ? "bg-rose-500/20 text-rose-300 ring-2 ring-rose-400/50"
          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
      } disabled:opacity-40`}
      aria-pressed={listening}
    >
      {listening ? "Listening…" : "Voice"}
    </button>
  );
}

export function speakText(text: string, onEnd?: () => void) {
  void speakTextWithTts(text, onEnd);
}

export function stopSpeaking() {
  playbackGeneration += 1;
  stopTtsPlayback();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let currentAbort: AbortController | null = null;
let playbackGeneration = 0;

function cleanupAudio() {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

function stopTtsPlayback() {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
  cleanupAudio();
}

async function speakTextWithTts(text: string, onEnd?: () => void) {
  if (typeof window === "undefined") {
    onEnd?.();
    return;
  }

  const spoken = stripTextForTts(text);
  if (!spoken) {
    onEnd?.();
    return;
  }

  const generation = ++playbackGeneration;
  stopTtsPlayback();
  const controller = new AbortController();
  currentAbort = controller;

  const finish = () => {
    if (generation !== playbackGeneration) return;
    onEnd?.();
  };

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: spoken }),
      signal: controller.signal,
    });

    if (generation !== playbackGeneration) return;

    if (!response.ok) {
      throw new Error("TTS request failed");
    }

    const audioBlob = await response.blob();
    if (generation !== playbackGeneration) return;
    if (!audioBlob.size) {
      throw new Error("Empty TTS response");
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudioUrl = audioUrl;

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      cleanupAudio();
      finish();
    };
    audio.onerror = () => {
      cleanupAudio();
      finish();
    };

    await audio.play();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      finish();
      return;
    }
    if (generation !== playbackGeneration) return;
    cleanupAudio();
    fallbackSpeak(spoken, finish);
  } finally {
    if (currentAbort === controller) {
      currentAbort = null;
    }
  }
}

function fallbackSpeak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}
