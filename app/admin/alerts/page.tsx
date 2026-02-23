// NEW
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PoolRow = {
  id: string;
  pool_type: string | null;
  source_name: string | null;
  source_type: string | null;
  remaining_amount_cents: number | null;
  total_amount_cents: number | null;
  currency: string | null;
  is_active: boolean | null;
  created_at: string | null;

  nonprofits?: { name?: string | null; slug?: string | null } | null;
  corporate_partners_pmp?: { name?: string | null; slug?: string | null; is_active?: boolean | null } | null;
};

type PayableRow = {
  id: string;
  nonprofit_id: string | null;
  release_id: string | null;
  total_cents: number | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;

  nonprofits?: { name?: string | null; slug?: string | null } | null;
};

type ChallengeRow = {
  id: string;
  title: string | null;
  nonprofit_id: string | null;
  funding_pool_id: string | null;
  corporate_partner_pmp_id: string | null;
  match_ratio: number | null;
  slots_total: number | null;
  slots_claimed: number | null;
  status: string | null;
  created_at: string | null;
  expires_at: string | null;

  nonprofits?: { name?: string | null; slug?: string | null } | null;
  funding_pools?: { remaining_amount_cents?: number | null; total_amount_cents?: number | null; source_name?: string | null; pool_type?: string | null } | null;
  corporate_partners_pmp?: { name?: string | null; slug?: string | null; is_active?: boolean | null } | null;
};

type ReleaseMini = {
  id: string;
  nonprofit_id: string | null;
  funding_pool_id: string | null;
  corporate_partner_pmp_id: string | null;
  amount_cents: number | null;
  matched_amount_cents: number | null;
  released_at: string | null;
  created_at: string | null;
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

function ageDays(iso?: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function pillClass(kind: "ok" | "warn" | "bad" | "neutral") {
  if (kind === "ok") return "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25";
  if (kind === "warn") return "bg-[#FFD28F]/10 text-[#FFD28F] ring-[#FFD28F]/20";
  if (kind === "bad") return "bg-red-500/10 text-red-100 ring-red-500/25";
  return "bg-white/5 text-white/70 ring-white/10";
}

type Alert = {
  key: string;
  severity: "warn" | "bad";
  title: string;
  detail: string;
  metaLeft?: string;
  metaRight?: string;
  href?: string;
};

export default async function AdminAlertsPage() {
  const admin = createSupabaseServerClient();

  // --- Tuning knobs (UI-only for now) ---
  const LOW_POOL_RATIO = 0.15; // 15%
  const AGING_PAYABLE_DAYS = 14;
  const EXPIRING_CHALLENGE_DAYS = 3;

  // --- Fetch: keep best-effort across schema drift ---
  const [{ data: pools, error: pErr }, { data: payables, error: payErr }, { data: challenges, error: cErr }, { data: releases, error: rErr }] =
    await Promise.all([
      admin
        .from("funding_pools")
        .select(
          `
          id,
          pool_type,
          source_name,
          source_type,
          remaining_amount_cents,
          total_amount_cents,
          currency,
          is_active,
          created_at,
          nonprofits ( name, slug ),
          corporate_partners_pmp ( name, slug, is_active )
        `
        )
        .order("created_at", { ascending: false }),

      admin
        .from("payables")
        .select(
          `
          id,
          nonprofit_id,
          release_id,
          total_cents,
          status,
          paid_at,
          created_at,
          nonprofits ( name, slug )
        `
        )
        .neq("status", "paid")
        .order("created_at", { ascending: true }),

      admin
        .from("challenges")
        .select(
          `
          id,
          title,
          nonprofit_id,
          funding_pool_id,
          corporate_partner_pmp_id,
          match_ratio,
          slots_total,
          slots_claimed,
          status,
          created_at,
          expires_at,
          nonprofits ( name, slug ),
          funding_pools ( remaining_amount_cents, total_amount_cents, source_name, pool_type ),
          corporate_partners_pmp ( name, slug, is_active )
        `
        )
        .order("created_at", { ascending: false }),

      admin
        .from("releases")
        .select(
          `
          id,
          nonprofit_id,
          funding_pool_id,
          corporate_partner_pmp_id,
          amount_cents,
          matched_amount_cents,
          released_at,
          created_at
        `
        )
        .order("created_at", { ascending: false })
        .limit(250),
    ]);

  const error = pErr || payErr || cErr || rErr;

  const poolRows = (pools ?? []) as PoolRow[];
  const payableRows = (payables ?? []) as PayableRow[];
  const challengeRows = (challenges ?? []) as ChallengeRow[];
  const releaseRows = (releases ?? []) as ReleaseMini[];

  // --- Build Alerts ---
  const alerts: Alert[] = [];

  // 1) Low pools (remaining < 15% of total) OR remaining = 0 while active
  for (const p of poolRows) {
    const remaining = typeof p.remaining_amount_cents === "number" ? p.remaining_amount_cents : null;
    const total = typeof p.total_amount_cents === "number" ? p.total_amount_cents : null;
    const active = p.is_active !== false;

    if (!active) continue;
    if (remaining == null || total == null || total <= 0) continue;

    const ratio = remaining / total;

    if (remaining <= 0) {
      alerts.push({
        key: `pool-zero-${p.id}`,
        severity: "bad",
        title: "Pool exhausted",
        detail: `${p.source_name ?? "Unknown pool"} has $0 remaining.`,
        metaLeft: `pool ${shortId(p.id)}`,
        metaRight: `type ${p.pool_type ?? "—"}`,
        href: "/admin/fundingpools",
      });
      continue;
    }

    if (ratio < LOW_POOL_RATIO) {
      alerts.push({
        key: `pool-low-${p.id}`,
        severity: "warn",
        title: "Pool running low",
        detail: `${p.source_name ?? "Unknown pool"} is at ${Math.round(ratio * 100)}% remaining (${money(remaining)} of ${money(total)}).`,
        metaLeft: `pool ${shortId(p.id)}`,
        metaRight: `type ${p.pool_type ?? "—"}`,
        href: "/admin/fundingpools",
      });
    }
  }

  // 2) Aging payables (unpaid, oldest first)
  for (const py of payableRows) {
    const created = py.created_at ?? null;
    const days = ageDays(created);
    if (days == null) continue;

    if (days >= AGING_PAYABLE_DAYS) {
      const name = py.nonprofits?.name ?? "Unknown Nonprofit";
      alerts.push({
        key: `payable-aging-${py.id}`,
        severity: "warn",
        title: "Aging payable",
        detail: `${name} has an unpaid payable aged ${days} days (${money(py.total_cents)}).`,
        metaLeft: `pay ${shortId(py.id)}`,
        metaRight: `created ${fmtDate(created)}`,
        href: "/admin/payables",
      });
    }
  }

  // 3) Partner mismatch / inactive partner referenced by active challenges
  for (const ch of challengeRows) {
    const partnerId = ch.corporate_partner_pmp_id ?? null;
    if (!partnerId) continue;

    const partnerActive = ch.corporate_partners_pmp?.is_active;
    const status = (ch.status ?? "").toLowerCase();

    if (status === "active" && partnerActive === false) {
      alerts.push({
        key: `partner-inactive-${ch.id}`,
        severity: "bad",
        title: "Inactive partner referenced by active challenge",
        detail: `"${ch.title ?? "Untitled challenge"}" references a partner marked inactive.`,
        metaLeft: `challenge ${shortId(ch.id)}`,
        metaRight: `${ch.corporate_partners_pmp?.name ?? shortId(partnerId)}`,
        href: "/admin/challenges",
      });
    }
  }

  // 4) Challenge expiring soon (expires_at within X days) + still has capacity
  const now = Date.now();
  for (const ch of challengeRows) {
    if (!ch.expires_at) continue;
    const exp = new Date(ch.expires_at).getTime();
    if (!Number.isFinite(exp)) continue;

    const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    const slotsTotal = typeof ch.slots_total === "number" ? ch.slots_total : null;
    const slotsClaimed = typeof ch.slots_claimed === "number" ? ch.slots_claimed : 0;
    const remaining = slotsTotal == null ? null : Math.max(0, slotsTotal - slotsClaimed);

    const status = (ch.status ?? "").toLowerCase();
    if (status !== "active") continue;

    if (daysLeft >= 0 && daysLeft <= EXPIRING_CHALLENGE_DAYS && remaining != null && remaining > 0) {
      alerts.push({
        key: `challenge-expiring-${ch.id}`,
        severity: "warn",
        title: "Challenge expiring soon",
        detail: `"${ch.title ?? "Untitled challenge"}" expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} with ${remaining} slot(s) remaining.`,
        metaLeft: `challenge ${shortId(ch.id)}`,
        metaRight: `expires ${fmtDate(ch.expires_at)}`,
        href: "/admin/challenges",
      });
    }
  }

  // 5) Sanity ping: releases exist but no payables (should be rare if engine always creates payables)
  // Best-effort: flag if there are releases and zero payables rows total.
  if (releaseRows.length > 0) {
    // We only fetched unpaid payables above, so we can’t assert “zero payables ever” here.
    // But we *can* warn if there are releases AND zero unpaid payables AND you expect payouts later.
    if (payableRows.length === 0) {
      alerts.push({
        key: `releases-no-unpaid-payables`,
        severity: "warn",
        title: "No unpaid payables detected",
        detail: "Releases exist, but there are currently no unpaid payables. If you expected obligations, verify payable creation logic.",
        metaLeft: `releases ${releaseRows.length}`,
        metaRight: "unpaid payables 0",
        href: "/admin/releases",
      });
    }
  }

  // Sort: bad first, then warn; newest-ish by insertion order (fine for MVP)
  alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "bad" ? -1 : 1));

  const badCount = alerts.filter((a) => a.severity === "bad").length;
  const warnCount = alerts.filter((a) => a.severity === "warn").length;

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
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Alerts</h1>
            <p className="mt-2 text-sm text-white/65 max-w-2xl">
              The “what needs attention” surface. This is where we catch low pools, aging obligations, and mismatched
              configs before they become money stories.
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
              href="/admin/fundingpools"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              Funding Pools →
            </Link>
            <Link
              href="/admin/payables"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
            >
              Payables →
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
            {error.message}
          </div>
        ) : null}

        {/* Summary pills */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-[22px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5 shadow-[0_0_34px_10px_rgba(0,0,0,0.25)]">
            <div className="text-xs text-white/55">Critical</div>
            <div className="mt-1 text-2xl font-semibold">{badCount}</div>
            <div className="mt-2 text-[11px] text-white/45">Exhausted pools, invalid configs, hard blockers.</div>
          </div>

          <div className="rounded-[22px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5 shadow-[0_0_34px_10px_rgba(0,0,0,0.25)]">
            <div className="text-xs text-white/55">Warnings</div>
            <div className="mt-1 text-2xl font-semibold">{warnCount}</div>
            <div className="mt-2 text-[11px] text-white/45">Low inventory, aging payables, expiring challenges.</div>
          </div>

          <div className="rounded-[22px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5 shadow-[0_0_34px_10px_rgba(0,0,0,0.25)]">
            <div className="text-xs text-white/55">Signal health</div>
            <div className="mt-1 text-2xl font-semibold">{alerts.length === 0 ? "Clean" : "Watch"}</div>
            <div className="mt-2 text-[11px] text-white/45">
              This page is read-only. Fixes happen via pools, challenge seeding, or payout ops.
            </div>
          </div>
        </div>

        {/* List */}
        <div className="mt-6 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_34px_10px_rgba(0,0,0,0.30)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="text-sm text-white/70">
              {alerts.length === 0 ? "No alerts 🎉" : `Showing ${alerts.length} alerts`}
            </div>
            <div className="text-xs text-white/50">
              Tip: “Bad” = stop-and-fix. “Warn” = schedule + monitor.
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {alerts.length === 0 ? (
              <div className="px-6 py-10 text-white/65">
                Everything looks calm. If the system is moving money, this page should be boring. That’s a flex.
              </div>
            ) : (
              alerts.map((a) => (
                <div key={a.key} className="px-6 py-4 hover:bg-white/5 transition">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] ring-1 ${
                            pillClass(a.severity === "bad" ? "bad" : "warn")
                          }`}
                        >
                          {a.severity === "bad" ? "Critical" : "Warning"}
                        </span>
                        <div className="font-medium truncate">{a.title}</div>
                      </div>
                      <div className="mt-1 text-sm text-white/70">{a.detail}</div>

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/50">
                        {a.metaLeft ? (
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                            {a.metaLeft}
                          </span>
                        ) : null}
                        {a.metaRight ? (
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                            {a.metaRight}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {a.href ? (
                      <Link
                        href={a.href}
                        className="shrink-0 rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
                      >
                        Open →
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-4 border-t border-white/10 text-[11px] text-white/45">
            MVP heuristics: low pools (&lt;15%), aging payables (&ge;14 days), expiring challenges (&le;3 days), inactive
            partner referenced by active challenge. We can later wire thresholds to /admin/settings.
          </div>
        </div>
      </div>
    </main>
  );
}
