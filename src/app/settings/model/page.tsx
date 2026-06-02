import { LlmSettingsPanel } from "@/components/LlmSettingsPanel";
import { ModelStatusPanel } from "@/components/ModelStatusPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function ModelSettingsPage() {
  return (
    <SettingsSection
      title="Language model"
      description="OpenAI-compatible API for chat."
    >
      <LlmSettingsPanel />
      <div>
        <h2 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Connection status</h2>
        <ModelStatusPanel />
      </div>
    </SettingsSection>
  );
}
