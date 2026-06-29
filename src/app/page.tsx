/**
 * Placeholder root route — confirms the scaffold, fonts, and design tokens
 * render. Real routes (buyer / advisor / verifier / founder) arrive in later
 * features. This page intentionally contains no business logic.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber/30 bg-amber-pale px-4 py-1.5 text-xs font-bold text-[#92400E]">
        <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-amber" />
        FOUNDATION · FEATURE 1
      </div>

      <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
        NoDalal<span className="text-amber">Talks</span>
      </h1>

      <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
        Engineering foundation is live. The event ledger and{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">
          project()
        </code>{" "}
        reducer are ported, typed, and tested. Clean Architecture layers are in
        place. Next: Firebase, Auth, and Security Rules.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "core", v: "domain + application" },
          { k: "events", v: "40+ verbs, typed" },
          { k: "project()", v: "tested parity" },
          { k: "ports", v: "payment · calling · notify" },
        ].map((t) => (
          <div
            key={t.k}
            className="rounded-lg border border-border bg-card p-4 shadow-sh"
          >
            <div className="font-display text-sm font-extrabold">{t.k}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t.v}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
