"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/fetch-json";

export function ChatHome() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchJson<{ sessions?: { id: string }[] }>("/api/sessions");
        const sessions = data.sessions ?? [];
        if (sessions.length > 0) {
          router.replace(`/chat/${sessions[0].id}`);
          return;
        }
        const created = await fetchJson<{ session: { id: string } }>("/api/sessions", {
          method: "POST",
        });
        router.replace(`/chat/${created.session.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start a chat");
      }
    })();
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-sm text-[var(--text-secondary)]">
        <p>{error}</p>
        <Link href="/settings/model" className="text-indigo-400 hover:text-indigo-300">
          Settings → Model
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        Loading…
      </div>
    </div>
  );
}
