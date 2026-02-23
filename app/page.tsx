import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* Subtle tech glow */}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.22),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#0D1326] ring-1 ring-white/10 shadow-[0_0_30px_6px_rgba(255,210,143,0.12)] flex items-center justify-center">
              <span className="text-[#FFD28F] font-semibold">M</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm text-white/70">Oriva</div>
              <div className="text-base font-semibold tracking-wide">
                Movement Marketplace
              </div>
            </div>
          </div>

          <Link
            href="/authorization"
            className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-[#FFD28F]/40 hover:shadow-[0_0_24px_4px_rgba(255,210,143,0.18)] transition"
          >
            Log In
          </Link>
        </header>

        {/* Hero */}
        <section className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_40px_10px_rgba(0,0,0,0.35)] p-8 md:p-10">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-white/70">
              Money is committed first. Movement authorizes its release.
            </p>

            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Move.{" "}
              <span className="text-[#FFD28F]">Unlock</span>.{" "}
              <span className="text-white/90">Impact.</span>
            </h1>

            <p className="max-w-2xl text-base md:text-lg text-white/70">
              Claim a challenge, complete the distance, and instantly move
              committed dollars to the nonprofit behind it.
            </p>

            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/challenges"
                className="group inline-flex items-center justify-center rounded-2xl bg-[#FFD28F] px-5 py-3 text-sm font-semibold text-[#10131E] shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition"
              >
                Enter the Challenge Board
                <span className="ml-2 opacity-70 group-hover:opacity-100 transition">
                  →
                </span>
              </Link>

              <Link
                href="/legal"
                className="inline-flex items-center justify-center rounded-2xl bg-[#0D1326] px-5 py-3 text-sm font-medium text-white/90 ring-1 ring-white/10 hover:ring-white/20 transition"
              >
                How it works
              </Link>
            </div>
          </div>
        </section>

        {/* Quick tiles */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "No fundraising",
              body: "Runners don’t ask or pay. They unlock committed capital.",
            },
            {
              title: "Verified movement",
              body: "Strava/Garmin later. MVP supports manual verification.",
            },
            {
              title: "Matching optional",
              body: "Performance matching partners can amplify impact.",
            },
          ].map((t) => (
            <div
              key={t.title}
              className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_26px_6px_rgba(0,0,0,0.25)]"
            >
              <div className="text-[#FFD28F] text-sm font-semibold">
                {t.title}
              </div>
              <div className="mt-2 text-sm text-white/70">{t.body}</div>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="flex items-center justify-between text-xs text-white/50">
          <span>OMM MVP</span>
          <span>Tech-forward, clean foundation</span>
        </footer>
      </div>
    </main>
  );
}
