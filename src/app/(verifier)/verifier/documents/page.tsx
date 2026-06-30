import { DocumentsDashboard } from "@/presentation/features/verification/DocumentsDashboard";

export const metadata = {
  title: "Verification · NoDalalTalks",
};

export default function VerifierDocumentsPage() {
  return (
    <main className="min-h-screen bg-surface">
      <DocumentsDashboard />
    </main>
  );
}
