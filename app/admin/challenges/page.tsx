// NEW
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ChallengeRow = {
  id: string;
  title: string | null;
  description: string | null;
  activity: string | null;
  distance_miles: number | null;
  amount_cents: number | null;

  lane: string | null;
  status: string | null;

  nonprofit_id: string | null;
  funding_pool_id: string | null;
  corporate_partner_pmp_id: string | null;

  match_ratio: number | null;
  slots_total: number | null;
  slots_claimed: number | null;

  // NEW
  created_at: string | null;
  expires_at: string | null;


  nonprofits?: { name?: string | null; slug?: string | null } | null;
  funding_pools?: {
    pool_type?: string | null;
    source_name?: string | null;
    remaining_amount_cents?: number | null;
    total_amount_cents?: number | null;
    currency?: string | null;
  } | null;
  corporate_partners_pmp?: {
    name?: string | null;
    slug?: string | null;
    is_active?: boolean | null;
  } | null;
};

type ReleaseMini = {
  challenge_id: string | null;
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

function pillClass(kind: "ok" | "warn" | "bad" | "neutral") {
  if (kind === "ok") return "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25";
  if (kind === "warn") return "bg-[#FFD28F]/10 text-[#FFD28F] ring-[#FFD28F]/20";
  if (kind === "bad") return "bg-red-500/10 text-red-100 ring-red-500/25";
  return "bg-white/5 text-white/70 ring-white/10";
}

export default async function AdminChallengesPage() {
  const admin = createSupabaseServerClient();

  // Best-effort joins (safe across schema evolutions)
  const { data: challenges, error: cErr } = await admin
    .from("challenges")
    // NEW
    .select(
      `
      id,
      title,
      description,
      activity,
      distance_miles,
      amount_cents,
      lane,
      status,
      nonprofit_id,
      funding_pool_id,
      corporate_partner_pmp_id,
      match_ratio,
      slots_total,
      slots_claimed,
      created_at,
      expires_at,
      nonprofits ( name, slug ),
      funding_pools ( pool_type, source_name, remaining_amount_cents, total_amount_cents, currency ),
      corporate_partners_pmp ( name, slug, is_active )
    `
    )

    .order("created_at", { ascending: false });

  // Releases: used to show utilization & last unlock
  const { data: releases, error: rErr } = await admin
    .from("releases")
    .select("challenge_id, amount_cents, matched_amount_cents, released_at, created_at")
    .order("created_at", { ascending: false });

  const error = cErr || rErr;

  const cRows = (challenges ?? []) as ChallengeRow[];
  const rRows = (releases ?? []) as ReleaseMini[];

  // Aggregate releases per challenge
  const relAgg = new Map<
    string,
    { count: number; totalReleasedCents: number; lastReleaseAt: string | null }
  >();

  for (const r of rRows) {
    const cid = r.challenge_id;
    if (!cid) continue;

    const base = typeof r.amount_cents === "number" ? r.amount_cents : 0;
    const match = typeof r.matched_amount_cents === "number" ? r.matched_amount_cents : 0;
    const total = base + match;

    if (!relAgg.has(cid)) relAgg.set(cid, { count: 0, totalReleasedCents: 0, lastReleaseAt: null });
    const g = relAgg.get(cid)!;

    g.count += 1;
    g.totalReleasedCents += total;

    const t = r.released_at ?? r.created_at ?? null;
    if (t && (!g.lastReleaseAt || new Date(t) > new Date(g.lastReleaseAt))) g.lastReleaseAt = t;
  }

  // Derived view rows
  const view = cRows.map((c) => {
    const slotsTotal = typeof c.slots_total === "number" ? c.slots_total : null;
    const slotsClaimed = typeof c.slots_claimed === "number" ? c.slots_claimed : 0;
    const slotsRemaining =
      slotsTotal == null ? null : Math.max(0, slotsTotal - (slotsClaimed ?? 0));

    const perClaimBase = c.amount_cents ?? 0;
    const maxExposure =
      slotsTotal == null ? null : Math.max(0, slotsTotal) * Math.max(0, perClaimBase);

    const poolRemaining = c.funding_pools?.remaining_amount_cents ?? null;
    const poolName = c.funding_pools?.source_name ?? null;
    const poolType = c.funding_pools?.pool_type ?? null;

    const releasesFor = relAgg.get(c.id) ?? { count: 0, totalReleasedCents: 0, lastReleaseAt: null };

    // Health heuristics (read-only signals)
    const isExhaustedSlots = slotsTotal != null && slotsRemaining === 0;
    const isLowPool =
      typeof poolRemaining === "number" &&
      typeof maxExposure === "number" &&
      maxExposure > 0 &&
      poolRemaining < Math.min(maxExposure * 0.15, 50_00); // <15% of exposure OR <$50

    const statusStr = (c.status ?? "").toLowerCase();
    const laneStr = (c.lane ?? "").toLowerCase();

    let health: "ok" | "warn" | "bad" | "neutral" = "neutral";
    let healthLabel = "—";

    if (isExhaustedSlots) {
      health = "bad";
      healthLabel = "Exhausted";
    } else if (isLowPool) {
      health = "warn";
      healthLabel = "Low pool";
    } else if (statusStr) {
      health = statusStr === "active" ? "ok" : "neutral";
      healthLabel = statusStr === "active" ? "Healthy" : c.status ?? "—";
    } else {
      health = "neutral";
      healthLabel = "Healthy";
    }

    const matchBadge =
      typeof c.match_ratio === "number" && c.match_ratio > 0
        ? `${c.match_ratio}× match`
        : c.corporate_partner_pmp_id
          ? "Match (custom)"
          : null;

    return {
      c,
      slotsTotal,
      slotsClaimed,
      slotsRemaining,
      maxExposure,
      poolRemaining,
      poolName,
      poolType,
      releasesFor,
      health,
      healthLabel,
      laneStr,
      statusStr,
      matchBadge,
    };
  });

  // Sort: active/healthy first, then by newest
  view.sort((a, b) => {
    const aOwed = a.slotsRemaining === 0 ? 1 : 0;
    const bOwed = b.slotsRemaining === 0 ? 1 : 0;
    if (aOwed !== bOwed) return aOwed - bOwed;
    return (b.c.created_at ?? "").localeCompare(a.c.created_at ?? "");
  });

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
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Challenges</h1>
            <p className="mt-2 text-sm text-white/65 max-w-2xl">
              Inventory control tower. Shows challenge funding source, slots, and utilization. Read-only: money moves only
              via the release engine.
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
              href="/admin/newchallenge"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
            >
              New Challenge →
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
            {error.message}
          </div>
        ) : null}

        <div className="mt-8 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_34px_10px_rgba(0,0,0,0.30)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="text-sm text-white/70">
              {view.length === 0 ? "No challenges yet." : `Showing ${view.length} challenges`}
            </div>
            <div className="text-xs text-white/50">
              Tip: “Releases” = utilized inventory. “Slots remaining” = capacity to accept new claims.
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs text-white/55 border-b border-white/10">
            <div className="col-span-4">Challenge</div>
            <div className="col-span-2">Nonprofit</div>
            <div className="col-span-2">Funding Source</div>
            <div className="col-span-2">Slots</div>
            <div className="col-span-2">Utilization</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/10">
            {view.map((v) => {
              const c = v.c;

              const nonprofitName = c.nonprofits?.name ?? "—";
              const nonprofitSlug = c.nonprofits?.slug ?? null;

              const poolLabel = v.poolName ?? (v.poolType ? v.poolType : "—");
              const poolRemaining = typeof v.poolRemaining === "number" ? money(v.poolRemaining) : "—";

              const slotsText =
                v.slotsTotal == null
                  ? "—"
                  : `${v.slotsClaimed ?? 0} / ${v.slotsTotal}`;

              const remainingText =
                v.slotsTotal == null
                  ? "—"
                  : `${v.slotsRemaining ?? 0} left`;

              const utilTotal = v.releasesFor.totalReleasedCents ?? 0;

              return (
                <details key={c.id} className="group">
                  <summary className="list-none cursor-pointer">
                    <div className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-white/5 transition">
                      {/* Challenge */}
                      <div className="col-span-4 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{c.title ?? "Untitled challenge"}</div>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] ring-1 ${pillClass(v.health)}`}>
                            {v.healthLabel}
                          </span>
                          {v.matchBadge ? (
                            <span className="inline-flex items-center rounded-full bg-[#FFD28F]/10 px-2 py-1 text-[11px] text-[#FFD28F] ring-1 ring-[#FFD28F]/20">
                              {v.matchBadge}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-white/55">
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                            {c.activity ?? "activity —"}
                          </span>
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                            {c.distance_miles != null ? `${c.distance_miles} mi` : "— mi"}
                          </span>
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                            {money(c.amount_cents)} / claim
                          </span>
                          <span className="text-white/45">id {shortId(c.id)}</span>
                        </div>
                      </div>

                      {/* Nonprofit */}
                      <div className="col-span-2 min-w-0">
                        <div className="truncate text-white/85">{nonprofitName}</div>
                        <div className="text-[11px] text-white/45 truncate">
                          {nonprofitSlug ?? shortId(c.nonprofit_id)}
                        </div>
                      </div>

                      {/* Funding Source */}
                      <div className="col-span-2 min-w-0">
                        <div className="truncate text-white/85">{poolLabel}</div>
                        <div className="text-[11px] text-white/45 truncate">
                          remaining {poolRemaining}
                        </div>
                      </div>

                      {/* Slots */}
                      <div className="col-span-2">
                        <div className="text-white/85">{slotsText}</div>
                        <div className="text-[11px] text-white/45">{remainingText}</div>
                      </div>

                      {/* Utilization */}
                      <div className="col-span-2">
                        <span className="inline-flex items-center rounded-full bg-[#FFD28F]/10 px-2 py-1 text-xs text-[#FFD28F] ring-1 ring-[#FFD28F]/20">
                          {money(utilTotal)}
                        </span>
                        <div className="mt-1 text-[11px] text-white/45">
                          {v.releasesFor.count ?? 0} releases
                        </div>
                      </div>
                    </div>
                  </summary>

                  {/* Expanded */}
                  <div className="px-6 pb-5">
                    <div className="mt-2 rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[11px] text-white/55 border-b border-white/10">
                        <div className="col-span-4">Window</div>
                        <div className="col-span-4">Partner</div>
                        <div className="col-span-4">Utilization Detail</div>
                      </div>

                      <div className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                        <div className="col-span-4 text-white/75">
                          <div>Starts: <span className="text-white/70">{fmtDate(c.created_at)}</span></div>
                          <div className="text-[11px] text-white/45">
                            Ends: {fmtDate(c.expires_at)}
                          </div>
                          <div className="mt-1 text-[11px] text-white/45">
                            Created: {fmtDate(c.created_at)}
                          </div>
                        </div>

                        <div className="col-span-4 text-white/75">
                          <div className="truncate">
                            {c.corporate_partners_pmp?.name ?? (c.corporate_partner_pmp_id ? "Partner (unloaded)" : "—")}
                          </div>
                          <div className="text-[11px] text-white/45 truncate">
                            {c.corporate_partners_pmp?.slug ?? shortId(c.corporate_partner_pmp_id)}
                          </div>
                          {typeof c.corporate_partners_pmp?.is_active === "boolean" ? (
                            <div className="mt-1 text-[11px] text-white/45">
                              partner active: {c.corporate_partners_pmp.is_active ? "yes" : "no"}
                            </div>
                          ) : null}
                        </div>

                        <div className="col-span-4 text-white/75">
                          <div>
                            Releases: <span className="text-white/70">{v.releasesFor.count}</span>
                          </div>
                          <div className="text-[11px] text-white/45">
                            Last release: {fmtDate(v.releasesFor.lastReleaseAt)}
                          </div>
                          <div className="mt-1 text-[11px] text-white/45">
                            Max exposure (est.): {v.maxExposure == null ? "—" : money(v.maxExposure)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] text-white/45">
                      Read-only. If a challenge looks “low pool” or “exhausted,” the fix is to add/refresh pools or seed a new challenge — not to edit money fields here.
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
