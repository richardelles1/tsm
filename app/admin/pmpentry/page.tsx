import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function toStr(val: FormDataEntryValue | null) {
  return val ? val.toString().trim() : "";
}

function toFloat(val: FormDataEntryValue | null) {
  if (!val) return null;
  const n = Number(val.toString());
  return Number.isFinite(n) ? n : null;
}

function dollarsToCents(val: FormDataEntryValue | null) {
  const dollars = toFloat(val);
  if (dollars === null) return null;
  const cents = Math.round(dollars * 100);
  return Number.isFinite(cents) ? cents : null;
}

function money(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${(v / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

async function pmpEntryAction(formData: FormData) {
  "use server";

  const mode = toStr(formData.get("mode")) || "topup";
  const corporate_partner_pmp_id = toStr(formData.get("corporate_partner_pmp_id"));
  const pool_id = toStr(formData.get("pool_id")) || null;
  const amount_cents = dollarsToCents(formData.get("amount_dollars"));
  const source_name = toStr(formData.get("source_name")) || "Partner Funding (ACH/Check)";
  const pool_type = toStr(formData.get("pool_type")) || "partner_match";
  const currency = toStr(formData.get("currency")) || "USD";
  const is_active = (toStr(formData.get("is_active")) || "true") === "true";
  const starts_at = toStr(formData.get("starts_at")) || null;
  const ends_at = toStr(formData.get("ends_at")) || null;

  if (!corporate_partner_pmp_id) throw new Error("Corporate partner is required.");
  if (amount_cents === null || amount_cents <= 0) throw new Error("Amount (USD) must be > 0.");
  if (mode === "topup" && !pool_id) throw new Error("Select a pool to top up.");

  const res = await fetch("http://localhost:5000/api/pmp-entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ mode, corporate_partner_pmp_id, pool_id, amount_cents, source_name, pool_type, currency, is_active, starts_at, ends_at }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "PMP entry failed.");

  redirect("/admin/partnerfunds");
}

export default async function PmpEntryPage({
  searchParams,
}: {
  searchParams?: Promise<{ partner?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const partner = params?.partner;
  const supabase = createSupabaseServerClient();

  const { data: partners } = await supabase
    .from("corporate_partners_pmp")
    .select("id,name,slug,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const selectedPartner = partner || partners?.[0]?.id || "";

  const { data: partnerPools } = await supabase
    .from("funding_pools")
    .select("id,source_name,pool_type,total_amount_cents,remaining_amount_cents,is_active,created_at")
    .eq("source_type", "corporate_partner")
    .eq("corporate_partner_pmp_id", selectedPartner)
    .order("created_at", { ascending: false });

  const selectCls = "w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-3 h-10 text-sm outline-none text-white transition appearance-none";
  const inputCls = "w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-3 h-10 text-sm outline-none text-white placeholder:text-white/25 transition";
  const labelCls = "text-xs text-white/35 font-medium uppercase tracking-wider";

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <div className="text-xs text-white/40 mb-1">Admin</div>
            <h1 className="text-3xl font-semibold tracking-tight">PMP Entry</h1>
            <p className="text-sm text-white/45 mt-1">
              Record partner matching funds. Creates or tops up a corporate partner pool.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/partnerfunds" className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition">
              ← Partner Funds
            </Link>
            <Link href="/admin" className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {/* Partner picker (GET) */}
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5">
            <div className="text-xs font-bold tracking-[0.15em] text-white/35 uppercase mb-3">Select Partner</div>
            <form method="GET" className="flex gap-3">
              <select name="partner" defaultValue={selectedPartner} className={`${selectCls} flex-1`}>
                {(partners ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/15 hover:ring-white/25 transition shrink-0"
              >
                Load Pools
              </button>
            </form>
            <p className="text-xs text-white/25 mt-2">Loads pools for the selected partner only.</p>
          </div>

          {/* Current pools snapshot */}
          {(partnerPools ?? []).length > 0 && (
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5">
              <div className="text-xs font-bold tracking-[0.15em] text-white/35 uppercase mb-3">Current Pools</div>
              <div className="space-y-2">
                {(partnerPools ?? []).slice(0, 6).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/4 ring-1 ring-white/8 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-white/80">{p.source_name}</div>
                      <div className="text-[10px] text-white/30">{p.pool_type} · {p.is_active ? "active" : "inactive"}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-[#FFD28F] font-medium">{money(p.remaining_amount_cents)}</div>
                      <div className="text-[10px] text-white/30">of {money(p.total_amount_cents)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entry form */}
          <form action={pmpEntryAction} className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5 space-y-5">
            <div className="text-xs font-bold tracking-[0.15em] text-white/35 uppercase">Fund Intake Form</div>

            <input type="hidden" name="corporate_partner_pmp_id" value={selectedPartner} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Mode</label>
                <select name="mode" defaultValue="topup" className={selectCls}>
                  <option value="topup">Top up existing pool</option>
                  <option value="create">Create new pool</option>
                </select>
                <p className="text-[10px] text-white/25">Top up adds to total + remaining.</p>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Amount (USD)</label>
                <input name="amount_dollars" type="number" step="0.01" min="0.01" defaultValue="30000.00" className={inputCls} />
                <p className="text-[10px] text-white/25">Converted to cents automatically.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Existing Pool (top-up only)</label>
              <select name="pool_id" defaultValue="" className={selectCls}>
                <option value="">Select a pool…</option>
                {(partnerPools ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.source_name} · remaining {money(p.remaining_amount_cents)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Source / Memo</label>
                <input name="source_name" defaultValue="ACH / Check - Partner Funding" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>Currency</label>
                  <input name="currency" defaultValue="USD" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Pool Type</label>
                  <input name="pool_type" defaultValue="partner_match" className={inputCls} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Active?</label>
                <select name="is_active" defaultValue="true" className={selectCls}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Starts At</label>
                <input name="starts_at" placeholder="2026-01-01T00:00:00Z" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Ends At</label>
                <input name="ends_at" placeholder="2026-12-31T23:59:59Z" className={inputCls} />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-full bg-[#FFD28F] px-6 py-3 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_24px_rgba(255,210,143,0.15)] hover:bg-[#FFB48E] hover:shadow-[0_10px_36px_rgba(255,210,143,0.25)] transition"
            >
              Submit PMP Intake →
            </button>
            <p className="text-xs text-white/25">On success, redirects to Partner Funds inventory.</p>
          </form>
        </div>
      </div>
    </main>
  );
}
