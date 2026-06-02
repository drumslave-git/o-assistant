import { MemoryPanel } from "@/components/MemoryPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function MemorySettingsPage() {
  return (
    <SettingsSection
      title="Memory"
      description="Facts O learns about you. Used in context for future chats."
    >
      <MemoryPanel />
    </SettingsSection>
  );
}
