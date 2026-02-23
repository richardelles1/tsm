// NEW
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FundingPoolRow = {
  id: string;
  pool_type: string | null;
  source_name: string | null;

  nonprofit_id: string | null;
  corporate_partner_pmp_id: string | null;

  total_amount_cents: number | null;
  remaining_amount_cents: number | null;
  currency: string | null;

  is_active: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;

  nonprofits?: { name?: string | null; slug?: string | null } | null;
  corporate_partners_pmp?: { name?: string | null; slug?: string | null } | null;
};

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${Math.round(v / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

function pct(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n)}%`;
}

function poolBucket(poolType?: string | null) {
  const t = (poolType ?? "").toLowerCase();
  if (t.includes("donor")) return "Donor";
  if (t.includes("partner") || t.includes("match")) return "Partner";
  if (t.includes("restricted")) return "Restricted";
  if (t) return poolType!;
  return "Unknown";
}

export default async function AdminFundingPoolsPage() {
  const admin = createSupabaseServerClient();

  const { data, error } = await admin
    .from("funding_pools")
    .select(
      `
      id,
      pool_type,
      source_name,
      nonprofit_id,
      corporate_partner_pmp_id,
      total_amount_cents,
      remaining_amount_cents,
      currency,
      is_active,
      starts_at,
      ends_at,
      created_at,
      nonprofits ( name, slug ),
      corporate_partners_pmp ( name, slug )
    `
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as FundingPoolRow[];

  // --- Stats
  const totals = {
    remaining: 0,
    total: 0,
    pools: rows.length,
    active: rows.filter((r) => r.is_active).length,
  };

  const byType = new Map<
    string,
    { label: string; remaining: number; total: number; count: number }
  >();

  for (const r of rows) {
    const rem = typeof r.remaining_amount_cents === "number" ? r.remaining_amount_cents : 0;
    const tot = typeof r.total_amount_cents === "number" ? r.total_amount_cents : 0;

    totals.remaining += rem;
    totals.total += tot;

    const label = poolBucket(r.pool_type);
    if (!byType.has(label)) byType.set(label, { label, remaining: 0, total: 0, count: 0 });

    const g = byType.get(label)!;
    g.remaining += rem;
    g.total += tot;
    g.count += 1;
  }

  const typeCards = Array.from(byType.values()).sort((a, b) => b.remaining - a.remaining);

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
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Funding Pools</h1>
            <p className="mt-2 text-sm text-white/65 max-w-2xl">
              Source-of-truth view of all pools. If a pool balance is wrong, your entire system story is wrong —
              so this page is sacred. Read-only.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              ← Admin Home
            </Link>
            <Link
              href="/admin/donorfunds"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              Donor Funds →
            </Link>
            <Link
              href="/admin/partnerfunds"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              Partner Funds →
            </Link>
            <Link
              href="/admin/releases"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
            >
              Releases Ledger →
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
            {error.message}
          </div>
        ) : null}

        {/* Stats */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-[26px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_28px_10px_rgba(0,0,0,0.28)]">
            <div className="text-xs text-white/55">Total Remaining (All Pools)</div>
            <div className="mt-1 text-3xl font-semibold text-[#FFD28F]">
              {money(totals.remaining)}
            </div>
            <div className="mt-2 text-xs text-white/50">
              {totals.pools} pools • {totals.active} active
            </div>
          </div>

          <div className="rounded-[26px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_28px_10px_rgba(0,0,0,0.28)]">
            <div className="text-xs text-white/55">Total Capacity (All Pools)</div>
            <div className="mt-1 text-3xl font-semibold">{money(totals.total)}</div>
            <div className="mt-2 text-xs text-white/50">
              utilization {totals.total > 0 ? pct(100 - (totals.remaining / totals.total) * 100) : "—"}
            </div>
          </div>

          <div className="rounded-[26px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_28px_10px_rgba(0,0,0,0.28)] md:col-span-2">
            <div className="text-xs text-white/55">Breakdown by Pool Type</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {typeCards.length === 0 ? (
                <div className="text-sm text-white/60">No pools yet.</div>
              ) : (
                typeCards.map((t) => (
                  <span
                    key={t.label}
                    className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs ring-1 ring-white/10"
                  >
                    <span className="text-white/70">{t.label}</span>
                    <span className="text-white/45">({t.count})</span>
                    <span className="text-[#FFD28F]">{money(t.remaining)}</span>
                  </span>
                ))
              )}
            </div>
            <div className="mt-3 text-[11px] text-white/45">
              Tip: “Remaining” should always reconcile against Releases + Payables behavior.
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-8 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_34px_10px_rgba(0,0,0,0.30)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="text-sm text-white/70">
              {rows.length === 0 ? "No funding pools yet." : `Showing ${rows.length} pools`}
            </div>
            <div className="text-xs text-white/50">
              Read-only. Money moves via releases + payout engine — not clicks.
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs text-white/55 border-b border-white/10">
            <div className="col-span-4">Pool</div>
            <div className="col-span-3">Owner</div>
            <div className="col-span-3">Balance</div>
            <div className="col-span-2">Window</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/10">
            {rows.map((p) => {
              const rem = typeof p.remaining_amount_cents === "number" ? p.remaining_amount_cents : 0;
              const tot = typeof p.total_amount_cents === "number" ? p.total_amount_cents : 0;
              const usedPct = tot > 0 ? (1 - rem / tot) * 100 : 0;

              const ownerLabel =
                p.nonprofits?.name ??
                p.corporate_partners_pmp?.name ??
                (p.nonprofit_id ? "Nonprofit (unloaded)" : p.corporate_partner_pmp_id ? "Partner (unloaded)" : "—");

              const ownerSub =
                p.nonprofits?.slug ??
                p.corporate_partners_pmp?.slug ??
                (p.nonprofit_id ? shortId(p.nonprofit_id) : p.corporate_partner_pmp_id ? shortId(p.corporate_partner_pmp_id) : "—");

              return (
                <div key={p.id} className="grid grid-cols-12 gap-3 px-6 py-4">
                  {/* Pool */}
                  <div className="col-span-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">
                        {p.source_name ?? "Unnamed pool"}
                      </div>
                      <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/70 ring-1 ring-white/10">
                        {poolBucket(p.pool_type)}
                      </span>
                      {p.is_active === false ? (
                        <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-1 text-[11px] text-red-100 ring-1 ring-red-500/25">
                          inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200 ring-1 ring-emerald-500/25">
                          active
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-white/45">
                      id {shortId(p.id)} • currency {p.currency ?? "—"}
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="col-span-3 min-w-0">
                    <div className="truncate text-white/85">{ownerLabel}</div>
                    <div className="text-[11px] text-white/45 truncate">{ownerSub}</div>
                  </div>

                  {/* Balance */}
                  <div className="col-span-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/85">{money(rem)}</span>
                      <span className="text-[11px] text-white/45">
                        of {money(tot)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-black/30 ring-1 ring-white/10 overflow-hidden">
                      <div
                        className="h-full bg-[#FFD28F]/70"
                        style={{ width: `${Math.max(0, Math.min(100, usedPct))}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-white/45">
                      used {pct(usedPct)}
                    </div>
                  </div>

                  {/* Window */}
                  <div className="col-span-2 text-[11px] text-white/55">
                    <div>start {fmtDate(p.starts_at)}</div>
                    <div>end {fmtDate(p.ends_at)}</div>
                    <div className="mt-1 text-white/40">created {fmtDate(p.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-6 py-4 border-t border-white/10 text-[11px] text-white/45">
            If you ever see pool remaining increase without a donor deposit or partner top-up, we stop everything and investigate. That’s the “money doesn’t teleport” rule.
          </div>
        </div>
      </div>
    </main>
  );
}
