import Link from "next/link";

/**
 * PROVISIONAL landing page — real product copy on the existing design system.
 * The founding brief references an approved "Landing Website" prototype that
 * was not available in this repo; when the founder supplies it, replace the
 * copy/layout here (keep the structure: hero → how it works → trust → CTA →
 * advisor recruitment). Until then this is honest, launchable content, not a
 * dev placeholder.
 */
export function LandingPage() {
  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden bg-ink px-[5%] pb-20 pt-24 text-center">
        <div className="pointer-events-none absolute -right-[3%] -top-[20%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,.14),transparent_65%)]" />
        <div className="relative mx-auto max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-[rgba(245,158,11,.08)] px-4 py-2 text-[13px] font-semibold text-amber-2">
            <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-amber" />
            No brokers. No commissions on your side. Just owners.
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Talk to Someone Who
            <br />
            <span className="text-amber">Already Bought There.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/55">
            Evaluating a flat? The person who can tell you the truth about the
            builder, the delays, and the hidden charges is someone who already
            owns there — not a broker with a commission riding on your yes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/buyer"
              className="rounded-[13px] bg-amber px-8 py-4 font-display text-[15px] font-extrabold text-ink transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(245,158,11,.35)]"
            >
              Find an owner to talk to →
            </Link>
            <Link
              href="/advisor/onboarding"
              className="rounded-[13px] border-[1.5px] border-white/20 px-8 py-4 font-display text-[15px] font-bold text-white transition-colors hover:border-amber hover:text-amber"
            >
              I own — I want to earn
            </Link>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-5xl px-[5%] py-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
          Honest answers in three steps
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ["🔍", "Search your project", "Find verified owners of the exact project — or builder — you're evaluating."],
            ["📞", "Talk per minute", "Pay only for the minutes you talk. Prepaid wallet, transparent per-minute rates set by each owner."],
            ["✅", "Decide with confidence", "Possession delays, build quality, hidden charges, society politics — from someone who lived it."],
          ].map(([icon, title, body]) => (
            <div key={title} className="rounded-[22px] border-[1.5px] border-border bg-white p-6 shadow-sh">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-3 text-[16px] font-extrabold">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* trust */}
      <section className="bg-surface-2/60 px-[5%] py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Every advisor is a <span className="text-amber">verified owner</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground">
            Before anyone can take your call, our team checks their registered
            sale deed and identity documents by hand. The ✓ badge means they
            really own where they say they own — that&apos;s the whole point.
          </p>
          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            {[
              ["📄 Sale deed checked", "Ownership proof reviewed by a human, not an algorithm."],
              ["🔒 Numbers stay private", "You talk through the app — phone numbers are never shared."],
              ["⭐ Real reviews only", "Only buyers who actually completed a call can review."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border-[1.5px] border-border bg-white p-4">
                <div className="text-[13.5px] font-extrabold">{t}</div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* advisor recruitment */}
      <section className="mx-auto max-w-4xl px-[5%] py-16">
        <div className="relative overflow-hidden rounded-[32px] bg-ink p-10 text-center">
          <div className="pointer-events-none absolute -left-[10%] -bottom-[40%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,.12),transparent_65%)]" />
          <div className="relative">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              You bought the property. <span className="text-amber">Now earn from it.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-white/55">
              Help fellow buyers make informed decisions and get paid ₹30–₹120
              per minute for honest conversations about your own home.
            </p>
            <Link
              href="/advisor/onboarding"
              className="mt-6 inline-block rounded-[13px] bg-amber px-8 py-4 font-display text-[15px] font-extrabold text-ink"
            >
              Become an advisor →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-[5%] py-8 text-center text-[12px] text-soft">
        NoDalalTalks — buyer-to-buyer real estate consultation. Built in India. 🇮🇳
      </footer>
    </div>
  );
}
