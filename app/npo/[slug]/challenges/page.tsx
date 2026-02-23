import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

function formatUsdFromCents(cents: number | null | undefined) {
  const safe = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe / 100);
}

function fmtDate(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ChallengesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = createSupabaseServerClient();
  const { slug } = await params;

  if (!slug) notFound();

  const { data: nonprofit } = await supabase
    .from("nonprofits")
    .select("id,name")
    .eq("slug", slug)
    .maybeSingle();

  if (!nonprofit) notFound();

  const { data: challenges, error } = await supabase
    .from("challenges")
    .select(
      "id,title,status,amount_cents,match_ratio,created_at,expires_at"
    )
    .eq("nonprofit_id", nonprofit.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = challenges ?? [];

  const active = rows.filter(
    (c) => c.status === "open" || c.status === "claimed"
  );
  const completed = rows.filter((c) => c.status === "completed");

  const activeVolumeCents = active.reduce(
    (acc, c) => acc + (c.amount_cents ?? 0),
    0
  );

  const pageWrap = "p-5 md:p-8 space-y-6 text-neutral-100";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const muted = "text-sm text-neutral-300/80";
  const pill =
    "inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs";

  return (
    <div className={pageWrap}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Challenges</h1>
          <p className={muted}>
            Fundraising challenges linked to {nonprofit.name}
          </p>
        </div>

        <Link
          href={`/npo/${slug}`}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          ← Home
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={card}>
          <div className="text-xs text-neutral-300/70">Active challenges</div>
          <div className="mt-2 text-2xl font-semibold">{active.length}</div>
        </div>

        <div className={card}>
          <div className="text-xs text-neutral-300/70">In challenges now</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatUsdFromCents(activeVolumeCents)}
          </div>
        </div>

        <div className={card}>
          <div className="text-xs text-neutral-300/70">
            Challenges completed (lifetime)
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {completed.length}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className={card}>
            <p className={muted}>No challenges yet.</p>
          </div>
        ) : (
          rows.map((c) => (
            <div key={c.id} className={card}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-lg font-medium">{c.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className={pill}>{c.status}</span>
                    <span className={pill}>
                      {formatUsdFromCents(c.amount_cents)} base
                    </span>
                    {c.match_ratio ? (
                      <span className={pill}>
                        {c.match_ratio}× match
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="text-sm text-neutral-300/80">
                  Expires {fmtDate(c.expires_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
