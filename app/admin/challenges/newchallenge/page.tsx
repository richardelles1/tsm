import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewChallengeForm from "@/components/NewChallengeForm";

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

async function createChallengeAction(formData: FormData) {
  "use server";

  const supabase = createSupabaseServerClient();

  const title = toStr(formData.get("title"));
  const description = toStr(formData.get("description"));
  const activity = toStr(formData.get("activity"));
  const distance_miles = toFloat(formData.get("distance_miles"));
  const amount_cents = dollarsToCents(formData.get("amount_dollars"));
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
    .select("id,source_name,pool_type,source_type,nonprofit_id,remaining_amount_cents,is_active,nonprofits(name)")
    .eq("source_type", "donor")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const { data: partners } = await supabase
    .from("corporate_partners_pmp")
    .select("id,name,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <div className="p-6 sm:p-8 space-y-6 text-neutral-100 max-w-2xl">
      <div className="space-y-1">
        <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase">Admin</div>
        <h1 className="text-2xl font-semibold tracking-tight">New Challenge</h1>
        <p className="text-sm text-white/50">
          Challenges pull from an existing donor pool. The nonprofit and lane are set automatically by the pool you select.
        </p>
      </div>

      <NewChallengeForm
        donorPools={(donorPools ?? []) as any}
        partners={(partners ?? []) as any}
        action={createChallengeAction}
        errorMsg={errorMsg}
      />
    </div>
  );
}
