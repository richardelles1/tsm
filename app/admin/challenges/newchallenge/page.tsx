// app/admin/challenges/newchallenge/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function toInt(val: FormDataEntryValue | null) {
  if (!val) return null;
  const n = Number(val.toString());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toFloat(val: FormDataEntryValue | null) {
  if (!val) return null;
  const n = Number(val.toString());
  return Number.isFinite(n) ? n : null;
}

function toStr(val: FormDataEntryValue | null) {
  return val ? val.toString().trim() : "";
}

function dollarsToCents(val: FormDataEntryValue | null) {
  const dollars = toFloat(val);
  if (dollars === null) return null;
  const cents = Math.round(dollars * 100);
  return Number.isFinite(cents) ? cents : null;
}

function formatUsdFromCents(cents: number | null | undefined) {
  const safe = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe / 100);
}

// --- SERVER ACTION: create challenge ---
async function createChallengeAction(formData: FormData) {
  "use server";

  const supabase = createSupabaseServerClient();

  // --- REQUIRED ---
  const title = toStr(formData.get("title"));
  const description = toStr(formData.get("description"));
  const activity = toStr(formData.get("activity")); // activity_type enum in DB
  const lane = toStr(formData.get("lane")); // challenge_lane enum in DB (restricted/unrestricted etc)
  const status = toStr(formData.get("status")); // challenge_status enum in DB (open/claimed/etc)

  const distanceMilesRaw = formData.get("distance_miles");
  const amountDollarsRaw = formData.get("amount_dollars");

  const distance_miles = toFloat(distanceMilesRaw);
  const amount_cents = dollarsToCents(amountDollarsRaw);

  const funding_pool_id = toStr(formData.get("funding_pool_id")) || null;

  // --- OPTIONAL MATCH ---
  const corporate_partner_pmp_id = toStr(formData.get("corporate_partner_pmp_id")) || null;
  const match_ratio = toFloat(formData.get("match_ratio")) ?? 1.0;

  // --- OPTIONALS ---
  const slots_total = toInt(formData.get("slots_total")) ?? 1;
  const expires_at = toStr(formData.get("expires_at")) || null;

  // --- Minimal validation (keep it sane, not annoying) ---
  if (!title) throw new Error("Title is required.");
  if (!activity) throw new Error("Activity is required.");
  if (!lane) throw new Error("Lane is required.");
  if (!status) throw new Error("Status is required.");
  if (!funding_pool_id) throw new Error("Funding pool is required.");
  if (distance_miles === null || distance_miles <= 0) throw new Error("Distance must be > 0.");
  if (amount_cents === null || amount_cents <= 0) throw new Error("Amount (USD) must be > 0.");

  // --- COUPLING RULE: nonprofit is derived from the selected funding pool ---
  const { data: poolRow, error: poolErr } = await supabase
    .from("funding_pools")
    .select("id,pool_type,nonprofit_id,source_type,is_active")
    .eq("id", funding_pool_id)
    .maybeSingle();

  if (poolErr) throw new Error(poolErr.message);
  if (!poolRow) throw new Error("Selected funding pool not found.");
  if (!poolRow.is_active) throw new Error("Selected funding pool is not active.");
  if (poolRow.source_type !== "donor") throw new Error("Funding pool must be a donor pool.");

  const nonprofit_id = poolRow.nonprofit_id ?? null;

  // If lane is restricted, the selected pool must be restricted + have a nonprofit_id
  if (lane === "restricted" && (!nonprofit_id || poolRow.pool_type !== "restricted")) {
    throw new Error("Restricted lane requires a restricted donor pool tied to a nonprofit.");
  }

  // If lane is unrestricted, the selected pool must be unrestricted + have nonprofit_id = null
  if (lane === "unrestricted" && (nonprofit_id || poolRow.pool_type !== "unrestricted")) {
    throw new Error("Unrestricted lane requires the unrestricted donor pool.");
  }

  // If a corporate partner is selected, keep it; otherwise null it
  const matchPartnerId = corporate_partner_pmp_id ? corporate_partner_pmp_id : null;

  const { error: insertErr } = await supabase.from("challenges").insert({
    title,
    description: description || null,
    activity,
    distance_miles,
    amount_cents,
    lane,
    nonprofit_id,
    funding_pool_id,
    corporate_partner_pmp_id: matchPartnerId,
    match_ratio: matchPartnerId ? match_ratio : null,
    slots_total,
    slots_claimed: 0,
    status,
    expires_at: expires_at ? expires_at : null,
  });

  if (insertErr) throw new Error(insertErr.message);

  redirect("/challenges");
}

export default async function NewChallengePage() {
  const supabase = createSupabaseServerClient();

  // --- DATA: donor pools (restricted + unrestricted) + nonprofit join for display ---
  const { data: donorPools } = await supabase
    .from("funding_pools")
    .select(
      "id,source_name,pool_type,source_type,nonprofit_id,total_amount_cents,remaining_amount_cents,is_active,nonprofits(name,slug)"
    )
    .eq("source_type", "donor")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // --- DATA: corporate partners (optional matching) ---
  const { data: partners } = await supabase
    .from("corporate_partners_pmp")
    .select("id,name,slug,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // --- STYLE: readable dark-glass form controls (no logic change) ---
  const pageWrap = "p-8 space-y-6 text-neutral-100";
  const muted = "text-sm text-neutral-300/80";
  const card = "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const label = "text-sm font-medium text-neutral-100";
  const input =
    "h-10 rounded-md border border-white/10 bg-black/30 px-3 text-neutral-100 placeholder:text-neutral-400/70 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/15";
  const textarea =
    "min-h-[90px] rounded-md border border-white/10 bg-black/30 px-3 py-2 text-neutral-100 placeholder:text-neutral-400/70 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/15";
  const select =
    "h-10 rounded-md border border-white/10 bg-black/30 px-3 text-neutral-100 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/15";
  const help = "text-xs text-neutral-300/70";

  return (
    <div className={pageWrap}>
      {/* --- HEADER --- */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">New Challenge</h1>
        <p className={muted}>
          Create a challenge that pulls from an existing donor funding pool. Optional partner match can be attached.
        </p>
      </div>

      {/* --- FORM --- */}
      <form action={createChallengeAction} className="space-y-6 max-w-3xl">
        {/* --- Core Fields --- */}
        <div className={`grid grid-cols-1 gap-4 ${card}`}>
          <div className="grid gap-2">
            <label className={label}>Title</label>
            <input name="title" placeholder="Run 3 miles to unlock $25" className={input} required />
          </div>

          <div className="grid gap-2">
            <label className={label}>Description (optional)</label>
            <textarea name="description" placeholder="Short context shown on the board" className={textarea} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <label className={label}>Activity</label>
              <input name="activity" defaultValue="run" className={input} placeholder="run" required />
              <div className={help}>Uses your DB enum (e.g. run, walk, cycle).</div>
            </div>

            <div className="grid gap-2">
              <label className={label}>Distance (miles)</label>
              <input
                name="distance_miles"
                type="number"
                step="0.1"
                min="0.1"
                defaultValue="3"
                className={input}
                required
              />
            </div>

            <div className="grid gap-2">
              <label className={label}>Amount (USD)</label>
              <input
                name="amount_dollars"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue="25.00"
                className={input}
                required
              />
              <div className={help}>We convert USD → cents automatically for the database.</div>
            </div>
          </div>
        </div>

        {/* --- Allocation / Ownership --- */}
        <div className={`grid grid-cols-1 gap-4 ${card}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className={label}>Lane</label>
              <select name="lane" defaultValue="restricted" className={select} required>
                <option value="restricted">restricted</option>
                <option value="unrestricted">unrestricted</option>
              </select>
              <div className={help}>Restricted = tied to a nonprofit pool. Unrestricted = general donor pool.</div>
            </div>

            <div className="grid gap-2">
              <label className={label}>Status</label>
              <select name="status" defaultValue="open" className={select} required>
                <option value="open">open</option>
                <option value="claimed">claimed</option>
                <option value="completed">completed</option>
                <option value="expired">expired</option>
              </select>
            </div>
          </div>

          {/* Nonprofit removed: derived from funding_pool_id */}
          <div className="grid gap-2">
            <label className={label}>Funding Pool (donor)</label>
            <select name="funding_pool_id" defaultValue="" className={select} required>
              <option value="" disabled>
                Select a donor pool…
              </option>
              {(donorPools ?? []).map((p: any) => {
                const npName = p?.nonprofits?.name ?? "Unrestricted";
                const npSlug = p?.nonprofits?.slug ?? "—";
                return (
                  <option key={p.id} value={p.id}>
                    {p.source_name} • {p.pool_type} • {npName} ({npSlug}) • remaining{" "}
                    {formatUsdFromCents(p.remaining_amount_cents)}
                  </option>
                );
              })}
            </select>
            <div className={help}>
              Pool selection determines the nonprofit automatically. No money is deducted at creation — this only links
              the challenge to its pool.
            </div>
          </div>
        </div>

        {/* --- Optional Partner Match --- */}
        <div className={`grid grid-cols-1 gap-4 ${card}`}>
          <div className="text-sm font-medium text-neutral-100">Optional Partner Match</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className={label}>Corporate Partner</label>
              <select name="corporate_partner_pmp_id" defaultValue="" className={select}>
                <option value="">—</option>
                {(partners ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
              <div className={help}>If blank, challenge has no match attached.</div>
            </div>

            <div className="grid gap-2">
              <label className={label}>Match Ratio (MVP: 1.0)</label>
              <input
                name="match_ratio"
                type="number"
                step="0.1"
                min="0"
                defaultValue="1.0"
                className={input}
              />
            </div>
          </div>
        </div>

        {/* --- Lifecycle extras --- */}
        <div className={`grid grid-cols-1 gap-4 ${card}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className={label}>Slots Total</label>
              <input name="slots_total" type="number" step="1" min="1" defaultValue="1" className={input} />
            </div>

            <div className="grid gap-2">
              <label className={label}>Expires At (optional)</label>
              <input name="expires_at" type="datetime-local" className={input} />
              <div className={help}>Stored in DB as timestamp.</div>
            </div>
          </div>
        </div>

        {/* --- SUBMIT --- */}
        <div className="flex items-center gap-3">
          <button className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-white/10">
            Create Challenge
          </button>
          <div className={help}>After creation, you’ll be redirected to the challenge board.</div>
        </div>
      </form>
    </div>
  );
}
