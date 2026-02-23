// app/admin/donorfunds/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatUsdFromCents(cents: number | null | undefined) {
  const safe = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(safe / 100);
}

// Safely read cents from a row even if column names differ across environments.
function getCents(row: any, keys: string[]): number {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "number") return v;
  }
  return 0;
}

export default async function DonorFundsPage() {
  const supabase = createSupabaseServerClient();

  // --- DATA: donor pools only ---
  const { data: pools, error } = await supabase
    .from("funding_pools")
    .select("*")
    .eq("source_type", "donor")
    .order("created_at", { ascending: false });

  // --- DATA: nonprofit name lookup (no joins; avoids schema naming pitfalls) ---
  const nonprofitIds = Array.from(
    new Set((pools ?? []).map((p: any) => p?.nonprofit_id).filter(Boolean))
  );

  const { data: nonprofits } = nonprofitIds.length
    ? await supabase
        .from("nonprofits")
        .select("id,name,slug")
        .in("id", nonprofitIds)
    : { data: [] as any[] };

  const nonprofitById = new Map<string, { name: string; slug: string | null }>();
  (nonprofits ?? []).forEach((n: any) => {
    nonprofitById.set(n.id, { name: n.name, slug: n.slug ?? null });
  });

  // --- rollups (for CEO sanity) ---
  const totalRemainingCents = (pools ?? []).reduce((sum: number, p: any) => {
    const remaining = getCents(p, ["remaining_amount", "remaining_cents", "remaining"]);
    return sum + remaining;
  }, 0);

  return (
    <div className="p-8 space-y-6">
      {/* --- HEADER --- */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Donor Funds</h1>
        <p className="text-sm text-neutral-500">
          Inventory view of donor money currently available in pools. (No partner matching shown here.)
        </p>
        <div className="text-xs text-neutral-500">
          Pools: <span className="font-medium text-neutral-200">{(pools ?? []).length}</span>{" "}
          • Remaining:{" "}
          <span className="font-medium text-neutral-200">{formatUsdFromCents(totalRemainingCents)}</span>
        </div>
      </div>

      {/* --- ERROR STATE --- */}
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Couldn’t load donor funds.</div>
          <div className="mt-1 opacity-80">{error.message}</div>
        </div>
      ) : null}

      {/* --- TABLE --- */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-white/5 text-neutral-200">
            <tr className="border-b border-white/10">
              <th className="text-left p-3">Pool</th>
              <th className="text-left p-3">Nonprofit</th>
              <th className="text-left p-3">Type</th>
              <th className="text-right p-3">Total</th>
              <th className="text-right p-3">Remaining</th>
              <th className="text-center p-3">Active</th>
            </tr>
          </thead>

          <tbody>
            {(pools ?? []).length === 0 ? (
              <tr>
                <td className="p-6 text-neutral-500" colSpan={6}>
                  No donor pools found yet.
                </td>
              </tr>
            ) : (
              (pools ?? []).map((pool: any) => {
                const nonprofitMeta = pool?.nonprofit_id
                  ? nonprofitById.get(pool.nonprofit_id)
                  : null;

                const totalCents = getCents(pool, ["total_amount_cents"]);
const remainingCents = getCents(pool, ["remaining_amount_cents"]);


                return (
                  <tr key={pool.id} className="border-b border-white/10 last:border-b-0">
                    <td className="p-3">
                      <div className="font-medium text-neutral-100">
                        {pool.source_name ?? "Untitled Pool"}
                      </div>
                      <div className="text-xs text-neutral-500">{pool.id}</div>
                    </td>

                    <td className="p-3">
                      <div className="text-sm text-neutral-100">
                        {nonprofitMeta?.name ?? (pool.nonprofit_id ? "Unknown nonprofit" : "—")}
                      </div>
                      {nonprofitMeta?.slug ? (
                        <div className="text-xs text-neutral-500">{nonprofitMeta.slug}</div>
                      ) : pool.nonprofit_id ? (
                        <div className="text-xs text-neutral-500">{pool.nonprofit_id}</div>
                      ) : null}
                    </td>

                    <td className="p-3">
                      <span className="rounded-full border border-white/15 px-2 py-1 text-xs text-neutral-200">
                        {pool.source_type ?? "—"}
                      </span>
                    </td>

                    <td className="p-3 text-right text-neutral-100">
                      {formatUsdFromCents(totalCents)}
                    </td>

                    <td className="p-3 text-right text-neutral-100">
                      {formatUsdFromCents(remainingCents)}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-1 text-xs",
                          pool.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-neutral-100 text-neutral-600",
                        ].join(" ")}
                      >
                        {pool.is_active ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- FOOTNOTE --- */}
      <div className="text-xs text-neutral-500">
        Note: This view reads{" "}
        <code className="px-1 py-0.5 rounded bg-neutral-100">funding_pools</code> where{" "}
        <code className="px-1 py-0.5 rounded bg-neutral-100">source_type</code> is{" "}
        <code className="px-1 py-0.5 rounded bg-neutral-100">donor</code>.
      </div>
    </div>
  );
}
