import { AdvisorSearch } from "@/presentation/features/buyer/AdvisorSearch";

export const metadata = { title: "Browse Advisors · NoDalalTalks" };

export default function BuyerHomePage() {
  return (
    <main className="min-h-screen bg-surface">
      <AdvisorSearch />
    </main>
  );
}
