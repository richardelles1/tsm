// app/npo/[slug]/impact/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

function fmtNumber(n: number | null | undefined) {
  const safe = typeof n === "number" ? n : 0;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(safe);
}

function fmtMiles(miles: number | null | undefined) {
  const safe = typeof miles === "number" ? miles : 0;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(safe);
}

function fmtDate(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function NpoImpactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = createSupabaseServerClient();
  const { slug } = await params;

  if (!slug) notFound();

  const { data: nonprofit, error: npErr } = await supabase
    .from("nonprofits")
    .select("id,name")
    .eq("slug", slug)
    .maybeSingle();

  if (npErr) throw new Error(npErr.message);
  if (!nonprofit) notFound();

  // Approved claims joined to this nonprofit via challenges
  const { data: approvedClaims, error: clErr } = await supabase
    .from("claims")
    .select(
      "id,athlete_id,distance_miles_snapshot,verified_at,created_at,challenges!inner(id,nonprofit_id,title)"
    )
    .eq("status", "approved")
    .eq("challenges.nonprofit_id", nonprofit.id)
    .order("verified_at", { ascending: false })
    .limit(2000);

  if (clErr) throw new Error(clErr.message);

  const rows = approvedClaims ?? [];

  const totalMiles = rows.reduce(
    (acc: number, c: any) => acc + (Number(c.distance_miles_snapshot) || 0),
    0
  );

  const uniqueAthletes = new Set(rows.map((c: any) => c.athlete_id).filter(Boolean));
  const athleteCount = uniqueAthletes.size;

  const approvedCount = rows.length;
  const lastVerifiedAt = rows?.[0]?.verified_at ?? null;

  // --- STYLE ---
  const pageWrap = "p-5 md:p-8 space-y-6 text-neutral-100";
  const muted = "text-sm text-neutral-300/80";
  const help = "text-xs text-neutral-300/70";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const pill =
    "inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-neutral-200";
  const kpiLabel = "text-xs text-neutral-300/70";
  const kpiVal = "mt-2 text-2xl font-semibold";
  const rowCard = "rounded-2xl border border-white/10 bg-black/20 p-4";

  return (
    <div className={pageWrap}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Impact</h1>
          <p className={muted}>Movement outcomes linked to {nonprofit.name}</p>
        </div>

        <Link
          href={`/npo/${slug}`}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          ← Home
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={card}>
          <div className={kpiLabel}>Miles (lifetime)</div>
          <div className={kpiVal}>{fmtMiles(totalMiles)}</div>
          <div className={help}>Sum of approved claim distance snapshots.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Athletes participated</div>
          <div className={kpiVal}>{fmtNumber(athleteCount)}</div>
          <div className={help}>Unique athletes with approved claims.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Approved claims</div>
          <div className={kpiVal}>{fmtNumber(approvedCount)}</div>
          <div className={help}>Verified movement events.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Last verified</div>
          <div className={kpiVal}>{fmtDate(lastVerifiedAt)}</div>
          <div className={help}>Most recent approval timestamp.</div>
        </div>
      </div>

      {/* Recent approvals */}
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Recent verified activity</div>
            <div className={help}>Latest approved claims (high-signal, low-noise).</div>
          </div>
          <span className={pill}>Showing {Math.min(rows.length, 20)}</span>
        </div>

        <div className="mt-4 grid gap-3">
          {rows.length === 0 ? (
            <div className={muted}>No approved claims yet.</div>
          ) : (
            rows.slice(0, 20).map((c: any) => {
              const miles = Number(c.distance_miles_snapshot) || 0;
              const challengeTitle = c?.challenges?.title ?? "Challenge";
              const when = c.verified_at ?? c.created_at ?? null;

              return (
                <div key={c.id} className={rowCard}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{challengeTitle}</div>
                      <div className={help}>Verified: {fmtDate(when)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={pill}>{fmtMiles(miles)} mi</span>
                      <span className={pill}>athlete: {c.athlete_id ? "✅" : "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 text-xs text-neutral-300/70">
          Note: This page reflects <span className="font-mono">approved</span> claims only.
        </div>
      </div>
    </div>
  );
}
