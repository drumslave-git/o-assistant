import { VoiceSettingsPanel } from "@/components/VoiceSettingsPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function VoiceSettingsPage() {
  return (
    <SettingsSection
      title="Voice"
      description="OpenAI-compatible text-to-speech for spoken replies."
    >
      <VoiceSettingsPanel />
    </SettingsSection>
  );
}
