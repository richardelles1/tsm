import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DonationForm from "@/components/DonationForm";

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

  const query = supabase
    .from("funding_pools")
    .select("id,total_amount_cents,remaining_amount_cents,source_name,is_active")
    .eq("source_type", "donor")
    .eq("pool_type", poolType)
    .eq("is_active", true)
    .limit(1);

  const { data: existing, error: findErr } = nonprofitId
    ? await query.eq("nonprofit_id", nonprofitId).maybeSingle()
    : await query.is("nonprofit_id", null).maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (existing) return existing;

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

  const { data: nonprofits } = await supabase
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
    const poolType: "restricted" | "unrestricted" = nonprofitId ? "restricted" : "unrestricted";

    let poolName = nonprofitId ? "Restricted Donor Pool" : "Unrestricted Donor Pool";
    if (nonprofitId) {
      const { data: np } = await supabase.from("nonprofits").select("name").eq("id", nonprofitId).maybeSingle();
      if (np?.name) poolName = `${np.name} Donor Pool`;
    }

    const pool = await getOrCreateDonorPool({ supabase, nonprofitId, poolType, poolName });
    const newTotal = (pool.total_amount_cents ?? 0) + amountCents;
    const newRemaining = (pool.remaining_amount_cents ?? 0) + amountCents;

    const { error: poolUpdateErr } = await supabase
      .from("funding_pools")
      .update({ total_amount_cents: newTotal, remaining_amount_cents: newRemaining })
      .eq("id", pool.id);

    if (poolUpdateErr) redirect(`/give?err=${encodeURIComponent(poolUpdateErr.message)}`);

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
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.12),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-300px] left-[-150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.10),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-xl px-5 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase">The Shared Mile</div>
          <Link href="/challenges" className="rounded-full bg-[#0D1326] px-4 py-2 text-xs ring-1 ring-white/10 hover:ring-white/20 transition">
            ← Challenges
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Fuel the <span className="text-[#FFD28F]">movement.</span>
          </h1>
          <p className="mt-2 text-sm text-white/50 max-w-sm leading-relaxed">
            Your donation goes into a dedicated pool. Athletes unlock it through verified physical activity.
          </p>
        </div>

        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 sm:p-7">
          <DonationForm
            nonprofits={(nonprofits ?? []).map((n: any) => ({ id: n.id, name: n.name, slug: n.slug ?? null }))}
            submitAction={simulateDonation}
            successMessage={!!sp.ok}
            errorMessage={sp.err ?? null}
          />
        </div>

        <p className="mt-6 text-[10px] text-white/20 text-center">
          This is a simulation. Real Stripe payment processing coming soon.
        </p>
      </div>
    </main>
  );
}
