// app/admin/pmpentry/page.tsx
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

function formatUsdFromCents(cents: number | null | undefined) {
  const safe = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe / 100);
}

// --- SERVER ACTION: partner funds intake (API-backed) ---
async function pmpEntryAction(formData: FormData) {
  "use server";

  // --- Inputs ---
  const mode = toStr(formData.get("mode")) || "topup"; // topup | create
  const corporate_partner_pmp_id = toStr(formData.get("corporate_partner_pmp_id"));
  const pool_id = toStr(formData.get("pool_id")) || null;

  const amount_cents = dollarsToCents(formData.get("amount_dollars"));
  const source_name = toStr(formData.get("source_name")) || "Partner Funding (ACH/Check)";
  const pool_type = toStr(formData.get("pool_type")) || "partner_match";
  const currency = toStr(formData.get("currency")) || "USD";
  const is_active = (toStr(formData.get("is_active")) || "true") === "true";
  const starts_at = toStr(formData.get("starts_at")) || null;
  const ends_at = toStr(formData.get("ends_at")) || null;

  // --- Validation (minimal, sane) ---
  if (!corporate_partner_pmp_id) throw new Error("Corporate partner is required.");
  if (amount_cents === null || amount_cents <= 0) throw new Error("Amount (USD) must be > 0.");
  if (mode === "topup" && !pool_id) throw new Error("Select a pool to top up.");

  // --- API call (single mutation point) ---
  // Use absolute origin for dev; we can upgrade to dynamic origin later.
  const res = await fetch("http://localhost:3000/api/pmp-entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      mode,
      corporate_partner_pmp_id,
      pool_id,
      amount_cents,
      source_name,
      pool_type,
      currency,
      is_active,
      starts_at,
      ends_at,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = typeof json?.error === "string" ? json.error : "PMP entry failed.";
    throw new Error(msg);
  }

  redirect("/admin/partnerfunds");
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ partner?: string }>
}) {
  const params = searchParams ? await searchParams : undefined
  const partner = params?.partner

  const supabase = createSupabaseServerClient();

  // --- DATA: partners ---
  const { data: partners } = await supabase
    .from("corporate_partners_pmp")
    .select("id,name,slug,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const selectedPartner = partner || partners?.[0]?.id || "";

  // --- DATA: partner pools (inventory for the selected partner only) ---
  const { data: partnerPools } = await supabase
    .from("funding_pools")
    .select("id,source_name,pool_type,total_amount_cents,remaining_amount_cents,is_active,created_at")
    .eq("source_type", "corporate_partner")
    .eq("corporate_partner_pmp_id", selectedPartner)
    .order("created_at", { ascending: false });

  // --- STYLE (match your admin vibe) ---
  const pageWrap = "p-8 space-y-6 text-neutral-100";
  const muted = "text-sm text-neutral-300/80";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const label = "text-sm font-medium text-neutral-100";
  const input =
    "h-10 rounded-md border border-white/10 bg-black/30 px-3 text-neutral-100 placeholder:text-neutral-400/70 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/15";
  const select =
    "h-10 rounded-md border border-white/10 bg-black/30 px-3 text-neutral-100 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/15";
  const help = "text-xs text-neutral-300/70";

  return (
    <div className={pageWrap}>
      {/* --- HEADER --- */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">PMP Entry</h1>
        <p className={muted}>
          Partner matching funds intake. Creates or tops up a{" "}
          <span className="font-mono bg-white/10 px-2 py-0.5 rounded">corporate_partner</span> funding pool.
        </p>
        <p className={help}>
          This page calls <span className="font-mono">/api/pmp-entry</span>. No direct DB mutation here.
        </p>
      </div>

      {/* --- PARTNER PICKER (GET) --- */}
      <form method="GET" className={`max-w-3xl ${card}`}>
        <div className="grid gap-2">
          <label className={label}>Corporate Partner</label>
          <div className="flex gap-3">
            <select name="partner" defaultValue={selectedPartner} className={`${select} flex-1`}>
              {(partners ?? []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
            <button className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-white/10">
              Load Pools
            </button>
          </div>
          <div className={help}>Loads pools for the selected partner only.</div>
        </div>
      </form>

      {/* --- ENTRY FORM (POST server action) --- */}
      <form action={pmpEntryAction} className="space-y-6 max-w-3xl">
        <div className={card}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className={label}>Mode</label>
              <select name="mode" defaultValue="topup" className={select}>
                <option value="topup">Top up existing pool</option>
                <option value="create">Create new pool</option>
              </select>
              <div className={help}>Top up adds to total + remaining. Create makes a fresh pool row.</div>
            </div>

            <div className="grid gap-2">
              <label className={label}>Amount (USD)</label>
              <input
                name="amount_dollars"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue="30000.00"
                className={input}
              />
              <div className={help}>Converted to cents automatically.</div>
            </div>
          </div>

          {/* Hidden partner binding */}
          <input type="hidden" name="corporate_partner_pmp_id" value={selectedPartner} />

          <div className="mt-4 grid gap-2">
            <label className={label}>Existing Pool (top-up only)</label>
            <select name="pool_id" defaultValue="" className={select}>
              <option value="">Select a pool…</option>
              {(partnerPools ?? []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.source_name} • remaining {formatUsdFromCents(p.remaining_amount_cents)} • total{" "}
                  {formatUsdFromCents(p.total_amount_cents)}
                </option>
              ))}
            </select>
            <div className={help}>Only pools for the loaded partner appear here.</div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className={label}>Source / Memo</label>
              <input name="source_name" defaultValue="ACH / Check - Partner Funding" className={input} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className={label}>currency</label>
                <input name="currency" defaultValue="USD" className={input} />
              </div>
              <div className="grid gap-2">
                <label className={label}>pool_type (create only)</label>
                <input name="pool_type" defaultValue="partner_match" className={input} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <label className={label}>Active? (create only)</label>
              <select name="is_active" defaultValue="true" className={select}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className={label}>starts_at (optional)</label>
              <input name="starts_at" placeholder="2026-01-01T00:00:00Z" className={input} />
            </div>
            <div className="grid gap-2">
              <label className={label}>ends_at (optional)</label>
              <input name="ends_at" placeholder="2026-12-31T23:59:59Z" className={input} />
            </div>
          </div>
        </div>

        {/* --- SUBMIT --- */}
        <div className="flex items-center gap-3">
          <button className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-white/10">
            Submit PMP Intake
          </button>
          <div className={help}>On success, redirects to Partner Funds inventory.</div>
        </div>

        {/* --- CURRENT POOLS SNAPSHOT --- */}
        <div className={`${card}`}>
          <div className="text-sm font-medium text-neutral-100">Loaded Partner Pools</div>
          <div className="mt-3 grid gap-2">
            {(partnerPools ?? []).length === 0 ? (
              <div className={help}>No pools found for this partner yet. Use “Create new pool”.</div>
            ) : (
              (partnerPools ?? []).slice(0, 8).map((p: any) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <div className="min-w-[280px]">
                    <div className="font-medium">{p.source_name}</div>
                    <div className={help}>
                      {p.pool_type} • {p.is_active ? "active" : "inactive"} • {p.id}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-neutral-300/80">Total:</span>{" "}
                    <span className="font-mono">{formatUsdFromCents(p.total_amount_cents)}</span>{" "}
                    <span className="mx-2 text-neutral-500">|</span>
                    <span className="text-neutral-300/80">Remaining:</span>{" "}
                    <span className="font-mono">{formatUsdFromCents(p.remaining_amount_cents)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
