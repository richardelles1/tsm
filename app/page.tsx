import Link from "next/link";
import Image from "next/image";
import HomeHero from "@/components/HomeHero";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      {/* ambient glows */}
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.10),transparent_65%)] blur-3xl" />
      </div>

      {/* HERO */}
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
            A marketplace where verified athletic activity releases committed funding to nonprofits. Every mile you cover moves real money.
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

      {/* WHO IT'S FOR — audience toggle */}
      <HomeHero />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative px-6 py-24 border-t border-white/8">
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
                body: "Browse the marketplace and lock in a challenge. A distance commitment tied to a real funding amount for a specific nonprofit.",
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
            The money is committed before a single move is made.
          </h2>
          <p className="text-white/50 max-w-xl mx-auto mb-4 text-sm leading-relaxed">
            Donors and Impact Partners commit funds upfront. They sit in dedicated pools, earmarked and auditable, locked until athletes release them. No movement, no release.
          </p>
          <p className="text-white/40 max-w-lg mx-auto mb-12 text-sm leading-relaxed">
            When an Impact Partner matches, the amount doubles before it reaches the nonprofit.
          </p>

          {/* Flywheel diagram — two sources at top, then linear flow */}
          <div className="flex flex-col items-center gap-0">

            {/* Row 1: two funding sources — equal width, equidistant from center */}
            <div className="flex flex-row items-stretch justify-center gap-2">
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/8 px-4 py-3 text-center w-[130px]">
                <div className="text-xs font-bold text-[#C4EBF2]">Donors</div>
                <div className="text-[10px] text-white/35 mt-0.5">give to pools</div>
              </div>
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/8 px-4 py-3 text-center w-[130px]">
                <div className="text-xs font-bold text-[#FFD28F]">Impact Partners</div>
                <div className="text-[10px] text-white/35 mt-0.5">commit and match</div>
              </div>
            </div>

            {/* Arrow down */}
            <div className="text-white/20 text-xl font-thin my-2">↓</div>

            {/* Challenge Posted */}
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/8 px-4 py-3 text-center min-w-[130px]">
              <div className="text-xs font-bold text-[#FFD28F]">Challenge Posted</div>
              <div className="text-[10px] text-white/35 mt-0.5">funds earmarked</div>
            </div>

            <div className="text-white/20 text-xl font-thin my-2">↓</div>

            {/* Athlete Moves */}
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/8 px-4 py-3 text-center min-w-[130px]">
              <div className="text-xs font-bold text-[#FF9B6A]">Athlete Moves</div>
              <div className="text-[10px] text-white/35 mt-0.5">run, walk, or cycle</div>
            </div>

            <div className="text-white/20 text-xl font-thin my-2">↓</div>

            {/* Verified */}
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/8 px-4 py-3 text-center min-w-[130px]">
              <div className="text-xs font-bold text-white/70">Verified</div>
              <div className="text-[10px] text-white/35 mt-0.5">activity confirmed</div>
            </div>

            <div className="text-white/20 text-xl font-thin my-2">↓</div>

            {/* Nonprofit Receives */}
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/8 px-4 py-3 text-center min-w-[130px]">
              <div className="text-xs font-bold text-white">Nonprofit Receives</div>
              <div className="text-[10px] text-white/35 mt-0.5">match boost applied</div>
            </div>

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

      {/* PARTNER + NONPROFIT CTAs */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/35 mb-3">Work with us</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Two ways to be part of it
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Impact Partner card */}
            <div className="flex flex-col gap-5 rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-8">
              <div>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C4EBF2]/70">For Companies</span>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-white">Become an Impact Partner</h3>
              </div>
              <p className="text-white/55 text-sm leading-relaxed flex-1">
                Your committed funds sit in a dedicated pool and get released only when athletes complete verified challenges. Movement unlocks your matching dollars.
              </p>
              <Link
                href="/contact?type=partner"
                className="inline-flex items-center justify-center self-start rounded-full bg-[#C4EBF2] px-6 py-3 text-sm font-bold text-[#0B0F1C] hover:bg-white hover:-translate-y-0.5 transition-all"
              >
                Apply Now →
              </Link>
            </div>

            {/* Nonprofit card */}
            <div className="flex flex-col gap-5 rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-8">
              <div>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#FF9B6A]/70">For Nonprofits</span>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-white">Get your cause on the map</h3>
              </div>
              <p className="text-white/55 text-sm leading-relaxed flex-1">
                Athletes complete challenges on your behalf. When they finish, real funding flows to you -- no gala, no grant application, just verified movement.
              </p>
              <Link
                href="/contact?type=nonprofit"
                className="inline-flex items-center justify-center self-start rounded-full bg-[#FF9B6A] px-6 py-3 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all"
              >
                Apply Now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/8 px-6 py-10">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <img src="/tsm-logo.jpeg" alt="The Shared Mile" className="h-8 w-auto rounded mb-1" />
          </div>
          <div className="flex flex-wrap gap-6 text-xs text-white/40">
            <Link href="/challenges" className="hover:text-white/70 transition">Miles Marketplace</Link>
            <Link href="/give" className="hover:text-white/70 transition">Give</Link>
            <Link href="/contact?type=partner" className="hover:text-white/70 transition">Become an Impact Partner</Link>
            <Link href="/contact?type=nonprofit" className="hover:text-white/70 transition">Nonprofits</Link>
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
