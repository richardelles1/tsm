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

export default async function FundsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = createSupabaseServerClient();
  const { slug } = await params;

  if (!slug) notFound();

  const { data: nonprofit } = await supabase
    .from("nonprofits")
    .select("id,name")
    .eq("slug", slug)
    .maybeSingle();

  if (!nonprofit) notFound();

  // Funding pools are internal finance objects, but this page is allowed to show them
  // because it’s “Funds” (not a public donor page).
  const { data: pools, error: poolErr } = await supabase
    .from("funding_pools")
    .select(
      "id,pool_type,source_name,source_type,total_amount_cents,remaining_amount_cents,currency,is_active,starts_at,ends_at,created_at,corporate_partner_pmp_id"
    )
    .eq("nonprofit_id", nonprofit.id)
    .order("created_at", { ascending: false });

  if (poolErr) throw new Error(poolErr.message);

  // Optional: enrich with partner name when a pool is backed by a corporate partner
  const partnerIds = Array.from(
    new Set((pools ?? []).map((p: any) => p.corporate_partner_pmp_id).filter(Boolean))
  );

  let partnerMap = new Map<string, string>();
  if (partnerIds.length > 0) {
    const { data: partners, error: parErr } = await supabase
      .from("corporate_partners_pmp")
      .select("id,name")
      .in("id", partnerIds);

    if (parErr) throw new Error(parErr.message);
    (partners ?? []).forEach((p: any) => partnerMap.set(p.id, p.name));
  }

  const rows = pools ?? [];

  const activePools = rows.filter((p: any) => p.is_active);
  const inactivePools = rows.filter((p: any) => !p.is_active);

  const totalCommittedCents = rows.reduce((acc: number, p: any) => acc + (p.total_amount_cents ?? 0), 0);
  const totalRemainingCents = rows.reduce((acc: number, p: any) => acc + (p.remaining_amount_cents ?? 0), 0);

  const pageWrap = "p-5 md:p-8 space-y-6 text-neutral-100";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const muted = "text-sm text-neutral-300/80";
  const pill =
    "inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs";
  const kpiLabel = "text-xs text-neutral-300/70";
  const kpiVal = "mt-2 text-2xl font-semibold";

  const badge = (active: boolean) => (
    <span className={pill}>{active ? "active" : "inactive"}</span>
  );

  const poolTitle = (p: any) => {
    const partnerName = p.corporate_partner_pmp_id
      ? partnerMap.get(p.corporate_partner_pmp_id) || "Corporate partner"
      : null;

    const source = p.source_name || partnerName || "Funding pool";
    const type = p.pool_type ? String(p.pool_type).replaceAll("_", " ") : "funds";
    return `${source} • ${type}`;
  };

  return (
    <div className={pageWrap}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Funds</h1>
          <p className={muted}>Funding pools that power challenges for {nonprofit.name}</p>
        </div>

        <Link
          href={`/npo/${slug}`}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          ← Home
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={card}>
          <div className={kpiLabel}>Active pools</div>
          <div className={kpiVal}>{activePools.length}</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Committed (lifetime)</div>
          <div className={kpiVal}>{formatUsdFromCents(totalCommittedCents)}</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Remaining (available)</div>
          <div className={kpiVal}>{formatUsdFromCents(totalRemainingCents)}</div>
        </div>
      </div>

      {/* Pools */}
      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className={card}>
            <p className={muted}>No funding pools yet.</p>
          </div>
        ) : (
          rows.map((p: any) => {
            const committed = p.total_amount_cents ?? 0;
            const remaining = p.remaining_amount_cents ?? 0;
            const used = Math.max(0, committed - remaining);

            return (
              <div key={p.id} className={card}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-medium">{poolTitle(p)}</div>
                      {badge(!!p.is_active)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={pill}>Committed {formatUsdFromCents(committed)}</span>
                      <span className={pill}>Remaining {formatUsdFromCents(remaining)}</span>
                      <span className={pill}>Used {formatUsdFromCents(used)}</span>
                    </div>

                    <div className="text-xs text-neutral-300/70">
                      Window: {fmtDate(p.starts_at)} → {fmtDate(p.ends_at)}
                    </div>
                  </div>

                  <div className="text-xs text-neutral-300/70 font-mono break-all">
                    pool: {p.id}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inactive section */}
      {inactivePools.length > 0 ? (
        <div className="pt-2">
          <div className="text-sm font-medium text-neutral-200/90">Inactive pools</div>
          <p className={muted}>Kept for history and audit continuity.</p>
        </div>
      ) : null}
    </div>
  );
}
