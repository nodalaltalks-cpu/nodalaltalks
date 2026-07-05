import { LandingPage } from "@/presentation/features/landing/LandingPage";

export const metadata = {
  title: "NoDalalTalks — Talk to Someone Who Already Bought There",
  description:
    "Evaluating a property? Talk to a verified owner of the exact project — paid per minute, no brokers, no spam. Honest answers about builders, delays, and hidden charges.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-surface">
      <LandingPage />
    </main>
  );
}
