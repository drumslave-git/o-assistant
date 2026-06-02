"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/settings/instructions", label: "Instructions", description: "Custom system prompt" },
  { href: "/settings/memory", label: "Memory", description: "Facts about you" },
  { href: "/settings/voice", label: "Voice", description: "TTS API & voice" },
  { href: "/settings/model", label: "Model", description: "Chat API URL, key, model" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
      <div className="p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <span aria-hidden>←</span>
          Back to chat
        </Link>
      </div>

      <div className="px-4 pb-4">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Configure your assistant
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg px-3 py-2.5 transition ${
                active
                  ? "bg-[var(--bg-elevated)]"
                  : "hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <span
                className={`block text-sm font-medium ${
                  active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                }`}
              >
                {link.label}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                {link.description}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
