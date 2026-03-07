import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      {/* ambient glows */}
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.10),transparent_65%)] blur-3xl" />
      </div>

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/coming-soon-hero.png"
            alt="Runner at sunrise"
            fill
            priority
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070A12]/60 via-[#070A12]/50 to-[#070A12]" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-block mb-6 rounded-full bg-white/8 px-4 py-1.5 text-[10px] font-bold tracking-[0.22em] text-white/50 uppercase ring-1 ring-white/10">
            Miles · Movement · Mission
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05]">
            Movement<br />
            <span className="text-[#FFD28F]">Unlocks Capital.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-white/65 max-w-xl mx-auto leading-relaxed">
            A marketplace where verified athletic activity releases committed funding to nonprofits. Every mile you run moves real money.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/challenges"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#FF9B6A] px-8 py-4 text-base font-bold text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,155,106,0.30)] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all"
            >
              Browse Challenges →
            </Link>
            <Link
              href="/give"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-transparent px-8 py-4 text-base ring-1 ring-white/20 text-white/80 hover:ring-white/35 hover:text-white transition"
            >
              Donate →
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative px-6 py-24">
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
                body: "Once approved, the committed funds are released to the nonprofit. Corporate partners can match your impact — multiplying every mile.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 sm:p-7"
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

      {/* ── THE CAPITAL CHAIN ── */}
      <section className="relative px-6 py-20 border-t border-white/8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-[10px] font-bold tracking-[0.22em] text-white/35 uppercase mb-3">The Capital Chain</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            The money is real. And it&apos;s already committed.
          </h2>
          <p className="text-white/50 max-w-xl mx-auto mb-12 text-sm leading-relaxed">
            Donors and corporate partners commit funds upfront. They sit in dedicated pools — earmarked, auditable, ready to release. Athletes are the key that unlocks them.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
            {[
              { label: "Donors", sub: "commit funds to pools", color: "text-[#C4EBF2]" },
              { arrow: true },
              { label: "Foundation", sub: "holds funds — auditable", color: "text-[#FFD28F]" },
              { arrow: true },
              { label: "Athletes", sub: "unlock with movement", color: "text-[#FF9B6A]" },
              { arrow: true },
              { label: "Nonprofits", sub: "receive real funding", color: "text-white" },
            ].map((item, i) => {
              if ("arrow" in item) {
                return (
                  <div key={i} className="text-white/20 text-2xl font-thin sm:mx-2 rotate-90 sm:rotate-0">→</div>
                );
              }
              return (
                <div key={i} className="rounded-2xl bg-white/5 ring-1 ring-white/8 px-5 py-3 text-center min-w-[110px]">
                  <div className={`text-sm font-bold ${item.color}`}>{item.label}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">{item.sub}</div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-xs text-white/30">
            Corporate partners can match athlete-unlocked amounts — multiplying the impact of every mile.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative px-6 py-20 border-t border-white/8 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Ready to move?
          </h2>
          <p className="text-white/50 mb-8 text-sm">
            Every challenge you claim is a dollar committed to a cause. Lace up.
          </p>
          <Link
            href="/challenges"
            className="inline-flex items-center justify-center rounded-full bg-[#FFD28F] px-8 py-4 text-base font-bold text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,210,143,0.20)] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all"
          >
            See All Challenges →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
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
