import { FounderDashboard } from "@/presentation/features/founder/FounderDashboard";

export const metadata = { title: "Founder Cockpit · NoDalalTalks" };

export default function FounderPage() {
  return (
    <main className="min-h-screen bg-surface">
      <FounderDashboard />
    </main>
  );
}
