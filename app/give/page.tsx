// app/give/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function dollarsToCents(input: string) {
  const normalized = input.replace(/[^0-9.]/g, "");
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

async function getOrCreateDonorPool(params: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  nonprofitId: string | null;
  poolType: "restricted" | "unrestricted";
  poolName: string;
}) {
  const { supabase, nonprofitId, poolType, poolName } = params;

  // Try to find an existing active donor pool for this nonprofit (or unrestricted = nonprofit_id null)
  const query = supabase
  .from("funding_pools")
  .select("id,total_amount_cents,remaining_amount_cents,source_name,is_active")
  .eq("source_type", "donor")
  .eq("pool_type", poolType)
  .eq("is_active", true)
  .limit(1);

const { data: existing, error: findErr } =
  nonprofitId
    ? await query.eq("nonprofit_id", nonprofitId).maybeSingle()
    : await query.is("nonprofit_id", null).maybeSingle();


  if (findErr) throw new Error(findErr.message);
  if (existing) return existing;

  // Create a new donor pool
  const { data: created, error: createErr } = await supabase
    .from("funding_pools")
    .insert({
      pool_type: poolType,
      source_name: poolName,
      source_type: "donor",
      nonprofit_id: nonprofitId,
      total_amount_cents: 0,
      remaining_amount_cents: 0,
      currency: "USD",
      is_active: true,
    })
    .select("id,total_amount_cents,remaining_amount_cents,source_name,is_active")
    .single();

  if (createErr) throw new Error(createErr.message);
  return created;
}

export default async function GivePage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; err?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const supabase = createSupabaseServerClient();

  // Load nonprofits for dropdown
  const { data: nonprofits, error: npErr } = await supabase
    .from("nonprofits")
    .select("id,name,slug,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  async function simulateDonation(formData: FormData) {
    "use server";

    const supabase = createSupabaseServerClient();

    const donorName = String(formData.get("donor_name") ?? "").trim() || null;
    const donorEmail = String(formData.get("donor_email") ?? "").trim() || null;

    const amountInput = String(formData.get("amount") ?? "");
    const amountCents = dollarsToCents(amountInput);
    if (!amountCents) redirect("/give?err=Invalid%20amount");

    const nonprofitIdRaw = String(formData.get("nonprofit_id") ?? "");
    const nonprofitId = nonprofitIdRaw === "unrestricted" ? null : nonprofitIdRaw;

    // Determine pool behavior
    let poolType: "restricted" | "unrestricted" = nonprofitId ? "restricted" : "unrestricted";

    // Lookup nonprofit name for better pool naming (optional)
    let poolName = nonprofitId ? "Restricted Donor Pool" : "Unrestricted Donor Pool";
    if (nonprofitId) {
      const { data: np } = await supabase
        .from("nonprofits")
        .select("name,slug")
        .eq("id", nonprofitId)
        .maybeSingle();

      if (np?.name) poolName = `${np.name} Donor Pool`;
    }

    // 1) Find/create pool
    const pool = await getOrCreateDonorPool({
      supabase,
      nonprofitId,
      poolType,
      poolName,
    });

    // 2) Update pool balances (simulation-friendly, not transactional)
    const newTotal = (pool.total_amount_cents ?? 0) + amountCents;
    const newRemaining = (pool.remaining_amount_cents ?? 0) + amountCents;

    const { error: poolUpdateErr } = await supabase
      .from("funding_pools")
      .update({
        total_amount_cents: newTotal,
        remaining_amount_cents: newRemaining,
      })
      .eq("id", pool.id);

    if (poolUpdateErr) redirect(`/give?err=${encodeURIComponent(poolUpdateErr.message)}`);

    // 3) Insert donation record (inbound ledger)
    const { error: donationErr } = await supabase.from("donations").insert({
      donor_name: donorName,
      donor_email: donorEmail,
      amount_cents: amountCents,
      currency: "USD",
      nonprofit_id: nonprofitId,
      funding_pool_id: pool.id,
      provider: "manual",
      status: "received",
    });

    if (donationErr) redirect(`/give?err=${encodeURIComponent(donationErr.message)}`);

    redirect("/give?ok=1");
  }

  return (
    <div className="p-8 space-y-6">
      {/* --- HEADER --- */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Give (Simulation)</h1>
        <p className="text-sm text-neutral-500">
          Create a donation record and credit a donor funding pool. This will be replaced by checkout later.
        </p>
      </div>

      {/* --- STATUS --- */}
      {sp.ok ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-semibold">Donation recorded.</div>
          <div className="mt-1 opacity-80">Pool balance updated.</div>
        </div>
      ) : null}

      {sp.err ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Couldn’t record donation.</div>
          <div className="mt-1 opacity-80">{sp.err}</div>
        </div>
      ) : null}

      {/* --- FORM --- */}
      <form action={simulateDonation} className="space-y-4 rounded-xl border p-6 max-w-xl">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nonprofit</label>
          <select
            name="nonprofit_id"
            className="w-full rounded-md border bg-transparent p-2 text-sm"
            defaultValue="unrestricted"
          >
            <option value="unrestricted">Unrestricted (general donor pool)</option>
            {(nonprofits ?? []).map((n: any) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.slug})
              </option>
            ))}
          </select>
          {npErr ? <p className="text-xs text-red-600">{npErr.message}</p> : null}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Amount (USD)</label>
          <input
            name="amount"
            placeholder="25.00"
            className="w-full rounded-md border bg-transparent p-2 text-sm"
            required
          />
          <p className="text-xs text-neutral-500">Stored as cents. Example: 25.00 → 2500.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Donor name (optional)</label>
            <input
              name="donor_name"
              placeholder="Jane Doe"
              className="w-full rounded-md border bg-transparent p-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Donor email (optional)</label>
            <input
              name="donor_email"
              placeholder="jane@email.com"
              className="w-full rounded-md border bg-transparent p-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Simulate Donation
        </button>
      </form>

      {/* --- FOOTNOTE --- */}
      <div className="text-xs text-neutral-500">
        Writes to <code className="px-1 py-0.5 rounded bg-neutral-100">donations</code> and increments{" "}
        <code className="px-1 py-0.5 rounded bg-neutral-100">funding_pools.total_amount_cents</code> +{" "}
        <code className="px-1 py-0.5 rounded bg-neutral-100">funding_pools.remaining_amount_cents</code>.
      </div>
    </div>
  );
}
