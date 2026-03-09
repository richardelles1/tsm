import Link from "next/link";
import { createNonprofit } from "./actions";

export default async function NewNonprofitPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const errMsg = sp.err ?? null;

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] right-[-180px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-xl px-6 py-14">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/admin/nonprofits"
            className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            ← Back
          </Link>
          <div>
            <div className="text-xs text-white/50">Admin / Nonprofits</div>
            <h1 className="text-2xl font-semibold tracking-tight">Add Nonprofit</h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-white/55 leading-relaxed">
          This creates a new nonprofit record and sends an account invite to the contact email. They will receive a branded welcome email with a link to set up their password and access the portal.
        </p>

        {errMsg && (
          <div className="mb-6 rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 px-5 py-4 text-sm text-red-200">
            {decodeURIComponent(errMsg)}
          </div>
        )}

        <form action={createNonprofit} className="space-y-5">
          <div className="rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 space-y-5">

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Organization Name <span className="text-[#FF9B6A]">*</span>
              </label>
              <input
                name="name"
                required
                placeholder="Friends of the Trail"
                className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/25 transition text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                URL Slug
              </label>
              <input
                name="slug"
                placeholder="friends-of-the-trail (auto-generated if blank)"
                className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/25 transition text-white font-mono"
              />
              <p className="text-[11px] text-white/35">Used in their portal URL: thesharedmile.com/npo/slug</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Mission Statement
              </label>
              <textarea
                name="mission"
                rows={3}
                placeholder="A brief description of what this nonprofit does..."
                className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/25 transition text-white resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Website URL
              </label>
              <input
                name="website"
                type="url"
                placeholder="https://example.org"
                className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/25 transition text-white"
              />
            </div>

            <div className="border-t border-white/10 pt-5 space-y-4">
              <div className="text-xs font-medium text-white/50 uppercase tracking-wider">Contact (Portal Admin)</div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Name</label>
                  <input
                    name="contact_name"
                    placeholder="Jane Smith"
                    className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/25 transition text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/40 uppercase tracking-wider">
                    Email <span className="text-[#FF9B6A]">*</span>
                  </label>
                  <input
                    name="contact_email"
                    type="email"
                    required
                    placeholder="jane@example.org"
                    className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/25 transition text-white"
                  />
                </div>
              </div>
              <p className="text-[11px] text-white/35">
                This person will receive a welcome email with an invite link to set up their account and access the portal.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Logo URL <span className="text-white/30">(optional)</span>
              </label>
              <input
                name="logo_url"
                type="url"
                placeholder="https://cdn.example.org/logo.png"
                className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/25 transition text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[#FF9B6A] py-4 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] hover:shadow-[0_10px_36px_rgba(255,155,106,0.35)] hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            Create Nonprofit and Send Invite
          </button>

          <p className="text-[11px] text-white/25 text-center">
            A branded welcome email will be sent immediately. The invite link expires in 24 hours.
          </p>
        </form>
      </div>
    </main>
  );
}
