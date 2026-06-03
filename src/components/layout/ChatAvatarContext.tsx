"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AssistantEmotion } from "@/lib/emotion-types";
import { DEFAULT_EMOTION } from "@/lib/emotion-types";

export type ChatActivityPhase =
  | "idle"
  | "queued"
  | "connecting"
  | "waiting"
  | "generating"
  | "streaming"
  | "error";

type ChatAvatarState = {
  emotion: AssistantEmotion;
  speaking: boolean;
  listening: boolean;
  loading: boolean;
  activityPhase: ChatActivityPhase;
  activityDetail: string;
};

type ChatAvatarContextValue = ChatAvatarState & {
  setAvatarState: (partial: Partial<ChatAvatarState>) => void;
};

const ChatAvatarContext = createContext<ChatAvatarContextValue | null>(null);

export function ChatAvatarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatAvatarState>({
    emotion: DEFAULT_EMOTION,
    speaking: false,
    listening: false,
    loading: false,
    activityPhase: "idle",
    activityDetail: "",
  });

  const setAvatarState = useCallback((partial: Partial<ChatAvatarState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo(
    () => ({ ...state, setAvatarState }),
    [state, setAvatarState],
  );

  return (
    <ChatAvatarContext.Provider value={value}>{children}</ChatAvatarContext.Provider>
  );
}

export function useChatAvatar() {
  const ctx = useContext(ChatAvatarContext);
  if (!ctx) {
    throw new Error("useChatAvatar must be used within ChatAvatarProvider");
  }
  return ctx;
}
