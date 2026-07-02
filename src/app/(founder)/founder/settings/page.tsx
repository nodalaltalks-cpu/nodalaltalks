import { SettingsView } from "@/presentation/features/founder/SettingsView";

export const metadata = { title: "Business Settings · NoDalalTalks" };

export default function FounderSettingsPage() {
  return (
    <main className="min-h-screen bg-surface">
      <SettingsView />
    </main>
  );
}
