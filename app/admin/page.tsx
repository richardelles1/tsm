// OLD
// (file does not exist)

// NEW
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${Math.round(v / 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function fmtInt(n?: number | null) {
  return (typeof n === "number" ? n : 0).toLocaleString();
}

export default async function AdminHomePage() {
  const admin = createSupabaseServerClient();

  // -----------------------------
  // KPI: Pool remaining (donor + partner)
  // -----------------------------
  const { data: pools, error: poolsErr } = await admin
    .from("funding_pools")
    .select("source_type, remaining_amount_cents, total_amount_cents, is_active");

  const activePools = (pools ?? []).filter((p: any) => p?.is_active !== false);

  const donorRemaining = activePools
    .filter((p: any) => p?.source_type === "donor")
    .reduce((sum: number, p: any) => sum + (Number(p?.remaining_amount_cents ?? 0) || 0), 0);

  const partnerRemaining = activePools
    .filter((p: any) => p?.source_type === "corporate_partner")
    .reduce((sum: number, p: any) => sum + (Number(p?.remaining_amount_cents ?? 0) || 0), 0);

  const totalRemaining = donorRemaining + partnerRemaining;

  // -----------------------------
  // KPI: Unpaid payables (sum + count)
  // -----------------------------
  const { data: unpaidPayables, error: payErr } = await admin
    .from("payables")
    .select("total_cents, status")
    .neq("status", "paid");

  const unpaidCount = (unpaidPayables ?? []).length;
  const unpaidTotal = (unpaidPayables ?? []).reduce(
    (sum: number, p: any) => sum + (Number(p?.total_cents ?? 0) || 0),
    0
  );

  // -----------------------------
  // KPI: Releases (7d + lifetime count)
  // -----------------------------
  const { count: releasesAllCount, error: relAllErr } = await admin
    .from("releases")
    .select("id", { count: "exact", head: true });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: releases7dCount, error: rel7dErr } = await admin
    .from("releases")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  // -----------------------------
  // KPI: Active challenges count (best-effort, safe)
  // -----------------------------
  // Some schemas use status, some use is_active; we’ll try both without breaking the page.
  let activeChallengesCount: number | null = null;

  const tryIsActive = await admin
    .from("challenges")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (!tryIsActive.error) {
    activeChallengesCount = tryIsActive.count ?? 0;
  } else {
    const tryStatus = await admin
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "open"]);

    if (!tryStatus.error) activeChallengesCount = tryStatus.count ?? 0;
  }

  const anyError =
    poolsErr || payErr || relAllErr || rel7dErr || (activeChallengesCount === null ? null : null);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm text-white/60">Admin</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Command Center
            </h1>
            <p className="mt-2 text-sm text-white/65 max-w-2xl">
              System health, money visibility, and fast access to every governance surface.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/athlete"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              ← Athlete
            </Link>
            <Link
              href="/admin/releases"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
            >
              Releases Ledger →
            </Link>
          </div>
        </div>

        {/* Errors (non-fatal) */}
        {(poolsErr || payErr || relAllErr || rel7dErr) ? (
          <div className="mt-8 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
            <div className="font-medium">Heads up: some metrics failed to load.</div>
            <div className="mt-1 text-red-100/80">
              {poolsErr?.message || payErr?.message || relAllErr?.message || rel7dErr?.message}
            </div>
          </div>
        ) : null}

        {/* KPI Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_34px_10px_rgba(0,0,0,0.30)]">
            <div className="text-xs text-white/55">Total Remaining (All Pools)</div>
            <div className="mt-2 text-3xl font-semibold text-[#FFD28F]">
              {money(totalRemaining)}
            </div>
            <div className="mt-2 text-xs text-white/55">
              Donor: {money(donorRemaining)} • Partner: {money(partnerRemaining)}
            </div>
          </div>

          <div className="rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_34px_10px_rgba(0,0,0,0.30)]">
            <div className="text-xs text-white/55">Unpaid Payables</div>
            <div className="mt-2 text-3xl font-semibold">{money(unpaidTotal)}</div>
            <div className="mt-2 text-xs text-white/55">{fmtInt(unpaidCount)} rows</div>
          </div>

          <div className="rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_34px_10px_rgba(0,0,0,0.30)]">
            <div className="text-xs text-white/55">Releases (Last 7 Days)</div>
            <div className="mt-2 text-3xl font-semibold">{fmtInt(releases7dCount ?? 0)}</div>
            <div className="mt-2 text-xs text-white/55">
              Lifetime: {fmtInt(releasesAllCount ?? 0)}
            </div>
          </div>

          <div className="rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_34px_10px_rgba(0,0,0,0.30)]">
            <div className="text-xs text-white/55">Active Challenges</div>
            <div className="mt-2 text-3xl font-semibold">
              {activeChallengesCount === null ? "—" : fmtInt(activeChallengesCount)}
            </div>
            <div className="mt-2 text-xs text-white/55">
              (best-effort count — safe across schemas)
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_34px_10px_rgba(0,0,0,0.30)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="text-sm text-white/70">Admin Surfaces</div>
            <div className="text-xs text-white/50">
              Tip: “Releases” = truth. “Payables” = what we owe.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-6">
            <AdminLink href="/admin/donorfunds" title="Donor Funds" desc="Donor pools + balances." />
            <AdminLink href="/admin/partnerfunds" title="Partner Funds" desc="Match pool inventory + utilization." />
            <AdminLink href="/admin/fundingpools" title="Funding Pools" desc="All pools, unified view." />

            <AdminLink href="/admin/challenges/newchallenge" title="New Challenge" desc="Create + seed challenge inventory." />
            <AdminLink href="/admin/challenges" title="Challenges" desc="Active / exhausted challenges." />
            <AdminLink href="/admin/releases" title="Releases" desc="Immutable ledger of unlocked funds." />

            <AdminLink href="/admin/payables" title="Payables" desc="Who we owe + drilldown rows." />
            <AdminLink href="/admin/nonprofits" title="Nonprofits" desc="Recipients + totals + payout status." />
            <AdminLink href="/admin/alerts" title="Alerts" desc="Low pools, aging payables, exhausted match." />

            <AdminLink href="/admin/settings" title="Settings" desc="Admin-only rules + thresholds." />
          </div>

          <div className="px-6 pb-6 text-[11px] text-white/45">
            Read-only surfaces. Anything that changes money should happen through the release engine / payout engine —
            not from clicks in the UI.
          </div>
        </div>
      </div>
    </main>
  );
}

function AdminLink(props: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={props.href}
      className={[
        "group rounded-2xl bg-black/20 ring-1 ring-white/10 p-4 transition",
        "hover:bg-white/5 hover:ring-[#FFD28F]/20 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.10)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{props.title}</div>
        <span className="text-white/35 group-hover:text-white/60">→</span>
      </div>
      <div className="mt-1 text-xs text-white/55">{props.desc}</div>
    </Link>
  );
}
