"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/fetch-json";
import { normalizeEmotion } from "@/lib/emotion";
import type { AssistantEmotion } from "@/lib/emotion-types";
import { DEFAULT_EMOTION } from "@/lib/emotion-types";
import { useChatAvatar } from "@/components/layout/ChatAvatarContext";
import { ChatMessageContent } from "./ChatMessageContent";
import { EmotionDisplay } from "./EmotionDisplay";
import {
  VoiceModeControls,
  VoiceModeToggleButton,
  type VoiceModeStatus,
} from "./VoiceModeControls";
import { speakText, stopSpeaking } from "./VoiceInput";

const VOICE_MODE_STORAGE_KEY = "o-assistant:voice-mode";

const Avatar3D = dynamic(
  () => import("./Avatar3D").then((m) => m.Avatar3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 w-28 animate-pulse rounded-2xl bg-[var(--bg-elevated)]" />
    ),
  },
);

type Message = { id: string; role: string; content: string };

type ActivityPhase =
  | "idle"
  | "queued"
  | "connecting"
  | "waiting"
  | "generating"
  | "streaming"
  | "error";

const PHASE_LABELS: Record<ActivityPhase, string> = {
  idle: "",
  queued: "Queued",
  connecting: "Connecting",
  waiting: "Waiting for model",
  generating: "Processing",
  streaming: "Streaming",
  error: "Error",
};

type ChatViewProps = {
  sessionId: string;
};

export function ChatView({ sessionId }: ChatViewProps) {
  const { setAvatarState } = useChatAvatar();
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [emotion, setEmotion] = useState<AssistantEmotion>(DEFAULT_EMOTION);
  const [activityPhase, setActivityPhase] = useState<ActivityPhase>("idle");
  const [activityDetail, setActivityDetail] = useState("");
  const [waitSeconds, setWaitSeconds] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const waitStartedRef = useRef<number | null>(null);
  const startListeningRef = useRef<(() => void) | null>(null);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const voiceModeRef = useRef(voiceMode);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    setAvatarState({
      emotion,
      speaking,
      listening,
      loading,
      activityPhase,
      activityDetail,
    });
  }, [
    emotion,
    speaking,
    listening,
    loading,
    activityPhase,
    activityDetail,
    setAvatarState,
  ]);

  const loadSession = useCallback(async (id: string) => {
    const data = await fetchJson<{
      session?: {
        title?: string | null;
        messages?: Message[];
        assistantEmotion?: unknown;
      };
    }>(`/api/sessions/${id}`);
    setMessages(data.session?.messages ?? []);
    setTitle(data.session?.title ?? null);
    setEmotion(normalizeEmotion(data.session?.assistantEmotion ?? null));
  }, []);

  useEffect(() => {
    void loadSession(sessionId);
  }, [sessionId, loadSession]);

  useEffect(() => {
    try {
      setVoiceMode(localStorage.getItem(VOICE_MODE_STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleVoiceMode() {
    setVoiceMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(VOICE_MODE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!next) {
        stopListeningRef.current?.();
        stopSpeaking();
        setSpeaking(false);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!voiceMode || loading || speaking) return;
    const timer = window.setTimeout(() => {
      if (voiceModeRef.current) startListeningRef.current?.();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [voiceMode, loading, speaking]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activityDetail]);

  useEffect(() => {
    if (!loading) {
      waitStartedRef.current = null;
      setWaitSeconds(0);
      return;
    }
    waitStartedRef.current = Date.now();
    const tick = setInterval(() => {
      if (waitStartedRef.current) {
        setWaitSeconds(Math.floor((Date.now() - waitStartedRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [loading]);

  function setActivity(phase: ActivityPhase, detail?: string) {
    setActivityPhase(phase);
    if (detail !== undefined) setActivityDetail(detail);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setActivity("queued", "Sending…");
    stopListeningRef.current?.();
    stopSpeaking();

    let assistantId: string | null = null;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text.trim(),
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Chat failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let finalMessage = "";
      let hasStreamedContent = false;
      const streamAssistantId = `tmp-a-${Date.now()}`;
      assistantId = streamAssistantId;

      setMessages((prev) => [
        ...prev,
        { id: streamAssistantId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              content?: string;
              error?: string;
              memoriesAdded?: number;
              status?: string;
              detail?: string;
              emotion?: unknown;
              message?: string;
              title?: string;
            };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.status && parsed.detail) {
              setActivity(parsed.status as ActivityPhase, parsed.detail);
            }
            if (parsed.emotion) {
              setEmotion(normalizeEmotion(parsed.emotion));
            }
            if (parsed.memoriesAdded && parsed.memoriesAdded > 0) {
              window.dispatchEvent(new Event("o-assistant:memories-updated"));
            }
            if (typeof parsed.message === "string" && parsed.message) {
              finalMessage = parsed.message;
              assistantText = parsed.message;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamAssistantId
                    ? { ...m, content: parsed.message as string }
                    : m,
                ),
              );
            }
            if (typeof parsed.title === "string" && parsed.title) {
              setTitle(parsed.title);
              window.dispatchEvent(new Event("o-assistant:sessions-updated"));
            }
            if (parsed.content) {
              if (!hasStreamedContent) {
                setActivity("streaming", "Receiving…");
                hasStreamedContent = true;
              }
              assistantText += parsed.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamAssistantId ? { ...m, content: assistantText } : m,
                ),
              );
            }
          } catch (err) {
            if (err instanceof SyntaxError) continue;
            throw err;
          }
        }
      }

      const textForVoice = finalMessage || assistantText;
      if (voiceMode && textForVoice) {
        setSpeaking(true);
        speakText(textForVoice, () => setSpeaking(false));
      }

      await loadSession(sessionId);
      window.dispatchEvent(new Event("o-assistant:sessions-updated"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      const errorText = message.startsWith("Error:") ? message : `Error: ${message}`;
      setActivity("error", message);
      setMessages((prev) => {
        if (assistantId && prev.some((m) => m.id === assistantId)) {
          return prev.map((m) =>
            m.id === assistantId ? { ...m, content: errorText } : m,
          );
        }
        return [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", content: errorText },
        ];
      });
    } finally {
      setLoading(false);
      setActivity("idle", "");
    }
  }

  const showActivity = loading && activityPhase !== "idle";
  const isEmpty = messages.length === 0 && !loading;

  const voiceModeStatus: VoiceModeStatus = speaking
    ? "speaking"
    : listening
      ? "listening"
      : loading
        ? "thinking"
        : "ready";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-medium text-[var(--text-secondary)]">
            {title ?? "New chat"}
          </h2>
          <EmotionDisplay emotion={emotion} compact />
        </div>
        {voiceMode ? (
          <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-300">
            Voice mode
          </span>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
            <div className="h-28 w-28 overflow-hidden rounded-2xl xl:hidden">
              <Avatar3D
                speaking={speaking}
                listening={listening}
                mood={emotion.mood}
                compact
              />
            </div>
            <div className="xl:hidden">
              <EmotionDisplay emotion={emotion} />
            </div>
            <p className="text-center text-2xl font-medium text-[var(--text-primary)]">
              How can I help you today?
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start gap-3"}`}
              >
                {m.role === "assistant" && (
                  <div className="mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <span className="flex h-full w-full items-center justify-center text-xs font-bold text-indigo-400">
                      O
                    </span>
                  </div>
                )}
                <div
                  className={`min-w-0 max-w-[85%] ${
                    m.role === "user"
                      ? "rounded-3xl bg-[var(--bg-elevated)] px-4 py-2.5"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {m.content ? (
                    <ChatMessageContent
                      content={m.content}
                      variant={m.role === "user" ? "user" : "assistant"}
                    />
                  ) : loading && m.role === "assistant" ? (
                    <span className="text-[15px] text-[var(--text-secondary)]">
                      {activityDetail || "…"}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {showActivity && (
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)]/50 px-4 py-2">
          <p className="mx-auto max-w-3xl text-xs text-[var(--text-secondary)]">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-indigo-400 border-t-transparent align-middle mr-2" />
            {PHASE_LABELS[activityPhase]}
            {waitSeconds > 0 && ` · ${waitSeconds}s`}
            {activityDetail && ` — ${activityDetail}`}
          </p>
        </div>
      )}

      <div className="shrink-0 border-t border-[var(--border-subtle)] p-4">
        {voiceMode ? (
          <div className="mx-auto max-w-3xl">
            <VoiceModeControls
              status={voiceModeStatus}
              statusDetail={activityDetail}
              disabled={loading && !speaking}
              onListeningChange={setListening}
              onTranscript={(text) => void sendMessage(text)}
              onInterruptSpeaking={() => {
                stopSpeaking();
                setSpeaking(false);
              }}
              startListeningRef={startListeningRef}
              stopListeningRef={stopListeningRef}
            />
            <div className="flex justify-center border-t border-[var(--border-subtle)] pt-4">
              <button
                type="button"
                onClick={toggleVoiceMode}
                className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Exit voice mode
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-2 py-2 shadow-lg"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
          >
            <VoiceModeToggleButton
              active={false}
              onClick={toggleVoiceMode}
              disabled={loading}
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder="Message O…"
              disabled={loading}
              rows={1}
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-sidebar)] transition hover:opacity-90 disabled:opacity-30"
              aria-label="Send"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 4.6a1 1 0 00-1.52 1.04l2.57 7.93H11a1 1 0 010 2H4.45l-2.57 7.93a1 1 0 001.52 1.04z" />
              </svg>
            </button>
          </form>
        )}
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-[var(--text-secondary)]">
          {voiceMode
            ? "Hands-free conversation — O listens again after each reply."
            : "O can make mistakes. Check important info."}
        </p>
      </div>
    </div>
  );
}
