"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";

type SessionSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
};

function formatSessionTitle(s: SessionSummary) {
  if (s.title?.trim()) return s.title;
  return "New chat";
}

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

type ChatSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function ChatSidebar({ className = "", onNavigate }: ChatSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      const data = await fetchJson<{ sessions?: SessionSummary[] }>("/api/sessions");
      setSessions(data.sessions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    const onUpdate = () => void loadSessions();
    window.addEventListener("o-assistant:sessions-updated", onUpdate);
    return () => window.removeEventListener("o-assistant:sessions-updated", onUpdate);
  }, [loadSessions]);

  async function newChat() {
    const data = await fetchJson<{ session: { id: string } }>("/api/sessions", {
      method: "POST",
    });
    window.dispatchEvent(new Event("o-assistant:sessions-updated"));
    router.push(`/chat/${data.session.id}`);
    onNavigate?.();
  }

  async function deleteSession(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    const remaining = sessions.filter((s) => s.id !== id);
    window.dispatchEvent(new Event("o-assistant:sessions-updated"));
    if (pathname === `/chat/${id}`) {
      if (remaining.length > 0) {
        router.push(`/chat/${remaining[0].id}`);
      } else {
        await newChat();
      }
    }
  }

  const activeId = pathname.startsWith("/chat/")
    ? pathname.replace("/chat/", "")
    : null;

  return (
    <aside
      className={`flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] ${className}`}
    >
      <div className="flex items-center gap-2 p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-elevated)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold">
            O
          </span>
          <span className="truncate text-sm font-semibold">Assistant</span>
        </Link>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => void newChat()}
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 text-sm text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
        >
          <span className="text-lg leading-none">+</span>
          New chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {loading && (
          <p className="px-3 py-2 text-xs text-[var(--text-secondary)]">Loading chats…</p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="px-3 py-2 text-xs text-[var(--text-secondary)]">No chats yet</p>
        )}
        <ul className="space-y-0.5">
          {sessions.map((s) => {
            const active = activeId === s.id;
            return (
              <li key={s.id} className="group">
                <div
                  className={`flex items-center rounded-lg ${
                    active
                      ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Link
                    href={`/chat/${s.id}`}
                    onClick={onNavigate}
                    className="min-w-0 flex-1 truncate px-3 py-2 text-sm"
                  >
                    {formatSessionTitle(s)}
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => void deleteSession(e, s.id)}
                    className="mr-2 shrink-0 rounded p-0.5 text-xs opacity-0 transition hover:bg-black/30 group-hover:opacity-100"
                    aria-label="Delete chat"
                  >
                    ×
                  </button>
                </div>
                <span className="block px-3 pb-1 text-[10px] text-[var(--text-secondary)] opacity-0 transition group-hover:opacity-100">
                  {formatRelativeTime(s.updatedAt)}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--border-subtle)] p-2">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
            pathname.startsWith("/settings")
              ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          }`}
        >
          <SettingsIcon />
          Settings
        </Link>
      </div>
    </aside>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
