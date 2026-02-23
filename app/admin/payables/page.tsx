// OLD
// (empty file / placeholder)

// NEW
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PayableRow = {
  id: string;
  nonprofit_id: string | null;
  release_id: string | null;
  amount_cents: number | null;
  matched_amount_cents: number | null;
  total_cents: number | null;
  status: string | null;
  paid_at: string | null;
  provider: string | null;
  provider_ref: string | null;
  note: string | null;
  created_at: string | null;

  nonprofits?: {
    name?: string | null;
    slug?: string | null;
  } | null;

  releases?: {
    released_at?: string | null;
    created_at?: string | null;
    claim_id?: string | null;
    challenge_id?: string | null;
  } | null;
};

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${Math.round(v / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

export default async function AdminPayablesPage() {
  const admin = createSupabaseServerClient();

  // Pull unpaid payables; group client-side for flexibility + drilldown UI
  const { data, error } = await admin
    .from("payables")
    .select(
      `
      id,
      nonprofit_id,
      release_id,
      amount_cents,
      matched_amount_cents,
      total_cents,
      status,
      paid_at,
      provider,
      provider_ref,
      note,
      created_at,
      nonprofits ( name, slug ),
      releases ( released_at, created_at, claim_id, challenge_id )
    `
    )
    .neq("status", "paid")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as PayableRow[];

  // Group by nonprofit
  const byNonprofit = new Map<
    string,
    {
      nonprofit_id: string;
      name: string;
      slug: string | null;
      totalOwedCents: number;
      count: number;
      oldest: string | null;
      newest: string | null;
      items: PayableRow[];
    }
  >();

  for (const r of rows) {
    const nid = r.nonprofit_id ?? "unknown";
    const name = r.nonprofits?.name ?? "Unknown Nonprofit";
    const slug = r.nonprofits?.slug ?? null;

    const created = r.created_at ?? null;
    const total = typeof r.total_cents === "number" ? r.total_cents : 0;

    if (!byNonprofit.has(nid)) {
      byNonprofit.set(nid, {
        nonprofit_id: nid,
        name,
        slug,
        totalOwedCents: 0,
        count: 0,
        oldest: created,
        newest: created,
        items: [],
      });
    }

    const g = byNonprofit.get(nid)!;
    g.totalOwedCents += total;
    g.count += 1;
    g.items.push(r);

    // Oldest/Newest
    if (created) {
      if (!g.oldest || new Date(created) < new Date(g.oldest)) g.oldest = created;
      if (!g.newest || new Date(created) > new Date(g.newest)) g.newest = created;
    }
  }

  const groups = Array.from(byNonprofit.values()).sort(
    (a, b) => b.totalOwedCents - a.totalOwedCents
  );

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm text-white/60">Admin</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Payables Queue
            </h1>
            <p className="mt-2 text-sm text-white/65 max-w-2xl">
              One row per nonprofit. This is the “who we owe + how much” surface. Drill down shows the
              underlying payable rows (each tied to a release). If it’s not here, it isn’t owed.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              ← Admin Home
            </Link>
            <Link
              href="/admin/releases"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
            >
              Releases Ledger →
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
            {error.message}
          </div>
        ) : null}

        <div className="mt-8 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_34px_10px_rgba(0,0,0,0.30)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="text-sm text-white/70">
              {groups.length === 0
                ? "No unpaid payables 🎉"
                : `Showing ${groups.length} nonprofits with unpaid payables`}
            </div>
            <div className="text-xs text-white/50">
              Tip: This should reconcile with pool remaining + release totals.
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs text-white/55 border-b border-white/10">
            <div className="col-span-4">Nonprofit</div>
            <div className="col-span-2">Total Owed</div>
            <div className="col-span-2"># Payables</div>
            <div className="col-span-2">Oldest</div>
            <div className="col-span-2">Newest</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/10">
            {groups.map((g) => (
              <details key={g.nonprofit_id} className="group">
                <summary className="list-none cursor-pointer">
                  <div className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-white/5 transition">
                    <div className="col-span-4 min-w-0">
                      <div className="font-medium truncate">{g.name}</div>
                      <div className="text-xs text-white/45 truncate">
                        {g.slug ? g.slug : g.nonprofit_id === "unknown" ? "unknown" : shortId(g.nonprofit_id)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="inline-flex items-center rounded-full bg-[#FFD28F]/10 px-2 py-1 text-xs text-[#FFD28F] ring-1 ring-[#FFD28F]/20">
                        {money(g.totalOwedCents)}
                      </span>
                    </div>
                    <div className="col-span-2 text-white/80">{g.count}</div>
                    <div className="col-span-2 text-white/70">{fmtDate(g.oldest)}</div>
                    <div className="col-span-2 text-white/70">{fmtDate(g.newest)}</div>
                  </div>
                </summary>

                {/* Expanded */}
                <div className="px-6 pb-5">
                  <div className="mt-2 rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                    <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[11px] text-white/55 border-b border-white/10">
                      <div className="col-span-2">Created</div>
                      <div className="col-span-2">Base</div>
                      <div className="col-span-2">Match</div>
                      <div className="col-span-2">Total</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">IDs</div>
                    </div>

                    <div className="divide-y divide-white/10">
                      {g.items
                        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
                        .map((p) => (
                          <div key={p.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                            <div className="col-span-2 text-white/70">
                              <div>{fmtDate(p.created_at)}</div>
                              <div className="text-[11px] text-white/45">
                                rel {fmtDate(p.releases?.released_at ?? null)}
                              </div>
                            </div>

                            <div className="col-span-2">
                              <span className="rounded-full bg-white/5 px-2 py-1 text-xs ring-1 ring-white/10">
                                {money(p.amount_cents)}
                              </span>
                            </div>

                            <div className="col-span-2">
                              <span className="rounded-full bg-white/5 px-2 py-1 text-xs ring-1 ring-white/10">
                                {money(p.matched_amount_cents)}
                              </span>
                            </div>

                            <div className="col-span-2">
                              <span className="rounded-full bg-[#FFD28F]/10 px-2 py-1 text-xs text-[#FFD28F] ring-1 ring-[#FFD28F]/20">
                                {money(p.total_cents)}
                              </span>
                            </div>

                            <div className="col-span-2 text-white/75">
                              {p.status ?? "—"}
                              {p.paid_at ? (
                                <div className="text-[11px] text-white/45">paid {fmtDate(p.paid_at)}</div>
                              ) : null}
                            </div>

                            <div className="col-span-2 text-[11px] text-white/55">
                              <div>pay {shortId(p.id)}</div>
                              <div>rel {shortId(p.release_id)}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-white/45">
                    Read-only view. Any payout action should be a separate “payout engine” step (so we don’t mutate money
                    states from the UI).
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
