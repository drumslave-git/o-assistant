import { SettingsNav } from "@/components/layout/SettingsNav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[var(--bg-main)]">
      <SettingsNav />
      <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-10">{children}</main>
    </div>
  );
}
