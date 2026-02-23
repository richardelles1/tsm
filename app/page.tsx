import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen text-white bg-black overflow-hidden">

      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/coming-soon-hero.png"
          alt="Runner at sunrise"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/85" />
      </div>

      {/* Top Right Login */}
      <div className="absolute top-6 right-6 z-20">
        <Link
          href="/authorization"
          className="px-5 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-sm font-medium hover:border-[#FFD28F] hover:text-[#FFD28F] transition"
        >
          Log In
        </Link>
      </div>

      {/* Hero Content */}
      <section className="relative z-10 flex items-center justify-center min-h-screen px-6 text-center">
        <div className="max-w-3xl">

          {/* Company Name */}
          <div className="text-sm tracking-[0.35em] uppercase text-white/70 mb-6">
            The Shared Mile
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-tight">
            Coming Soon
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg text-white/80 leading-relaxed">
            Movement unlocks capital.
          </p>

          {/* Micro Description */}
          <p className="mt-4 text-white/60 max-w-xl mx-auto">
            A new marketplace where verified activity activates
            committed funding for nonprofits.
          </p>

        </div>
      </section>

    </main>
  );
}
