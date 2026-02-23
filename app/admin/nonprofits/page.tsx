// NEW
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type NonprofitRow = {
  id: string;
  name: string | null;
  slug: string | null;
  website_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type PayableMini = {
  nonprofit_id: string | null;
  total_cents: number | null;
  status: string | null;
  created_at: string | null;
  paid_at: string | null;
};

type ReleaseMini = {
  nonprofit_id: string | null;
  amount_cents: number | null;
  matched_amount_cents: number | null;
  released_at: string | null;
  created_at: string | null;
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

export default async function AdminNonprofitsPage() {
  const admin = createSupabaseServerClient();

  const [{ data: nonprofits, error: npErr }, { data: payables, error: pErr }, { data: releases, error: rErr }] =
    await Promise.all([
      admin
        .from("nonprofits")
        .select("id, name, slug, website_url, contact_name, contact_email, is_active, created_at")
        .order("created_at", { ascending: false }),
      admin
        .from("payables")
        .select("nonprofit_id, total_cents, status, created_at, paid_at")
        .order("created_at", { ascending: false }),
      admin
        .from("releases")
        .select("nonprofit_id, amount_cents, matched_amount_cents, released_at, created_at")
        .order("created_at", { ascending: false }),
    ]);

  const error = npErr || pErr || rErr;

  const npRows = (nonprofits ?? []) as NonprofitRow[];
  const pRows = (payables ?? []) as PayableMini[];
  const rRows = (releases ?? []) as ReleaseMini[];

  // Aggregate per nonprofit
  const agg = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string | null;
      website_url: string | null;
      contact_name: string | null;
      contact_email: string | null;
      is_active: boolean;
      created_at: string | null;

      releasesCount: number;
      lifetimeReleasedCents: number;
      lastReleaseAt: string | null;

      unpaidPayablesCount: number;
      unpaidOwedCents: number;
      oldestUnpaid: string | null;
      newestUnpaid: string | null;

      paidCount: number;
      paidOutCents: number;
      lastPaidAt: string | null;
    }
  >();

  for (const n of npRows) {
    agg.set(n.id, {
      id: n.id,
      name: n.name ?? "Unnamed Nonprofit",
      slug: n.slug ?? null,
      website_url: n.website_url ?? null,
      contact_name: n.contact_name ?? null,
      contact_email: n.contact_email ?? null,
      is_active: Boolean(n.is_active),
      created_at: n.created_at ?? null,

      releasesCount: 0,
      lifetimeReleasedCents: 0,
      lastReleaseAt: null,

      unpaidPayablesCount: 0,
      unpaidOwedCents: 0,
      oldestUnpaid: null,
      newestUnpaid: null,

      paidCount: 0,
      paidOutCents: 0,
      lastPaidAt: null,
    });
  }

  // Releases → lifetime totals (truth surface)
  for (const r of rRows) {
    const nid = r.nonprofit_id;
    if (!nid || !agg.has(nid)) continue;

    const base = typeof r.amount_cents === "number" ? r.amount_cents : 0;
    const match = typeof r.matched_amount_cents === "number" ? r.matched_amount_cents : 0;
    const total = base + match;

    const g = agg.get(nid)!;
    g.releasesCount += 1;
    g.lifetimeReleasedCents += total;

    const t = r.released_at ?? r.created_at ?? null;
    if (t && (!g.lastReleaseAt || new Date(t) > new Date(g.lastReleaseAt))) g.lastReleaseAt = t;
  }

  // Payables → owed vs paid out
  for (const p of pRows) {
    const nid = p.nonprofit_id;
    if (!nid || !agg.has(nid)) continue;

    const total = typeof p.total_cents === "number" ? p.total_cents : 0;
    const g = agg.get(nid)!;

    const isPaid = (p.status ?? "").toLowerCase() === "paid";

    if (isPaid) {
      g.paidCount += 1;
      g.paidOutCents += total;

      const t = p.paid_at ?? null;
      if (t && (!g.lastPaidAt || new Date(t) > new Date(g.lastPaidAt))) g.lastPaidAt = t;
    } else {
      g.unpaidPayablesCount += 1;
      g.unpaidOwedCents += total;

      const created = p.created_at ?? null;
      if (created) {
        if (!g.oldestUnpaid || new Date(created) < new Date(g.oldestUnpaid)) g.oldestUnpaid = created;
        if (!g.newestUnpaid || new Date(created) > new Date(g.newestUnpaid)) g.newestUnpaid = created;
      }
    }
  }

  const rows = Array.from(agg.values()).sort((a, b) => {
    // Priority: who we currently owe most
    if (b.unpaidOwedCents !== a.unpaidOwedCents) return b.unpaidOwedCents - a.unpaidOwedCents;
    return b.lifetimeReleasedCents - a.lifetimeReleasedCents;
  });

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
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Nonprofits</h1>
            <p className="mt-2 text-sm text-white/65 max-w-2xl">
              Recipient truth surface. Shows lifetime unlocked (from Releases) and payout obligation (from Payables).
              If it’s not released, it didn’t happen. If it’s not payable, it isn’t owed.
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
              href="/admin/payables"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
            >
              Payables →
            </Link>
            <Link
              href="/admin/releases"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
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
              {rows.length === 0 ? "No nonprofits yet." : `Showing ${rows.length} nonprofits`}
            </div>
            <div className="text-xs text-white/50">
              Tip: “Lifetime” comes from Releases. “Owed” comes from unpaid Payables.
            </div>
          </div>

          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs text-white/55 border-b border-white/10">
            <div className="col-span-4">Nonprofit</div>
            <div className="col-span-2">Unpaid Owed</div>
            <div className="col-span-2">Lifetime Unlocked</div>
            <div className="col-span-2">Releases</div>
            <div className="col-span-2">Status</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/10">
            {rows.map((g) => (
              <details key={g.id} className="group">
                <summary className="list-none cursor-pointer">
                  <div className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-white/5 transition">
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{g.name}</div>
                        {g.slug ? (
                          <span className="text-[11px] text-white/45 truncate">{g.slug}</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-white/45 truncate">{shortId(g.id)}</div>
                    </div>

                    <div className="col-span-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-1 text-xs ring-1",
                          g.unpaidOwedCents > 0
                            ? "bg-[#FFD28F]/10 text-[#FFD28F] ring-[#FFD28F]/20"
                            : "bg-white/5 text-white/65 ring-white/10",
                        ].join(" ")}
                      >
                        {money(g.unpaidOwedCents)}
                      </span>
                      <div className="mt-1 text-[11px] text-white/45">{g.unpaidPayablesCount} payables</div>
                    </div>

                    <div className="col-span-2">
                      <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-1 text-xs text-white/70 ring-1 ring-white/10">
                        {money(g.lifetimeReleasedCents)}
                      </span>
                      <div className="mt-1 text-[11px] text-white/45">
                        last {fmtDate(g.lastReleaseAt)}
                      </div>
                    </div>

                    <div className="col-span-2 text-white/80">
                      {g.releasesCount}
                      <div className="mt-1 text-[11px] text-white/45">
                        paid out {money(g.paidOutCents)}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-1 text-xs ring-1",
                          g.is_active
                            ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25"
                            : "bg-white/5 text-white/65 ring-white/10",
                        ].join(" ")}
                      >
                        {g.is_active ? "Active" : "Inactive"}
                      </span>
                      <div className="mt-1 text-[11px] text-white/45">
                        created {fmtDate(g.created_at)}
                      </div>
                    </div>
                  </div>
                </summary>

                {/* Expanded */}
                <div className="px-6 pb-5">
                  <div className="mt-2 rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                    <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[11px] text-white/55 border-b border-white/10">
                      <div className="col-span-4">Contacts</div>
                      <div className="col-span-4">Unpaid Window</div>
                      <div className="col-span-4">Payout History</div>
                    </div>

                    <div className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                      <div className="col-span-4 text-white/75">
                        <div className="truncate">{g.contact_name ?? "—"}</div>
                        <div className="text-[11px] text-white/45 truncate">{g.contact_email ?? "—"}</div>
                        {g.website_url ? (
                          <div className="mt-1 text-[11px] text-white/55 truncate">{g.website_url}</div>
                        ) : null}
                      </div>

                      <div className="col-span-4 text-white/75">
                        <div>
                          Oldest unpaid: <span className="text-white/70">{fmtDate(g.oldestUnpaid)}</span>
                        </div>
                        <div className="text-[11px] text-white/45">
                          Newest unpaid: {fmtDate(g.newestUnpaid)}
                        </div>
                      </div>

                      <div className="col-span-4 text-white/75">
                        <div>
                          Paid payables: <span className="text-white/70">{g.paidCount}</span>
                        </div>
                        <div className="text-[11px] text-white/45">
                          Last paid: {fmtDate(g.lastPaidAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-white/45">
                    Read-only view. Any changes to payouts should happen through a payout engine (not clicks in the UI).
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
