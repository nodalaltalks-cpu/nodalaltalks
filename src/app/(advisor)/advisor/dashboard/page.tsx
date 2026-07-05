import { AdvisorDashboard } from "@/presentation/features/advisor/AdvisorDashboard";

export const metadata = { title: "Advisor Dashboard · NoDalalTalks" };

export default function AdvisorDashboardPage() {
  return (
    <main className="min-h-screen bg-surface">
      <AdvisorDashboard />
    </main>
  );
}
