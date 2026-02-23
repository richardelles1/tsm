
// app/npo/[slug]/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

function formatUsdFromCents(cents: number | null | undefined) {
  const safe = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe / 100);
}

function fmtNumber(n: number | null | undefined) {
  const safe = typeof n === "number" ? n : 0;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(safe);
}

function ratioX(totalUnlocked: number, baseUnlocked: number) {
  if (!baseUnlocked) return "—";
  const v = totalUnlocked / baseUnlocked;
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}x`;
}

export default async function NonprofitPortalPage({
  params,
}: {
  // Next can treat params as async in newer App Router builds
  params: Promise<{ slug: string }>;
}) {
  const supabase = createSupabaseServerClient();
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.toString()?.trim();

  if (!slug) notFound();

  // --- DATA: nonprofit identity ---
  const { data: nonprofit, error: npErr } = await supabase
    .from("nonprofits")
    .select("id,name,slug,description,website_url,logo_url,contact_name,contact_email,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (npErr) throw new Error(npErr.message);
  if (!nonprofit) notFound();

  // --- DATA: releases (unlocked truth) ---
  const { data: releases, error: relErr } = await supabase
    .from("releases")
    .select("amount_cents,matched_amount_cents")
    .eq("nonprofit_id", nonprofit.id)
    .limit(5000);

  if (relErr) throw new Error(relErr.message);

  // --- DATA: payables (owed truth) ---
  const { data: payables, error: payErr } = await supabase
    .from("payables")
    .select("total_cents,status")
    .eq("nonprofit_id", nonprofit.id)
    .limit(5000);

  if (payErr) throw new Error(payErr.message);

  // --- DATA: donations (donor count) ---
  const { data: donations, error: donErr } = await supabase
    .from("donations")
    .select("donor_email,nonprofit_id")
    .eq("nonprofit_id", nonprofit.id)
    .limit(10000);

  if (donErr) throw new Error(donErr.message);

  // --- KPIs ---
  const relRows = releases ?? [];
  const payRows = payables ?? [];
  const donRows = donations ?? [];

  const baseUnlockedCents = relRows.reduce((acc: number, r: any) => acc + (r.amount_cents ?? 0), 0);
  const matchUnlockedCents = relRows.reduce((acc: number, r: any) => acc + (r.matched_amount_cents ?? 0), 0);
  const totalUnlockedCents = baseUnlockedCents + matchUnlockedCents;

  const currentlyOwedCents = payRows
    .filter((p: any) => p.status === "queued")
    .reduce((acc: number, p: any) => acc + (p.total_cents ?? 0), 0);

  const uniqueDonorEmails = new Set(
    donRows
      .map((d: any) => (d?.donor_email ? String(d.donor_email).trim().toLowerCase() : ""))
      .filter(Boolean)
  );
  const donorCount = uniqueDonorEmails.size;

  const impactMultiplier = ratioX(totalUnlockedCents, baseUnlockedCents);

  // --- STYLE (mobile-first, calm portal) ---
  const pageWrap = "p-5 md:p-8 space-y-6 md:space-y-8 text-neutral-100";
  const muted = "text-sm text-neutral-300/80";
  const help = "text-xs text-neutral-300/70";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const pill =
    "inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-neutral-200";
  const kpiLabel = "text-xs text-neutral-300/70";
  const kpiVal = "mt-2 text-3xl md:text-3xl font-semibold";
  const dot = nonprofit.is_active ? "bg-emerald-400" : "bg-neutral-500";

  const linkCard =
    "group rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5 hover:bg-white/10 transition-colors";
  const linkTitle = "text-sm font-semibold";
  const linkSub = "mt-1 text-xs text-neutral-300/75";

  return (
    <div className={pageWrap}>
      {/* --- HEADER / WELCOME --- */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            {nonprofit.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nonprofit.logo_url}
                alt={`${nonprofit.name} logo`}
                className="h-12 w-12 rounded-xl border border-white/10 bg-black/20 object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl border border-white/10 bg-black/20" />
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                <h1 className="text-2xl font-semibold">{nonprofit.name}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={pill}>{nonprofit.is_active ? "Active" : "Inactive"}</span>
                <span className={pill}>Nonprofit Portal</span>
                <span className={pill}>Read-only</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {nonprofit.website_url ? (
              <a
                href={nonprofit.website_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-white/10"
              >
                Visit website
              </a>
            ) : null}
          </div>
        </div>

        {nonprofit.description ? (
          <p className={muted}>{nonprofit.description}</p>
        ) : (
          <p className={muted}>Welcome — a simple view of donors, totals, and what you’re owed.</p>
        )}

        <p className={help}>
          Built for certainty: unlocked impact comes from <span className="font-mono">releases</span>, and owed amounts
          come from <span className="font-mono">payables</span>.
        </p>
      </div>

      {/* --- TOP KPIs (ONLY what leaders care about) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={card}>
          <div className={kpiLabel}>Donors (lifetime)</div>
          <div className={kpiVal}>{fmtNumber(donorCount)}</div>
          <div className={help}>Unique donor emails.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Currently owed to you</div>
          <div className={kpiVal}>{formatUsdFromCents(currentlyOwedCents)}</div>
          <div className={help}>Queued payables (guaranteed).</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Total impact unlocked (lifetime)</div>
          <div className={kpiVal}>{formatUsdFromCents(totalUnlockedCents)}</div>
          <div className={help}>Base + match (releases).</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>TSM impact multiplier</div>
          <div className={kpiVal}>{impactMultiplier}</div>
          <div className={help}>Total unlocked ÷ base unlocked.</div>
        </div>
      </div>

      {/* --- QUICK NAV (the actual purpose of the lander) --- */}
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Explore</div>
            <div className={help}>Go deeper when you want detail.</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <a href={`/npo/${nonprofit.slug}/challenges`} className={linkCard}>
            <div className={linkTitle}>Challenges</div>
            <div className={linkSub}>Active + completed, amount in flight, history.</div>
          </a>

          <a href={`/npo/${nonprofit.slug}/impact`} className={linkCard}>
            <div className={linkTitle}>Impact</div>
            <div className={linkSub}>Miles, athletes, and progress over time.</div>
          </a>

          <a href={`/npo/${nonprofit.slug}/ledger`} className={linkCard}>
            <div className={linkTitle}>Unlock ledger</div>
            <div className={linkSub}>Audit-grade releases (base + match).</div>
          </a>

          <a href={`/npo/${nonprofit.slug}/funds`} className={linkCard}>
            <div className={linkTitle}>Funds & payouts</div>
            <div className={linkSub}>What’s owed, what’s paid, payout status.</div>
          </a>

          <a href={`/npo/${nonprofit.slug}/about`} className={linkCard}>
            <div className={linkTitle}>About</div>
            <div className={linkSub}>How TSM works and what “owed” means.</div>
          </a>

          <a href={`/npo/${nonprofit.slug}/settings`} className={linkCard}>
            <div className={linkTitle}>Settings</div>
            <div className={linkSub}>Manage your nonprofit's settings.</div>
          </a>
        </div>
      </div>

      {/* --- SUPPORT (simple, not a sidebar essay) --- */}
      <div className={card}>
        <div className="text-sm font-semibold">Support</div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs text-neutral-300/70">Need help?</div>
          <div className="mt-2 text-sm">
            If something looks off, email us and we’ll reconcile against the ledger.
          </div>
          <div className="mt-2 text-xs text-neutral-300/70">
            Contact: {nonprofit.contact_email ? nonprofit.contact_email : "—"}
          </div>
        </div>
      </div>

      {/* subtle footer, no “dev notes” */}
      <div className="text-[11px] text-neutral-300/60">
        This is a public, read-only portal. Authentication and permissions will be added after the framework is complete.
      </div>
    </div>
  );
}
