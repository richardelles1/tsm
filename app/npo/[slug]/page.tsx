import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import NpoHub from "@/components/NpoHub";
import NpoDonorLinkCard from "@/components/NpoDonorLinkCard";
import FirstVisitOverlay from "@/components/FirstVisitOverlay";

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
  params: Promise<{ slug: string }>;
}) {
  const supabase = createSupabaseServerClient();
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.toString()?.trim();

  if (!slug) notFound();

  const { data: nonprofit, error: npErr } = await supabase
    .from("nonprofits")
    .select("id,name,slug,description,website_url,logo_url,contact_name,contact_email,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (npErr) throw new Error(npErr.message);
  if (!nonprofit) notFound();

  const [
    { data: releases },
    { data: payables },
    { data: donations },
    { data: hubPayables },
    { data: hubReleases },
    { data: hubClaims },
    { data: hubChallenges },
  ] = await Promise.all([
    supabase
      .from("releases")
      .select("amount_cents,matched_amount_cents")
      .eq("nonprofit_id", nonprofit.id)
      .limit(5000),

    supabase
      .from("payables")
      .select("total_cents,status")
      .eq("nonprofit_id", nonprofit.id)
      .limit(5000),

    supabase
      .from("donations")
      .select("donor_email")
      .eq("nonprofit_id", nonprofit.id)
      .limit(10000),

    supabase
      .from("payables")
      .select("id,total_cents,status,created_at")
      .eq("nonprofit_id", nonprofit.id)
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("releases")
      .select("id,amount_cents,matched_amount_cents,released_at,challenges:challenge_id(title)")
      .eq("nonprofit_id", nonprofit.id)
      .order("released_at", { ascending: false })
      .limit(5),

    supabase
      .from("claims")
      .select("id,distance_miles_snapshot,verified_at,challenges!inner(id,nonprofit_id,title)")
      .eq("status", "approved")
      .eq("challenges.nonprofit_id", nonprofit.id)
      .order("verified_at", { ascending: false })
      .limit(5),

    supabase
      .from("challenges")
      .select("id,title,status,amount_cents,match_ratio,expires_at")
      .eq("nonprofit_id", nonprofit.id)
      .in("status", ["open", "claimed"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

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

  const pageWrap = "p-5 md:p-8 space-y-6 md:space-y-8 text-neutral-100";
  const muted = "text-sm text-neutral-300/80";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const pill =
    "inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-neutral-200";
  const kpiLabel = "text-xs text-neutral-300/70";
  const kpiVal = "mt-2 text-3xl font-semibold";
  const dot = nonprofit.is_active ? "bg-emerald-400" : "bg-neutral-500";

  return (
    <div className={pageWrap}>
      {/* HEADER */}
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
              </div>
            </div>
          </div>

          {nonprofit.website_url ? (
            <a
              href={nonprofit.website_url}
              target="_blank"
              rel="noreferrer"
              className="self-start rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-white/10"
            >
              Visit website
            </a>
          ) : null}
        </div>

        {nonprofit.description ? (
          <p className={muted}>{nonprofit.description}</p>
        ) : (
          <p className={muted}>Your live dashboard — payouts, challenges, unlocked impact, and activity.</p>
        )}
      </div>

      {/* TOP KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={card}>
          <div className={kpiLabel}>Donors (lifetime)</div>
          <div className={kpiVal}>{fmtNumber(donorCount)}</div>
          <div className="mt-1 text-xs text-neutral-300/60">Unique donors.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Currently owed</div>
          <div className={`${kpiVal} text-[#FFD28F]`}>{formatUsdFromCents(currentlyOwedCents)}</div>
          <div className="mt-1 text-xs text-neutral-300/60">Queued payables.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Total unlocked</div>
          <div className={kpiVal}>{formatUsdFromCents(totalUnlockedCents)}</div>
          <div className="mt-1 text-xs text-neutral-300/60">Base + match (lifetime).</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Impact multiplier</div>
          <div className={kpiVal}>{impactMultiplier}</div>
          <div className="mt-1 text-xs text-neutral-300/60">Total unlocked / base.</div>
        </div>
      </div>

      {/* DONOR LINK */}
      <NpoDonorLinkCard slug={slug} />

      {/* NPO HUB — toggleable sections */}
      <NpoHub
        slug={slug}
        payables={(hubPayables ?? []) as any}
        releases={(hubReleases ?? []) as any}
        claims={(hubClaims ?? []) as any}
        challenges={(hubChallenges ?? []) as any}
      />

      {/* FOOTER LINKS */}
      <div className="flex flex-wrap gap-4 text-xs text-white/40 pt-1">
        <span className="text-white/20">More:</span>
        <a href={`/npo/${slug}/about`} className="hover:text-white/70 transition underline underline-offset-2">
          About
        </a>
        <a href={`/npo/${slug}/settings`} className="hover:text-white/70 transition underline underline-offset-2">
          Settings
        </a>
        <a href="/athlete" className="hover:text-white/70 transition underline underline-offset-2">
          Back to Athlete
        </a>
      </div>

      <FirstVisitOverlay
        storageKey="tsm_tour_v1_npo"
        title="Welcome to your portal."
        subtitle="Here's a quick look at what you can do from this dashboard."
        ctaLabel="Let's go"
        steps={[
          {
            label: "Your dashboard",
            description: "This is your hub for tracking donations, challenges, and payouts. Everything your nonprofit earns through movement shows up here.",
            color: "#C4EBF2",
          },
          {
            label: "Payouts and ledger",
            description: "The Payouts and Unlock Ledger sections show every dollar earned and owed to you, with a full transaction history you can reference any time.",
            color: "#FFD28F",
          },
          {
            label: "Active challenges",
            description: "Challenges are how athletes unlock funding for your cause. You can see who is active, how much is at stake, and when challenges expire.",
            color: "#FF9B6A",
          },
          {
            label: "Your donor link",
            description: "Share your pre-filled donation link with your community so supporters can give directly to your fund without any extra steps.",
            color: "#FFD28F",
          },
        ]}
      />
    </div>
  );
}
