import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function toFloat(val: FormDataEntryValue | null) {
  if (!val) return null;
  const n = Number(val.toString());
  return Number.isFinite(n) ? n : null;
}

function toStr(val: FormDataEntryValue | null) {
  return val ? val.toString().trim() : "";
}

function toInt(val: FormDataEntryValue | null) {
  if (!val) return null;
  const n = Number(val.toString());
  return Number.isFinite(n) ? Math.trunc(n) : null;
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

async function createChallengeAction(formData: FormData) {
  "use server";

  const supabase = createSupabaseServerClient();

  const title = toStr(formData.get("title"));
  const description = toStr(formData.get("description"));
  const activity = toStr(formData.get("activity"));
  const distanceMilesRaw = formData.get("distance_miles");
  const amountDollarsRaw = formData.get("amount_dollars");
  const distance_miles = toFloat(distanceMilesRaw);
  const amount_cents = dollarsToCents(amountDollarsRaw);
  const funding_pool_id = toStr(formData.get("funding_pool_id")) || null;
  const corporate_partner_pmp_id = toStr(formData.get("corporate_partner_pmp_id")) || null;
  const match_ratio = toFloat(formData.get("match_ratio")) ?? 1.0;
  const slots_total = toInt(formData.get("slots_total")) ?? 1;
  const expires_at = toStr(formData.get("expires_at")) || null;

  if (!title) redirect("/admin/challenges/newchallenge?error=Title+is+required.");
  if (!activity) redirect("/admin/challenges/newchallenge?error=Activity+is+required.");
  if (!funding_pool_id) redirect("/admin/challenges/newchallenge?error=Funding+pool+is+required.");
  if (distance_miles === null || distance_miles <= 0) redirect("/admin/challenges/newchallenge?error=Distance+must+be+greater+than+0.");
  if (amount_cents === null || amount_cents <= 0) redirect("/admin/challenges/newchallenge?error=Amount+must+be+greater+than+0.");

  const { data: poolRow, error: poolErr } = await supabase
    .from("funding_pools")
    .select("id,pool_type,nonprofit_id,source_type,is_active")
    .eq("id", funding_pool_id)
    .maybeSingle();

  if (poolErr) redirect(`/admin/challenges/newchallenge?error=${encodeURIComponent(poolErr.message)}`);
  if (!poolRow) redirect("/admin/challenges/newchallenge?error=Selected+funding+pool+not+found.");
  if (!poolRow.is_active) redirect("/admin/challenges/newchallenge?error=Selected+funding+pool+is+not+active.");
  if (poolRow.source_type !== "donor") redirect("/admin/challenges/newchallenge?error=Funding+pool+must+be+a+donor+pool.");

  const nonprofit_id = poolRow.nonprofit_id ?? null;
  const lane = poolRow.pool_type;
  const matchPartnerId = corporate_partner_pmp_id || null;

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
    status: "open",
    expires_at: expires_at || null,
  });

  if (insertErr) redirect(`/admin/challenges/newchallenge?error=${encodeURIComponent(insertErr.message)}`);

  redirect("/admin/challenges");
}

export default async function NewChallengePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const supabase = createSupabaseServerClient();
  const resolvedParams = await searchParams;
  const errorMsg = resolvedParams?.error ?? null;

  const { data: donorPools } = await supabase
    .from("funding_pools")
    .select("id,source_name,pool_type,source_type,nonprofit_id,total_amount_cents,remaining_amount_cents,is_active,nonprofits(name,slug)")
    .eq("source_type", "donor")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const { data: partners } = await supabase
    .from("corporate_partners_pmp")
    .select("id,name,slug,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const card = "rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5";
  const label = "text-sm font-medium text-neutral-100";
  const input = "w-full h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-neutral-100 placeholder:text-neutral-400/70 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/15 transition";
  const textarea = "w-full min-h-[80px] rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-neutral-100 placeholder:text-neutral-400/70 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/15 transition";
  const selectClass = "w-full h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-neutral-100 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/15 transition";
  const help = "text-xs text-neutral-400/70";

  return (
    <div className="p-6 sm:p-8 space-y-6 text-neutral-100 max-w-2xl">
      <div className="space-y-1">
        <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase">Admin</div>
        <h1 className="text-2xl font-semibold tracking-tight">New Challenge</h1>
        <p className="text-sm text-white/50">
          Challenges pull from an existing donor pool. The nonprofit and lane are set automatically by the pool you select.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 p-4 text-sm text-red-200">
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      <form action={createChallengeAction} className="space-y-5">

        {/* Card 1: Challenge Details */}
        <div className={card}>
          <div className="text-xs font-bold tracking-[0.18em] text-white/30 uppercase">Challenge Details</div>

          <div className="space-y-1.5">
            <label className={label}>Title</label>
            <input name="title" placeholder="Run 3 miles to unlock $25 for City Food Bank" className={input} required />
          </div>

          <div className="space-y-1.5">
            <label className={label}>Description <span className="text-white/30 font-normal">(optional)</span></label>
            <textarea name="description" placeholder="Short context shown on the challenge card" className={textarea} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className={label}>Activity</label>
              <select name="activity" defaultValue="run" className={selectClass} required>
                <option value="run">Run</option>
                <option value="walk">Walk</option>
                <option value="cycle">Cycle</option>
              </select>
            </div>

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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
            </div>
          </div>
        </div>

        {/* Card 2: Pool and Options */}
        <div className={card}>
          <div className="text-xs font-bold tracking-[0.18em] text-white/30 uppercase">Pool and Options</div>

          <div className="space-y-1.5">
            <label className={label}>Funding Pool</label>
            <select name="funding_pool_id" defaultValue="" className={selectClass} required>
              <option value="" disabled>Select a donor pool...</option>
              {(donorPools ?? []).map((p: any) => {
                const npName = p?.nonprofits?.name ?? "Unrestricted";
                return (
                  <option key={p.id} value={p.id}>
                    {p.source_name} — {npName} — {formatUsdFromCents(p.remaining_amount_cents)} remaining
                  </option>
                );
              })}
            </select>
            <div className={help}>
              The nonprofit and lane are set automatically from the pool. No funds are deducted until a challenge is approved.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={label}>Slots</label>
              <input name="slots_total" type="number" step="1" min="1" defaultValue="1" className={input} />
              <div className={help}>How many athletes can claim this challenge.</div>
            </div>

            <div className="space-y-1.5">
              <label className={label}>Expires At <span className="text-white/30 font-normal">(optional)</span></label>
              <input name="expires_at" type="datetime-local" className={input} />
            </div>
          </div>

          <div className="border-t border-white/8 pt-5 space-y-4">
            <div className="text-xs font-bold tracking-[0.18em] text-white/30 uppercase">Match Partner <span className="font-normal normal-case tracking-normal text-white/25">— optional</span></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={label}>Corporate Partner</label>
                <select name="corporate_partner_pmp_id" defaultValue="" className={selectClass}>
                  <option value="">None</option>
                  {(partners ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={label}>Match Multiplier</label>
                <input
                  name="match_ratio"
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue="1.0"
                  className={input}
                />
                <div className={help}>1.0 = 1:1 match. Only applies if a partner is selected.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            className="rounded-full bg-[#FFD28F] px-7 py-3 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_rgba(255,210,143,0.18)]"
          >
            Create Challenge →
          </button>
          <a href="/admin/challenges" className="text-sm text-white/35 hover:text-white/60 transition">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
