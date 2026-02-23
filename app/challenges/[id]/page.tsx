"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const router = useRouter();
  const supabase = useMemo(
    () => createSupabaseBrowserClient({ persistSession: true }),
    []
  );

  const [rows, setRows] = useState<ChallengeBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function boot() {
    setError(null);
    setLoading(true);

    // ✅ Guard: must be authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/authorization");
      return;
    }

    // ✅ Guard: must have athlete + onboarding completed
    const { data: athlete, error: athleteErr } = await supabase
      .from("athletes")
      .select("id, onboarding_completed")
      .eq("id", session.user.id)
      .single();

    if (athleteErr || !athlete) {
      router.replace("/onboarding");
      return;
    }

    if (!athlete.onboarding_completed) {
      router.replace("/onboarding");
      return;
    }

    // ✅ Load board
    const { data, error: boardErr } = await supabase
      .from("Challenge_Board_View")
      .select("*")
      .order("created_at", { ascending: false });

    if (boardErr) {
      setError(boardErr.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(((data as any) ?? []) as ChallengeBoardRow[]);
    setLoading(false);
  }

  async function handleClaim(challengeId: string) {
    setError(null);
    setClaimingId(challengeId);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/authorization");
      return;
    }

    // Insert claim (MVP: one claim per athlete per challenge)
    const { error: insertErr } = await supabase.from("claims").insert({
      challenge_id: challengeId,
      athlete_id: session.user.id,
      status: "claimed",
      claimed_at: new Date().toISOString(),
    });

    if (insertErr) {
      // If you add a unique constraint later, duplicates will land here cleanly.
      setError(insertErr.message);
      setClaimingId(null);
      return;
    }

    // For now, redirect to athlete dashboard to see it reflect
    router.push("/athlete");
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-14">
        {/* top bar */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60">Challenge Board</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Money in motion, powered by movement.
            </h1>
          </div>
          <Link
            href="/athlete"
            className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            ← Athlete
          </Link>
        </div>

        {/* status */}
        <div className="mt-6">
          {error ? (
            <div className="rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
              {error}
            </div>
          ) : loading ? (
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 text-white/70">
              Loading challenges…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 text-white/70">
              No challenges found yet. (Seed script time.)
            </div>
          ) : null}
        </div>

        {/* list */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          {rows.map((c) => {
            const slotsLeft =
              typeof c.slots_left === "number"
                ? c.slots_left
                : typeof c.slots_total === "number" && typeof c.slots_claimed === "number"
                ? c.slots_total - c.slots_claimed
                : null;

            const base = money(c.amount_cents);
            const impact =
              typeof c.impact_cents_estimate === "number"
                ? money(c.impact_cents_estimate)
                : null;

            const isClaiming = claimingId === c.challenge_id;

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
                      <p className="mt-2 text-sm text-white/70 line-clamp-2">
                        {c.description}
                      </p>
                    ) : null}

                    <div className="mt-4 flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-2xl bg-[#0D1326] ring-1 ring-white/10 flex items-center justify-center">
                          <span className="text-[#FFD28F] font-semibold">
                            {(c.nonprofit_name?.[0] ?? "N").toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-white/80 truncate">
                            {c.nonprofit_name ?? "Nonprofit"}
                          </div>
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
                      <div className="text-[#FFD28F] text-2xl font-semibold">
                        {base}
                      </div>
                      {impact ? (
                        <div className="text-xs text-white/55">
                          up to {impact} impact
                        </div>
                      ) : (
                        <div className="text-xs text-white/55">&nbsp;</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleClaim(c.challenge_id)}
                      disabled={isClaiming}
                      className="rounded-2xl bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/25 hover:ring-[#FFD28F]/45 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.18)] transition disabled:opacity-60 disabled:hover:shadow-none"
                    >
                      {isClaiming ? "Claiming…" : "Claim →"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div className="mt-10 text-xs text-white/45">
          Powered by <span className="text-white/70">Challenge_Board_View</span>
        </div>
      </div>
    </main>
  );
}
