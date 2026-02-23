// NEW
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${(v / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ReleaseRow = {
  id: string;
  claim_id: string | null;
  challenge_id: string | null;
  nonprofit_id: string | null;
  funding_pool_id: string | null;
  corporate_partner_pmp_id: string | null;
  amount_cents: number | null;
  matched_amount_cents: number | null;
  released_at: string | null;
  created_at: string | null;
  currency: string | null;

  // joins
  nonprofits?: { name: string | null; slug: string | null } | null;
  challenges?: { title: string | null; activity: string | null; distance_miles: number | null } | null;
  claims?: {
    athlete_id: string | null;
    athletes?: { display_name: string | null; username: string | null } | null;
  } | null;
  corporate_partners_pmp?: { name: string | null; slug: string | null } | null;
  funding_pools?: { source_name: string | null; source_type: string | null; pool_type: string | null } | null;
};

export default async function AdminReleasesPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("releases")
    .select(
      `
      id,
      claim_id,
      challenge_id,
      nonprofit_id,
      funding_pool_id,
      corporate_partner_pmp_id,
      amount_cents,
      matched_amount_cents,
      released_at,
      created_at,
      currency,
      nonprofits ( name, slug ),
      challenges ( title, activity, distance_miles ),
      claims (
        athlete_id,
        athletes ( display_name, username )
      ),
      corporate_partners_pmp ( name, slug ),
      funding_pools ( source_name, source_type, pool_type )
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as ReleaseRow[];

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.18),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-white/60">Admin</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Releases Ledger
            </h1>
            <p className="mt-2 text-sm text-white/65 max-w-2xl">
              Immutable record of every approved claim that unlocked money (base + match).
              If it’s not here, it didn’t happen.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              ← Admin Home
            </Link>
            <Link
              href="/admin/funding-pools"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/25 hover:ring-[#FFD28F]/45 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
            >
              Funding Pools →
            </Link>
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div className="mt-8 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
            {error.message}
          </div>
        ) : null}

        {/* Table Card */}
        <div className="mt-8 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_34px_10px_rgba(0,0,0,0.30)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="text-sm text-white/70">
              Showing <span className="text-white">{rows.length}</span> most recent releases
            </div>
            <div className="text-xs text-white/50">
              Tip: This view should always reconcile with pool remaining balances.
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-3 text-left font-medium">When</th>
                  <th className="px-6 py-3 text-left font-medium">Nonprofit</th>
                  <th className="px-6 py-3 text-left font-medium">Challenge</th>
                  <th className="px-6 py-3 text-left font-medium">Athlete</th>
                  <th className="px-6 py-3 text-left font-medium">Base</th>
                  <th className="px-6 py-3 text-left font-medium">Match</th>
                  <th className="px-6 py-3 text-left font-medium">Total</th>
                  <th className="px-6 py-3 text-left font-medium">Pools</th>
                  <th className="px-6 py-3 text-left font-medium">IDs</th>
                </tr>
              </thead>

              <tbody className="text-white/80">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-white/60" colSpan={9}>
                      No releases yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const base = r.amount_cents ?? 0;
                    const match = r.matched_amount_cents ?? 0;
                    const total = base + match;

                    const nonprofitName = r.nonprofits?.name ?? "—";
                    const challengeTitle = r.challenges?.title ?? "—";

                    const athleteDisplay =
                      r.claims?.athletes?.display_name ||
                      (r.claims?.athletes?.username ? `@${r.claims.athletes.username}` : null) ||
                      "—";

                    const basePoolLabel = r.funding_pools?.source_name
                      ? `${r.funding_pools.source_name}`
                      : r.funding_pool_id
                        ? shortId(r.funding_pool_id)
                        : "—";

                    const partnerLabel = r.corporate_partners_pmp?.name
                      ? `${r.corporate_partners_pmp.name}`
                      : r.corporate_partner_pmp_id
                        ? shortId(r.corporate_partner_pmp_id)
                        : "—";

                    return (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-white">{fmtDate(r.created_at)}</div>
                          <div className="text-xs text-white/50">
                            released {fmtDate(r.released_at)}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-white">{nonprofitName}</div>
                          <div className="text-xs text-white/50">
                            {r.nonprofits?.slug ?? "—"}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-white">{challengeTitle}</div>
                          <div className="text-xs text-white/50">
                            {r.challenges?.activity ?? "—"}
                            {typeof r.challenges?.distance_miles === "number"
                              ? ` · ${r.challenges.distance_miles} mi`
                              : ""}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-white">{athleteDisplay}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                            {money(base)}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-[#FFD28F]/20">
                            {money(match)}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="rounded-full bg-[#FFD28F]/15 px-2 py-1 ring-1 ring-[#FFD28F]/30 text-[#FFD28F]">
                            {money(total)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-white/85">
                            Base: <span className="text-white">{basePoolLabel}</span>
                          </div>
                          <div className="text-white/70">
                            Match: <span className="text-white/85">{partnerLabel}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs text-white/60">
                            release {shortId(r.id)}
                          </div>
                          <div className="text-xs text-white/60">
                            claim {shortId(r.claim_id)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 text-xs text-white/50">
            Read-only view. Anything that changes money must happen through the release engine.
          </div>
        </div>
      </div>
    </main>
  );
}
