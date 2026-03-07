import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminHub from "@/components/AdminHub";

export const dynamic = "force-dynamic";

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

  const [
    { data: pools, error: poolsErr },
    { data: unpaidPayables, error: payErr },
    { count: releasesAllCount, error: relAllErr },
    { count: releases7dCount, error: rel7dErr },
    { data: pendingVerifications },
    { data: recentChallenges },
    { data: alertPools },
    { data: agingPayables },
    { count: activeChallengesCount },
  ] = await Promise.all([
    admin.from("funding_pools").select("source_type, remaining_amount_cents, total_amount_cents, is_active"),
    admin.from("payables").select("total_cents, status").neq("status", "paid"),
    admin.from("releases").select("id", { count: "exact", head: true }),
    admin.from("releases").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from("claims").select(`
      id, status, verification_photo_url, submitted_at, claimed_at,
      distance_miles_snapshot, athlete_id,
      challenges ( title, activity, amount_cents )
    `).eq("status", "submitted").order("submitted_at", { ascending: true }),
    admin.from("challenges").select(`
      id, title, activity, status, slots_total, slots_claimed, created_at,
      nonprofits ( name )
    `).order("created_at", { ascending: false }).limit(5),
    admin.from("funding_pools").select("id, source_name, source_type, remaining_amount_cents, total_amount_cents, is_active").eq("is_active", true),
    admin.from("payables").select("id, total_cents, status, created_at, nonprofits ( name )").neq("status", "paid"),
    admin.from("challenges").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const activePools = (pools ?? []).filter((p: any) => p?.is_active !== false);

  const donorRemaining = activePools
    .filter((p: any) => p?.source_type === "donor")
    .reduce((sum: number, p: any) => sum + (Number(p?.remaining_amount_cents ?? 0) || 0), 0);

  const partnerRemaining = activePools
    .filter((p: any) => p?.source_type === "corporate_partner")
    .reduce((sum: number, p: any) => sum + (Number(p?.remaining_amount_cents ?? 0) || 0), 0);

  const totalRemaining = donorRemaining + partnerRemaining;

  const unpaidCount = (unpaidPayables ?? []).length;
  const unpaidTotal = (unpaidPayables ?? []).reduce(
    (sum: number, p: any) => sum + (Number(p?.total_cents ?? 0) || 0),
    0
  );

  const SEVEN_DAYS_AGO = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const alerts: Array<{ key: string; severity: "warn" | "bad"; title: string; detail: string; href?: string }> = [];

  for (const pool of alertPools ?? []) {
    const p = pool as any;
    const total = Number(p.total_amount_cents ?? 0);
    const remaining = Number(p.remaining_amount_cents ?? 0);
    if (total > 0 && remaining / total < 0.15) {
      const pct = Math.round((remaining / total) * 100);
      alerts.push({
        key: `pool-${p.id}`,
        severity: pct < 5 ? "bad" : "warn",
        title: `Low pool: ${p.source_name ?? p.id.slice(0, 8)}`,
        detail: `${money(remaining)} remaining (${pct}% of ${money(total)})`,
        href: "/admin/fundingpools",
      });
    }
  }

  for (const payable of agingPayables ?? []) {
    const p = payable as any;
    const created = new Date(p.created_at).getTime();
    if (Date.now() - created > SEVEN_DAYS_AGO) {
      const days = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
      alerts.push({
        key: `payable-${p.id}`,
        severity: days > 14 ? "bad" : "warn",
        title: `Aging payable: ${(p.nonprofits as any)?.name ?? "Unknown nonprofit"}`,
        detail: `${money(p.total_cents)} unpaid · ${days} days old`,
        href: "/admin/payables",
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm text-white/60">Admin</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Command Center</h1>
            <p className="mt-1.5 text-sm text-white/55 max-w-xl">
              Live ops view — verify, monitor, act.
            </p>
          </div>
          <Link
            href="/athlete"
            className="self-start rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            ← Athlete
          </Link>
        </div>

        {(poolsErr || payErr || relAllErr || rel7dErr) ? (
          <div className="mt-6 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-4 text-sm text-red-100">
            {poolsErr?.message || payErr?.message || relAllErr?.message || rel7dErr?.message}
          </div>
        ) : null}

        {/* KPI Cards — 2-col on mobile, 4-col on md+ */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-[24px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5">
            <div className="text-[11px] text-white/50">Total Remaining</div>
            <div className="mt-1.5 text-2xl font-semibold text-[#FFD28F]">{money(totalRemaining)}</div>
            <div className="mt-1 text-[10px] text-white/40">D: {money(donorRemaining)} · P: {money(partnerRemaining)}</div>
          </div>
          <div className="rounded-[24px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5">
            <div className="text-[11px] text-white/50">Unpaid Payables</div>
            <div className="mt-1.5 text-2xl font-semibold">{money(unpaidTotal)}</div>
            <div className="mt-1 text-[10px] text-white/40">{fmtInt(unpaidCount)} rows</div>
          </div>
          <div className="rounded-[24px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5">
            <div className="text-[11px] text-white/50">Releases · 7d</div>
            <div className="mt-1.5 text-2xl font-semibold">{fmtInt(releases7dCount ?? 0)}</div>
            <div className="mt-1 text-[10px] text-white/40">Lifetime: {fmtInt(releasesAllCount ?? 0)}</div>
          </div>
          <div className="rounded-[24px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5">
            <div className="text-[11px] text-white/50">Open Challenges</div>
            <div className="mt-1.5 text-2xl font-semibold">{fmtInt(activeChallengesCount ?? 0)}</div>
            <div className="mt-1 text-[10px] text-white/40">status = open</div>
          </div>
        </div>

        {/* Alert pills — only shown when there are active alerts */}
        {alerts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {alerts.map((a) => (
              <Link
                key={a.key}
                href={a.href ?? "/admin/alerts"}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition",
                  a.severity === "bad"
                    ? "bg-red-500/15 text-red-200 ring-red-500/30 hover:bg-red-500/25"
                    : "bg-[#FFD28F]/10 text-[#FFD28F] ring-[#FFD28F]/25 hover:bg-[#FFD28F]/20",
                ].join(" ")}
              >
                <span className={[
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  a.severity === "bad" ? "bg-red-400" : "bg-[#FFD28F]",
                ].join(" ")} />
                {a.title}
              </Link>
            ))}
          </div>
        )}

        {/* Admin Hub — scrollable stacked sections */}
        <AdminHub
          verifications={(pendingVerifications ?? []) as any}
          challenges={(recentChallenges ?? []) as any}
          payables={(agingPayables ?? []) as any}
          pools={(alertPools ?? []) as any}
        />

        {/* Footer tool links */}
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/40">
          <span className="text-white/20">More tools:</span>
          {[
            { href: "/admin/releases", label: "Releases Ledger" },
            { href: "/admin/nonprofits", label: "Nonprofits" },
            { href: "/admin/fundingpools", label: "Funding Pools" },
            { href: "/admin/donorfunds", label: "Donor Funds" },
            { href: "/admin/partnerfunds", label: "Partner Funds" },
            { href: "/admin/alerts", label: "All Alerts" },
            { href: "/admin/settings", label: "Settings" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white/70 transition underline underline-offset-2">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
