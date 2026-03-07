"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureAthlete } from "@/lib/supabase/ensureAthlete";

type ChallengeBoardRow = {
  challenge_id: string;
  title: string;
  description: string | null;

  activity: string | null;
  distance_miles: number | null;

  amount_cents: number | null;
  impact_cents_estimate: number | null;

  slots_total: number | null;
  slots_left: number | null;

  nonprofit_name: string | null;
  nonprofit_slug: string | null;

  corporate_partner_name: string | null;
  created_at: string | null;
};

type AthleteMini = {
  id: string;
  display_name: string | null;
  username: string | null;
  onboarding_completed: boolean | null;
};

const ACTIVITY_CONFIG: Record<string, { label: string; color: string }> = {
  run:   { label: "RUN",   color: "text-[#FF9B6A]" },
  walk:  { label: "WALK",  color: "text-[#C4EBF2]" },
  cycle: { label: "CYCLE", color: "text-[#FFD28F]" },
};

function getActivityLabel(a: string | null | undefined) {
  return ACTIVITY_CONFIG[(a ?? "").toLowerCase()]?.label ?? (a ?? "MOVE").toUpperCase();
}
function getActivityColor(a: string | null | undefined) {
  return ACTIVITY_CONFIG[(a ?? "").toLowerCase()]?.color ?? "text-white/60";
}

function formatMoney(cents?: number | null) {
  if (cents == null) return "";
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function formatMiles(miles?: number | null) {
  if (miles == null) return "";
  const rounded = Math.round(miles * 10) / 10;
  return `${rounded} mi`;
}

export default function ClaimChallengePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const challengeId = params?.id;

  const [supabase, setSupabase] = useState<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);

  useEffect(() => {
    const client = createSupabaseBrowserClient({ persistSession: true });
    setSupabase(client);
  }, []);

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveClaim, setHasActiveClaim] = useState(false);

  const [challenge, setChallenge] = useState<ChallengeBoardRow | null>(null);
  const [athlete, setAthlete] = useState<AthleteMini | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let cancelled = false;

    async function run() {
      const { data } = await client.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace("/authorization");
        return;
      }

      await ensureAthlete(client, {
        id: user.id,
        email: user.email,
      });

      const { data: a, error } = await client
        .from("athletes")
        .select("id, display_name, username, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (error || !a || !a.onboarding_completed) {
        router.replace("/onboarding");
        return;
      }

      setAthlete(a as AthleteMini);

      // Check for existing active claim
      const { data: existingClaim } = await client
        .from("claims")
        .select("id")
        .eq("athlete_id", user.id)
        .eq("status", "claimed")
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (existingClaim) {
        setHasActiveClaim(true);
        setLoading(false);
        return;
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!supabase || hasActiveClaim) return;

    const client = supabase;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      if (!challengeId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await client
          .from("Challenge_Detail_View")
          .select("*")
          .eq("challenge_id", challengeId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setError(error.message);
          setChallenge(null);
        } else if (!data) {
          setError("Challenge not found.");
          setChallenge(null);
        } else {
          setChallenge(data as ChallengeBoardRow);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Unknown error loading challenge.");
          setChallenge(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [challengeId, supabase, hasActiveClaim]);

  async function handleConfirmClaim() {
    if (!supabase || !challenge) return;

    const client = supabase;

    setClaiming(true);
    setError(null);

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      router.replace("/authorization");
      return;
    }

    if (challenge.amount_cents == null || challenge.distance_miles == null) {
      setError(
        "This challenge is missing required data (amount or distance). Seed data must include amount_cents + distance_miles."
      );
      setClaiming(false);
      return;
    }

    const now = new Date();

    const { error: updateErr } = await client
      .from("claims")
      .update({
        status: "claimed",
        claimed_at: now.toISOString(),
        expires_at: null,
      })
      .eq("athlete_id", user.id)
      .eq("challenge_id", challenge.challenge_id)
      .eq("status", "reserved");

    if (updateErr) {
      console.error("Confirm claim error:", updateErr);
      setError(
        ["Could not confirm claim.", updateErr.message ?? "Unknown error"].join("\n")
      );
      setClaiming(false);
      return;
    }

    setClaiming(false);
    router.push("/athlete");
  }

  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070A12] text-white">
        <div className="h-1 w-24 rounded-full bg-white/10 animate-pulse" />
      </main>
    );
  }

  // Active claim guard
  if (hasActiveClaim) {
    return (
      <main className="min-h-screen bg-[#070A12] text-white flex items-center justify-center px-5">
        <div className="pointer-events-none fixed inset-0 opacity-55">
          <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.18),transparent_60%)] blur-2xl" />
        </div>
        <div className="relative max-w-sm w-full rounded-3xl bg-white/5 ring-1 ring-[#FF9B6A]/25 backdrop-blur-xl p-8 text-center shadow-[0_0_60px_10px_rgba(0,0,0,0.50)]">
          <div className="text-4xl mb-3">🏃</div>
          <h2 className="text-xl font-semibold">You're Already in Motion</h2>
          <p className="mt-2 text-white/55 text-sm">
            You have an active challenge. Complete it before claiming a new one.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/activechallenge"
              className="inline-flex items-center justify-center w-full rounded-full bg-[#FF9B6A] text-[#0B0F1C] px-6 py-3 font-bold hover:bg-[#FFB48E] transition shadow-[0_8px_24px_rgba(255,155,106,0.20)]"
            >
              Go to Active Challenge →
            </Link>
            <Link
              href="/challenges"
              className="text-sm text-white/40 hover:text-white/60 transition"
            >
              ← Back to Marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.10),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-3xl px-5 py-10">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-white/35 uppercase">Claim</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Confirm your challenge
            </h1>
          </div>

          <button
            onClick={async () => {
              if (supabase && athlete && challenge) {
                await supabase
                  .from("claims")
                  .update({
                    status: "expired",
                    expires_at: new Date().toISOString(),
                  })
                  .eq("athlete_id", athlete.id)
                  .eq("challenge_id", challenge.challenge_id)
                  .eq("status", "reserved");
              }
              router.push("/challenges");
            }}
            className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            ← Back
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 px-4 py-3 text-sm text-red-100 whitespace-pre-line">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
            <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        ) : !challenge ? (
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 text-white/50">
            No challenge loaded.
          </div>
        ) : (
          <>
            <div className="rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl overflow-hidden shadow-[0_0_60px_0_rgba(0,0,0,0.4)]">
              {/* Activity accent strip */}
              <div className={`h-0.5 w-full ${
                (challenge.activity ?? "").toLowerCase() === "run" ? "bg-[#FF9B6A]"
                : (challenge.activity ?? "").toLowerCase() === "walk" ? "bg-[#C4EBF2]"
                : (challenge.activity ?? "").toLowerCase() === "cycle" ? "bg-[#FFD28F]"
                : "bg-white/20"
              }`} />

              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {challenge.activity && (
                    <span className={`text-[10px] font-black tracking-[0.20em] uppercase ${getActivityColor(challenge.activity)}`}>
                      {getActivityLabel(challenge.activity)}
                    </span>
                  )}
                  {challenge.distance_miles != null && (
                    <span className="rounded-full bg-white/5 ring-1 ring-white/10 px-3 py-1 text-xs text-white/70">
                      {formatMiles(challenge.distance_miles)}
                    </span>
                  )}
                  {challenge.slots_left != null && (
                    <span className="rounded-full bg-white/5 ring-1 ring-white/10 px-3 py-1 text-xs text-white/50">
                      {challenge.slots_left} slot{challenge.slots_left !== 1 ? "s" : ""} left
                    </span>
                  )}
                </div>

                <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      {challenge.title}
                    </h2>
                    {challenge.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-white/60">
                        {challenge.description}
                      </p>
                    ) : null}

                    <div className="mt-4 flex items-center gap-2">
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#FFD28F]/25 bg-[#0B1020] text-xs text-[#FFD28F] shrink-0">
                        {(challenge.nonprofit_name || "N")[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-white/80">
                          {challenge.nonprofit_name || "Unrestricted pool"}
                        </div>
                        <div className="text-xs text-white/45">
                          {challenge.corporate_partner_name
                            ? `${challenge.corporate_partner_name} matched`
                            : "Unmatched"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-white/45">
                      Claiming as{" "}
                      <span className="text-white/70">
                        {athlete?.display_name ||
                          (athlete?.username
                            ? `@${athlete.username}`
                            : "your athlete profile")}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-3xl font-semibold text-[#FFD28F]">
                      {formatMoney(challenge.amount_cents)}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {challenge.impact_cents_estimate
                        ? `up to ${formatMoney(challenge.impact_cents_estimate)} impact`
                        : `impact ${formatMoney(challenge.amount_cents)}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6">
              <div className="text-xs text-white/45">
                By confirming, you're locking in your slot for this challenge. You'll have 90 minutes to complete and verify your activity.
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  onClick={handleConfirmClaim}
                  disabled={claiming}
                  className={[
                    "rounded-full px-6 py-3.5 text-sm font-bold transition",
                    "bg-[#FF9B6A] text-[#0B0F1C] shadow-[0_8px_30px_rgba(255,155,106,0.25)]",
                    "hover:bg-[#FFB48E] hover:shadow-[0_10px_40px_rgba(255,155,106,0.35)] hover:-translate-y-0.5",
                    "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
                  ].join(" ")}
                >
                  {claiming ? "Confirming…" : "Confirm & Start →"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
