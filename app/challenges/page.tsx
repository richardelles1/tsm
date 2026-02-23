"use client";

// NEW (app/challenges/page.tsx)
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

type ChallengeBoardRow = {
  challenge_id: string;
  title: string | null;
  description: string | null;

  activity?: string | null;
  distance_miles?: number | null;
  amount_cents?: number | null;

  slots_total?: number | null;
  slots_claimed?: number | null;
  slots_left?: number | null;

  nonprofit_name?: string | null;
  nonprofit_slug?: string | null;
  nonprofit_logo_url?: string | null;

  corporate_partner_name?: string | null;

  match_ratio?: number | null;
  impact_cents_estimate?: number | null;

  created_at?: string | null;
};

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${(v / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function miles(v?: number | null) {
  if (typeof v !== "number") return null;
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} mi`;
}

export default function ChallengesPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [rows, setRows] = useState<ChallengeBoardRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasActiveToday, setHasActiveToday] = useState(false);
const [reservingId, setReservingId] = useState<string | null>(null);

const supabase = useMemo(() => {
    if (!url || !anon) return null;
    // client-side: session cookie exists, so auth works
    return createClient(url, anon);
  }, [url, anon]);

async function handleReserve(c: ChallengeBoardRow) {
  if (!supabase) return;

  setReservingId(c.challenge_id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "/authorization";
    return;
  }

  if (c.amount_cents == null || c.distance_miles == null) {
    alert("Challenge missing required data.");
    setReservingId(null);
    return;
  }

  const expiresAt = new Date(Date.now() + 90 * 1000).toISOString();

  const { error } = await supabase.from("claims").insert({
    challenge_id: c.challenge_id,
    athlete_id: user.id,
    status: "reserved",
    claimed_at: new Date().toISOString(),
    expires_at: expiresAt,
    amount_cents_snapshot: c.amount_cents,
    distance_miles_snapshot: c.distance_miles,
  });

  if (error) {
    alert(error.message);
    setReservingId(null);
    return;
  }

  window.location.href = `/claim/${c.challenge_id}`;
}


  useEffect(() => {
  if (!supabase) return;

  const client = supabase;
  let cancelled = false;

  async function run() {
    const { data, error } = await client
      .from("Challenge_Board_View")
      .select("*")
      .gt("slots_left", 0)
      .order("created_at", { ascending: false });

    if (!cancelled) {
      if (error) setErrorMsg(error.message);
      setRows((data as any) ?? []);
    }

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user || cancelled) {
      if (!cancelled) setHasActiveToday(false);
      return;
    }

    const { data: athlete } = await client
      .from("athletes")
      .select("id,email")
      .or(`id.eq.${user.id},email.eq.${user.email ?? ""}`)
      .maybeSingle();

    if (!athlete?.id || cancelled) {
      if (!cancelled) setHasActiveToday(false);
      return;
    }

    // Active claim guard (no daily restriction)
    const { data: activeClaim } = await client
      .from("claims")
      .select("id")
      .eq("athlete_id", athlete.id)
      .eq("status", "claimed")
      .limit(1);

    if (!cancelled) setHasActiveToday(!!activeClaim?.length);
  }

  // Initial fetch
  run();

  // 🔄 Realtime subscription
  const channel = client
    .channel("challenge-board-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "claims" },
      () => {
        run();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenges" },
      () => {
        run();
      }
    )
    .subscribe((status) => {
  console.log("Realtime status:", status);
});


  return () => {
    cancelled = true;
    client.removeChannel(channel);
  };
}, [supabase]);

  if (!url || !anon) {
    return (
      <main className="min-h-screen bg-[#070A12] text-white px-6 py-14">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white/5 ring-1 ring-white/10 p-8">
          <h1 className="text-2xl font-semibold">Missing Supabase env vars</h1>
          <p className="mt-2 text-white/70 text-sm">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to{" "}
            <code className="text-white/90">.env.local</code>, then restart dev server.
          </p>
        </div>
      </main>
    );
  }

  const visibleRows = rows.filter((c) => {
    const slotsLeft =
      typeof c.slots_left === "number"
        ? c.slots_left
        : typeof c.slots_total === "number" && typeof c.slots_claimed === "number"
        ? c.slots_total - c.slots_claimed
        : null;

    if (slotsLeft === null) return true;
    return slotsLeft > 0;
  });

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-14">
        {/* top bar */}
        <div className="flex items-start justify-between">
          <div className="flex-1 text-center">
            <h1 className="text-3xl md:text-5xl font-semibold tracking-[0.28em] text-white">
              MILES <span className="mx-4 text-white">★</span> MARKETPLACE
            </h1>

            <p className="mt-4 text-sm md:text-base text-white/60 tracking-normal">
              Money in motion, powered by movement.
            </p>
          </div>

          <Link
            href="/"
            className="shrink-0 rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            ← Home
          </Link>
        </div>

        {/* status */}
        <div className="mt-6">
          {errorMsg ? (
            <div className="rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
              Supabase error: <span className="text-red-200">{errorMsg}</span>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 text-white/70">
              No challenges found yet. (Seed script time.)
            </div>
          ) : null}
        </div>

        {/* list + freeze overlay */}
        <div className="relative mt-6">
          <div
            className={`grid grid-cols-1 gap-4 transition ${
  hasActiveToday && !reservingId ? "pointer-events-none opacity-40 blur-[2px]" : ""
}`}

          >
            {visibleRows.map((c) => {
              const slotsLeft =
                typeof c.slots_left === "number"
                  ? c.slots_left
                  : typeof c.slots_total === "number" && typeof c.slots_claimed === "number"
                  ? c.slots_total - c.slots_claimed
                  : null;

              const baseCents = typeof c.amount_cents === "number" ? c.amount_cents : 0;
              const base = money(baseCents);

              const hasMatch = Boolean(c.corporate_partner_name);
              const ratio = typeof c.match_ratio === "number" ? c.match_ratio : null;

              const computedImpactCents =
                hasMatch && ratio !== null ? Math.round(baseCents + baseCents * ratio) : baseCents;

              const impact = money(computedImpactCents);


              return (
                <div
                  key={c.challenge_id}
                  className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_34px_10px_rgba(0,0,0,0.30)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        {c.activity ? (
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                            {c.activity}
                          </span>
                        ) : null}
                        {miles(c.distance_miles) ? (
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                            {miles(c.distance_miles)}
                          </span>
                        ) : null}
                        {slotsLeft !== null ? (
                          <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                            {slotsLeft} slots left
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-3 text-xl md:text-2xl font-semibold tracking-tight truncate">
                        {c.title ?? "Untitled Challenge"}
                      </h2>

                      {c.description ? (
                        <p className="mt-2 text-sm text-white/70 line-clamp-2">{c.description}</p>
                      ) : null}

                      <div className="mt-4 flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-2xl bg-[#0D1326] ring-1 ring-white/10 flex items-center justify-center">
                            <span className="text-[#FFD28F] font-semibold">
                              {(c.nonprofit_name?.[0] ?? "N").toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-white/80 truncate">{c.nonprofit_name ?? "Nonprofit"}</div>
                            {c.corporate_partner_name ? (
                              <div className="text-white/50 text-xs truncate">
                                {c.corporate_partner_name} matched
                              </div>
                            ) : (
                              <div className="text-white/50 text-xs">Unmatched</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* right side */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[#FFD28F] text-2xl font-semibold">{base}</div>
                        <div className="text-xs text-white/55">{impact} total impact</div>
                      </div>

                      <button
  onClick={() => handleReserve(c)}
  className="rounded-2xl bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/25 hover:ring-[#FFD28F]/45 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.18)] transition"
>
  Claim →
</button>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasActiveToday && !reservingId ? (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="max-w-md w-full rounded-3xl bg-white/10 ring-1 ring-white/20 backdrop-blur-2xl p-8 text-center shadow-[0_0_40px_10px_rgba(0,0,0,0.45)]">
      <h2 className="text-xl font-semibold">You’re Already in Motion</h2>
      <p className="mt-3 text-white/70 text-sm">
        Complete today’s challenge before claiming another.
      </p>

      <div className="mt-6">
        <Link
          href="/activechallenge"
          className="rounded-full bg-[#FFD28F] text-[#070A12] px-6 py-3 font-medium hover:bg-[#FEC56B] transition"
        >
          Verify Activity →
        </Link>
      </div>
    </div>
  </div>
) : null}

        </div>

        {/* footer */}
        <div className="mt-10 text-xs text-white/45">
          Powered by <span className="text-white/70">Challenge_Board_View</span>
        </div>
      </div>
    </main>
  );
}
