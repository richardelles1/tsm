// app/admin/partnerfunds/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatUsdFromCents(cents: number | null | undefined) {
  const safe = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(safe / 100);
}

export default async function PartnerFundsPage() {
  const supabase = createSupabaseServerClient();

  // --- DATA: corporate partner pools only ---
  // Join partner so the table is readable (name + slug like DonorFunds does for nonprofits)
  const { data: pools, error } = await supabase
    .from("funding_pools")
    .select(
      `
      id,
      pool_type,
      source_name,
      source_type,
      corporate_partner_pmp_id,
      total_amount_cents,
      remaining_amount_cents,
      currency,
      is_active,
      created_at,
      corporate_partners_pmp:corporate_partner_pmp_id (
        id,
        name,
        slug
      )
    `
    )
    .eq("source_type", "corporate_partner")
    .order("created_at", { ascending: false });

  const poolCount = (pools ?? []).length;
  const remainingSum = (pools ?? []).reduce((sum: number, p: any) => {
    const v = typeof p?.remaining_amount_cents === "number" ? p.remaining_amount_cents : 0;
    return sum + v;
  }, 0);

  return (
    <div className="p-8 space-y-6">
      {/* --- HEADER --- */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Partner Funds</h1>
        <p className="text-sm text-neutral-500">
          Inventory view of corporate partner money currently available in pools. (No donor pools shown here.)
        </p>

        {/* Match DonorFunds summary line */}
        {!error ? (
          <div className="text-xs text-neutral-500">
            Pools: <span className="font-medium">{poolCount}</span> • Remaining:{" "}
            <span className="font-medium">{formatUsdFromCents(remainingSum)}</span>
          </div>
        ) : null}
      </div>

      {/* --- ERROR STATE --- */}
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Couldn’t load partner funds.</div>
          <div className="mt-1 opacity-80">{error.message}</div>
        </div>
      ) : null}

      {/* --- TABLE --- */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-neutral-50">
            <tr className="border-b">
              <th className="text-left p-3">Pool</th>
              <th className="text-left p-3">Partner</th>
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
                  No partner pools found yet.
                </td>
              </tr>
            ) : (
              pools!.map((pool: any) => {
                const partnerName = pool?.corporate_partners_pmp?.name ?? "—";
                const partnerSlug = pool?.corporate_partners_pmp?.slug ?? null;

                return (
                  <tr key={pool.id} className="border-b last:border-b-0">
                    <td className="p-3">
                      <div className="font-medium">{pool.source_name ?? "Untitled Pool"}</div>
                      <div className="text-xs text-neutral-500">{pool.id}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-medium">{partnerName}</div>
                      <div className="text-xs text-neutral-500">
                        {partnerSlug ? partnerSlug : pool.corporate_partner_pmp_id ?? "—"}
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="rounded-full border px-2 py-1 text-xs">
                        {pool.source_type}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      {formatUsdFromCents(pool.total_amount_cents)}
                    </td>

                    <td className="p-3 text-right">
                      {formatUsdFromCents(pool.remaining_amount_cents)}
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
        <code className="px-1 py-0.5 rounded bg-neutral-100">corporate_partner</code>.
      </div>
    </div>
  );
}
