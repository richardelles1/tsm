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

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  paid: "Paid",
  pending: "Pending",
};

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

  const [
    { data: pools, error: poolErr },
    { data: payables, error: payErr },
  ] = await Promise.all([
    supabase
      .from("funding_pools")
      .select(
        "id,pool_type,source_name,source_type,total_amount_cents,remaining_amount_cents,currency,is_active,starts_at,ends_at,created_at,corporate_partner_pmp_id"
      )
      .eq("nonprofit_id", nonprofit.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("payables")
      .select("id,total_cents,status,created_at,paid_at")
      .eq("nonprofit_id", nonprofit.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (poolErr) throw new Error(poolErr.message);
  if (payErr) throw new Error(payErr.message);

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
  const payRows = payables ?? [];

  const activePools = rows.filter((p: any) => p.is_active);
  const totalCommittedCents = rows.reduce((acc: number, p: any) => acc + (p.total_amount_cents ?? 0), 0);
  const totalRemainingCents = rows.reduce((acc: number, p: any) => acc + (p.remaining_amount_cents ?? 0), 0);

  const queuedPayables = payRows.filter((p: any) => p.status === "queued");
  const paidPayables = payRows.filter((p: any) => p.status === "paid");
  const totalQueuedCents = queuedPayables.reduce((acc: number, p: any) => acc + (p.total_cents ?? 0), 0);
  const totalPaidCents = paidPayables.reduce((acc: number, p: any) => acc + (p.total_cents ?? 0), 0);

  const pageWrap = "p-5 md:p-8 space-y-6 text-neutral-100";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const muted = "text-sm text-neutral-300/80";
  const pill =
    "inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs";
  const kpiLabel = "text-xs text-neutral-300/70";
  const kpiVal = "mt-2 text-2xl font-semibold";
  const tableWrap = "overflow-x-auto rounded-2xl border border-white/10 bg-black/20";
  const th = "px-4 py-3 text-left text-xs font-medium text-neutral-300/80";
  const td = "px-4 py-3 text-sm text-neutral-100/90 whitespace-nowrap";
  const rowCls = "border-t border-white/10";

  const badge = (active: boolean) => (
    <span className={pill}>{active ? "active" : "inactive"}</span>
  );

  const poolTitle = (p: any) => {
    const partnerName = p.corporate_partner_pmp_id
      ? partnerMap.get(p.corporate_partner_pmp_id) || "Corporate partner"
      : null;
    const source = p.source_name || partnerName || "Funding pool";
    const type = p.pool_type ? String(p.pool_type).replaceAll("_", " ") : "funds";
    return `${source} · ${type}`;
  };

  return (
    <div className={pageWrap}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Funds & Payouts</h1>
          <p className={muted}>Funding pools and payout history for {nonprofit.name}</p>
        </div>
        <Link
          href={`/npo/${slug}`}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          Home
        </Link>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={card}>
          <div className={kpiLabel}>Active pools</div>
          <div className={kpiVal}>{activePools.length}</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Committed (lifetime)</div>
          <div className={kpiVal}>{formatUsdFromCents(totalCommittedCents)}</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Currently owed</div>
          <div className={`${kpiVal} text-[#FFD28F]`}>{formatUsdFromCents(totalQueuedCents)}</div>
          <div className="mt-1 text-xs text-neutral-300/60">Queued payables.</div>
        </div>

        <div className={card}>
          <div className={kpiLabel}>Total paid out</div>
          <div className={kpiVal}>{formatUsdFromCents(totalPaidCents)}</div>
          <div className="mt-1 text-xs text-neutral-300/60">Lifetime.</div>
        </div>
      </div>

      {/* Payouts table */}
      <div className={card}>
        <div className="text-sm font-medium">Payout history</div>
        <div className="mt-1 text-xs text-neutral-300/70">Every payable associated with your account.</div>

        <div className={`${tableWrap} mt-4`}>
          <table className="min-w-[540px] w-full">
            <thead className="bg-black/20">
              <tr>
                <th className={th}>Created</th>
                <th className={th}>Amount</th>
                <th className={th}>Status</th>
                <th className={th}>Paid date</th>
              </tr>
            </thead>
            <tbody>
              {payRows.length === 0 ? (
                <tr className={rowCls}>
                  <td className={td} colSpan={4}>
                    <span className={muted}>No payouts yet.</span>
                  </td>
                </tr>
              ) : (
                payRows.map((p: any) => (
                  <tr key={p.id} className={rowCls}>
                    <td className={td}>{fmtDate(p.created_at)}</td>
                    <td className={`${td} font-mono`}>{formatUsdFromCents(p.total_cents)}</td>
                    <td className={td}>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border ${
                          p.status === "paid"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : p.status === "queued"
                              ? "border-[#FFD28F]/30 bg-[#FFD28F]/10 text-[#FFD28F]"
                              : "border-white/10 bg-black/20 text-neutral-300"
                        }`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status ?? "—"}
                      </span>
                    </td>
                    <td className={td}>{fmtDate(p.paid_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Funding pools */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-neutral-200">Funding pools</div>
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
                      <div className="text-base font-medium">{poolTitle(p)}</div>
                      {badge(!!p.is_active)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={pill}>Committed {formatUsdFromCents(committed)}</span>
                      <span className={pill}>Remaining {formatUsdFromCents(remaining)}</span>
                      <span className={pill}>Used {formatUsdFromCents(used)}</span>
                    </div>

                    <div className="text-xs text-neutral-300/70">
                      Window: {fmtDate(p.starts_at)} to {fmtDate(p.ends_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
