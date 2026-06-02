type SettingsSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </header>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
