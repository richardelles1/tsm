import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function money(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${(v / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCents(row: any, keys: string[]): number {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "number") return v;
  }
  return 0;
}

export default async function DonorFundsPage() {
  const supabase = createSupabaseServerClient();

  const { data: pools, error } = await supabase
    .from("funding_pools")
    .select("*")
    .eq("source_type", "donor")
    .order("created_at", { ascending: false });

  const nonprofitIds = Array.from(
    new Set((pools ?? []).map((p: any) => p?.nonprofit_id).filter(Boolean))
  );

  const { data: nonprofits } = nonprofitIds.length
    ? await supabase.from("nonprofits").select("id,name,slug").in("id", nonprofitIds)
    : { data: [] as any[] };

  const nonprofitById = new Map<string, { name: string; slug: string | null }>();
  (nonprofits ?? []).forEach((n: any) => nonprofitById.set(n.id, { name: n.name, slug: n.slug ?? null }));

  const totalRemaining = (pools ?? []).reduce((sum: number, p: any) => {
    return sum + getCents(p, ["remaining_amount_cents"]);
  }, 0);

  const totalFunded = (pools ?? []).reduce((sum: number, p: any) => {
    return sum + getCents(p, ["total_amount_cents"]);
  }, 0);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.18),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <div className="text-xs text-white/40 mb-1">Admin</div>
            <h1 className="text-3xl font-semibold tracking-tight">Donor Funds</h1>
            <p className="text-sm text-white/45 mt-1">
              Donor capital available across all pools.
            </p>
          </div>
          <Link href="/admin" className="self-start sm:self-auto rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition">
            ← Dashboard
          </Link>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Pools</div>
            <div className="text-2xl font-bold">{(pools ?? []).length}</div>
          </div>
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Total Funded</div>
            <div className="text-2xl font-bold text-[#FFD28F]">{money(totalFunded)}</div>
          </div>
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Remaining</div>
            <div className="text-2xl font-bold text-[#C4EBF2]">{money(totalRemaining)}</div>
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
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Nonprofit</th>
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
                      No donor pools found yet.
                    </td>
                  </tr>
                ) : (
                  (pools ?? []).map((pool: any) => {
                    const np = pool?.nonprofit_id ? nonprofitById.get(pool.nonprofit_id) : null;
                    const totalCents = getCents(pool, ["total_amount_cents"]);
                    const remainingCents = getCents(pool, ["remaining_amount_cents"]);
                    const pct = totalCents > 0 ? Math.round((remainingCents / totalCents) * 100) : 0;

                    return (
                      <tr key={pool.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition">
                        <td className="px-5 py-4">
                          <div className="font-medium text-white/90">{pool.source_name ?? "Untitled Pool"}</div>
                          <div className="text-[10px] text-white/25 mt-0.5 font-mono">{pool.id?.slice(0, 12)}…</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-white/70">{np?.name ?? (pool.nonprofit_id ? "Unknown" : "Unrestricted")}</div>
                          {np?.slug && <div className="text-[10px] text-white/30">{np.slug}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-block rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/50 ring-1 ring-white/10">
                            {pool.pool_type ?? pool.source_type ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right text-white/70">{money(totalCents)}</td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-[#FFD28F] font-medium">{money(remainingCents)}</span>
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
          Reads <span className="font-mono">funding_pools</span> where <span className="font-mono">source_type = donor</span>
        </div>
      </div>
    </main>
  );
}
