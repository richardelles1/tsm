import Link from "next/link";
import ContactForm from "./ContactForm";

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; err?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const successMessage = !!sp.ok;
  const errorMessage = sp.err ?? null;

  return (
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.12),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,155,106,0.10),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-xl px-5 py-12">
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase hover:text-white/50 transition"
          >
            The Shared Mile
          </Link>
          <Link
            href="/challenges"
            className="rounded-full bg-[#0D1326] px-4 py-2 text-xs ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            ← Back
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Let's talk.
          </h1>
          <p className="mt-2 text-sm text-white/50 max-w-sm leading-relaxed">
            Whether you're a company looking to turn giving into movement, or a nonprofit ready to let athletes fund your mission — this is where it starts.
          </p>
        </div>

        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 sm:p-7">
          <ContactForm successMessage={successMessage} errorMessage={errorMessage} />
        </div>
      </div>
    </main>
  );
}
