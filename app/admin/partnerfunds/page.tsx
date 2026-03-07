import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function money(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${(v / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PartnerFundsPage() {
  const supabase = createSupabaseServerClient();

  const { data: pools, error } = await supabase
    .from("funding_pools")
    .select(`
      id, pool_type, source_name, source_type,
      corporate_partner_pmp_id,
      total_amount_cents, remaining_amount_cents,
      currency, is_active, created_at,
      corporate_partners_pmp:corporate_partner_pmp_id ( id, name, slug )
    `)
    .eq("source_type", "corporate_partner")
    .order("created_at", { ascending: false });

  const poolCount = (pools ?? []).length;
  const remainingSum = (pools ?? []).reduce((sum: number, p: any) => {
    return sum + (typeof p?.remaining_amount_cents === "number" ? p.remaining_amount_cents : 0);
  }, 0);
  const totalSum = (pools ?? []).reduce((sum: number, p: any) => {
    return sum + (typeof p?.total_amount_cents === "number" ? p.total_amount_cents : 0);
  }, 0);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.12),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <div className="text-xs text-white/40 mb-1">Admin</div>
            <h1 className="text-3xl font-semibold tracking-tight">Partner Funds</h1>
            <p className="text-sm text-white/45 mt-1">
              Corporate partner matching capital across all pools.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/pmpentry" className="rounded-full bg-[#FFD28F]/10 px-4 py-2 text-sm text-[#FFD28F] ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 transition">
              + PMP Entry
            </Link>
            <Link href="/admin" className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Pools</div>
            <div className="text-2xl font-bold">{poolCount}</div>
          </div>
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Total Committed</div>
            <div className="text-2xl font-bold text-[#FFD28F]">{money(totalSum)}</div>
          </div>
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Remaining</div>
            <div className="text-2xl font-bold text-[#C4EBF2]">{money(remainingSum)}</div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 p-4 text-sm text-red-200">
            {error.message}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Pool</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Partner</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Type</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Total</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Remaining</th>
                  <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Active</th>
                </tr>
              </thead>
              <tbody>
                {(pools ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-white/30 text-sm">
                      No partner pools found yet.
                    </td>
                  </tr>
                ) : (
                  pools!.map((pool: any) => {
                    const partnerName = pool?.corporate_partners_pmp?.name ?? "—";
                    const partnerSlug = pool?.corporate_partners_pmp?.slug ?? null;
                    const total = typeof pool?.total_amount_cents === "number" ? pool.total_amount_cents : 0;
                    const remaining = typeof pool?.remaining_amount_cents === "number" ? pool.remaining_amount_cents : 0;
                    const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;

                    return (
                      <tr key={pool.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition">
                        <td className="px-5 py-4">
                          <div className="font-medium text-white/90">{pool.source_name ?? "Untitled Pool"}</div>
                          <div className="text-[10px] text-white/25 mt-0.5 font-mono">{pool.id?.slice(0, 12)}…</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-white/70">{partnerName}</div>
                          {partnerSlug && <div className="text-[10px] text-white/30">{partnerSlug}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-block rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/50 ring-1 ring-white/10">
                            {pool.pool_type ?? pool.source_type ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right text-white/70">{money(total)}</td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-[#FFD28F] font-medium">{money(remaining)}</span>
                          <div className="text-[10px] text-white/25 mt-0.5">{pct}% left</div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] ring-1 ${
                            pool.is_active
                              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
                              : "bg-white/5 text-white/30 ring-white/10"
                          }`}>
                            {pool.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-[10px] text-white/20">
          Reads <span className="font-mono">funding_pools</span> where <span className="font-mono">source_type = corporate_partner</span>
        </div>
      </div>
    </main>
  );
}
