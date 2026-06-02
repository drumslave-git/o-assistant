"use client";

import { ModelStatusBar } from "@/components/ModelStatusBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <ModelStatusBar />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
