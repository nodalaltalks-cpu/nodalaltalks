import { AdvisorOnboardingForm } from "@/presentation/features/advisor-onboarding/AdvisorOnboardingForm";

export const metadata = {
  title: "Become an Advisor · NoDalalTalks",
};

/**
 * Advisor onboarding route. The form is a client component; this server page
 * just frames it with the hero band, preserving the approved prototype design.
 */
export default function AdvisorOnboardingPage() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden bg-ink px-[5%] pb-14 pt-24 text-center">
        <div className="pointer-events-none absolute -right-[3%] -top-[20%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,.13),transparent_65%)]" />
        <div className="relative mx-auto max-w-[860px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green/30 bg-[rgba(16,185,129,.08)] px-4 py-2 text-[13px] font-semibold text-[#34D399]">
            <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-green" />
            Advisor Program — Free to Join
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            You Bought the Property.
            <br />
            <span className="text-amber">Now Earn From It.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/50">
            Turn your real estate experience into income. Help fellow buyers make
            informed decisions — and get paid ₹30–₹120 per minute for honest
            conversations.
          </p>
        </div>
      </section>

      <AdvisorOnboardingForm />
    </main>
  );
}
