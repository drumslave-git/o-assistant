import { InstructionsPanel } from "@/components/InstructionsPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function InstructionsSettingsPage() {
  return (
    <SettingsSection
      title="Custom instructions"
      description="Persistent rules and preferences included in every conversation."
    >
      <InstructionsPanel />
    </SettingsSection>
  );
}
