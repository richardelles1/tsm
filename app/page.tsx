import Link from "next/link";
import HomeHero from "@/components/HomeHero";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      {/* ambient glows */}
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.10),transparent_65%)] blur-3xl" />
      </div>

      <HomeHero />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <div className="text-[10px] font-bold tracking-[0.22em] text-white/35 uppercase mb-3">How It Works</div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Three steps. Real impact.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                num: "01",
                color: "text-[#FF9B6A]",
                glow: "rgba(255,155,106,0.12)",
                title: "Claim a Challenge",
                body: "Browse the marketplace and lock in a challenge — a distance commitment tied to a real funding amount for a specific nonprofit.",
              },
              {
                num: "02",
                color: "text-[#C4EBF2]",
                glow: "rgba(196,235,242,0.10)",
                title: "Move and Verify",
                body: "Complete the distance. Upload a verification photo or connect your activity tracker. Your body is the key.",
              },
              {
                num: "03",
                color: "text-[#FFD28F]",
                glow: "rgba(255,210,143,0.12)",
                title: "Funding Gets Released",
                body: "Once approved, the committed funds move to the nonprofit. If an Impact Partner is backing the challenge, they match the amount and double what gets released.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 sm:p-7"
                style={{ boxShadow: `0 8px 40px 0 ${step.glow}` }}
              >
                <div className={`text-4xl font-black ${step.color} mb-4 leading-none`}>{step.num}</div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE FLYWHEEL */}
      <section className="relative px-6 py-20 border-t border-white/8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-[10px] font-bold tracking-[0.22em] text-white/35 uppercase mb-3">The Flywheel</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            The money is committed before a single mile is run.
          </h2>
          <p className="text-white/50 max-w-xl mx-auto mb-4 text-sm leading-relaxed">
            Impact Partners and donors commit funds upfront. They sit in dedicated pools, earmarked and auditable, waiting for athletes to release them. No movement, no release.
          </p>
          <p className="text-white/40 max-w-lg mx-auto mb-12 text-sm leading-relaxed">
            When an Impact Partner matches, the amount doubles before it reaches the nonprofit.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
            {[
              { label: "Impact Partners", sub: "commit to pools", color: "text-[#C4EBF2]" },
              { arrow: true },
              { label: "Challenge Posted", sub: "funds earmarked", color: "text-[#FFD28F]" },
              { arrow: true },
              { label: "Athlete Moves", sub: "unlocks with activity", color: "text-[#FF9B6A]" },
              { arrow: true },
              { label: "Verified", sub: "proof reviewed", color: "text-white/70" },
              { arrow: true },
              { label: "Nonprofit Receives", sub: "real funding released", color: "text-white" },
            ].map((item, i) => {
              if ("arrow" in item) {
                return (
                  <div key={i} className="text-white/20 text-2xl font-thin sm:mx-1 rotate-90 sm:rotate-0">
                    →
                  </div>
                );
              }
              return (
                <div key={i} className="rounded-2xl bg-white/5 ring-1 ring-white/8 px-4 py-3 text-center min-w-[100px]">
                  <div className={`text-xs font-bold ${item.color}`}>{item.label}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">{item.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-20 border-t border-white/8 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Ready to move?
          </h2>
          <p className="text-white/50 mb-8 text-sm leading-relaxed">
            Every challenge you claim is a dollar already sitting in a pool, waiting for your miles to release it. Lace up.
          </p>
          <Link
            href="/challenges"
            className="inline-flex items-center justify-center rounded-full bg-[#FFD28F] px-8 py-4 text-base font-bold text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,210,143,0.20)] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all"
          >
            See All Challenges →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/8 px-6 py-10">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <img src="/tsm-logo.jpeg" alt="The Shared Mile" className="h-8 w-auto rounded mb-1" />
          </div>
          <div className="flex gap-6 text-xs text-white/40">
            <Link href="/challenges" className="hover:text-white/70 transition">Miles Marketplace</Link>
            <Link href="/give" className="hover:text-white/70 transition">Give</Link>
            <Link href="/authorization" className="hover:text-white/70 transition">Log In</Link>
          </div>
          <div className="text-[10px] text-white/20 text-center sm:text-right">
            Movement unlocks capital.<br />thesharedmile.com
          </div>
        </div>
      </footer>
    </main>
  );
}
