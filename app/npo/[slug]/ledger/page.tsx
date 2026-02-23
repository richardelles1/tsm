// app/npo/[slug]/ledger/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

function formatUsdFromCents(cents: number | null | undefined) {
  const safe = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe / 100);
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

function safeDateMs(ts: string | null | undefined) {
  if (!ts) return null;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) ? t : null;
}

function fmtNumber(n: number | null | undefined) {
  const safe = typeof n === "number" ? n : 0;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(safe);
}

export default async function NpoLedgerPage({
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

  const { data: releases, error: relErr } = await supabase
    .from("releases")
    .select("id,challenge_id,amount_cents,matched_amount_cents,released_at,created_at")
    .eq("nonprofit_id", nonprofit.id)
    .order("released_at", { ascending: false })
    .limit(200);

  if (relErr) throw new Error(relErr.message);

  const rows = releases ?? [];

  const baseUnlockedCents = rows.reduce((acc: number, r: any) => acc + (r.amount_cents ?? 0), 0);
  const matchUnlockedCents = rows.reduce((acc: number, r: any) => acc + (r.matched_amount_cents ?? 0), 0);
  const totalUnlockedCents = baseUnlockedCents + matchUnlockedCents;

  const lastUnlockAt = rows?.[0]?.released_at ?? null;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const unlocked30dCents = rows
    .filter((r: any) => {
      const t = safeDateMs(r.released_at ?? r.created_at);
      return t !== null && t >= thirtyDaysAgo;
    })
    .reduce((acc: number, r: any) => acc + (r.amount_cents ?? 0) + (r.matched_amount_cents ?? 0), 0);

  // --- STYLE ---
  const pageWrap = "p-5 md:p-8 space-y-6 text-neutral-100";
  const muted = "text-sm text-neutral-300/80";
  const help = "text-xs text-neutral-300/70";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const tableWrap = "overflow-x-auto rounded-2xl border border-white/10 bg-black/20";
  const th = "px-4 py-3 text-left text-xs font-medium text-neutral-300/80";
  const td = "px-4 py-3 text-sm text-neutral-100/90 whitespace-nowrap";
  const row = "border-t border-white/10";
  const kpiLabel = "text-xs text-neutral-300/70";
  const kpiVal = "mt-2 text-2xl font-semibold";

  return (
    <div className={pageWrap}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Unlock ledger</h1>
          <p className={muted}>Releases (unlocked impact) for {nonprofit.name}</p>
        </div>

        <Link
          href={`/npo/${slug}`}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          ← Home
        </Link>
      </div>

      {/* KPIs (minimal) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={card}>
          <div className={kpiLabel}>Total unlocked (lifetime)</div>
          <div className={kpiVal}>{formatUsdFromCents(totalUnlockedCents)}</div>
          <div className={help}>Base + match.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Unlocked last 30 days</div>
          <div className={kpiVal}>{formatUsdFromCents(unlocked30dCents)}</div>
          <div className={help}>Recent releases.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Last unlock</div>
          <div className={kpiVal}>{fmtDate(lastUnlockAt)}</div>
          <div className={help}>Most recent release.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Releases recorded</div>
          <div className={kpiVal}>{fmtNumber(rows.length)}</div>
          <div className={help}>Showing up to 200.</div>
        </div>
      </div>

      {/* Table */}
      <div className={card}>
        <div className="text-sm font-medium">Releases</div>
        <div className={help}>If it’s not here, it didn’t unlock.</div>

        <div className={`${tableWrap} mt-4`}>
          <table className="min-w-[720px] w-full">
            <thead className="bg-black/20">
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Base</th>
                <th className={th}>Match</th>
                <th className={th}>Total</th>
                <th className={th}>Challenge</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr className={row}>
                  <td className={td} colSpan={5}>
                    <span className={muted}>No releases yet.</span>
                  </td>
                </tr>
              ) : (
                rows.map((r: any) => {
                  const base = r.amount_cents ?? 0;
                  const match = r.matched_amount_cents ?? 0;
                  const total = base + match;
                  return (
                    <tr key={r.id} className={row}>
                      <td className={td}>{fmtDate(r.released_at ?? r.created_at)}</td>
                      <td className={`${td} font-mono`}>{formatUsdFromCents(base)}</td>
                      <td className={`${td} font-mono`}>{formatUsdFromCents(match)}</td>
                      <td className={`${td} font-mono`}>{formatUsdFromCents(total)}</td>
                      <td className={`${td} font-mono`}>{r.challenge_id ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
