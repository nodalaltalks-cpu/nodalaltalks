import { Suspense } from "react";
import { BuyerSignupForm } from "@/presentation/features/buyer/BuyerSignupForm";

export const metadata = { title: "Sign Up or Log In · NoDalalTalks" };

export default function BuyerSignupPage() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden bg-ink px-[5%] pb-12 pt-24 text-center">
        <div className="pointer-events-none absolute -right-[3%] -top-[20%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,.13),transparent_65%)]" />
        <div className="relative mx-auto max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-[rgba(245,158,11,.08)] px-4 py-2 text-[13px] font-semibold text-amber-2">
            <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-amber" />
            Sign up or log in — Free, 60 seconds
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Talk to Someone Who
            <br />
            <span className="text-amber">Already Bought There.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/50">
            Create your free account to browse verified advisors and start your
            first consultation in minutes.
          </p>
        </div>
      </section>
      {/* Suspense: the form reads useSearchParams (?next=). */}
      <Suspense>
        <BuyerSignupForm />
      </Suspense>
    </main>
  );
}
