"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

  const [challenge, setChallenge] = useState<ChallengeBoardRow | null>(null);
  const [athlete, setAthlete] = useState<AthleteMini | null>(null);

  // ------------------------------
  // Guard: must be authenticated + athlete exists + onboarding complete
  // ------------------------------
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
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  // ------------------------------
  // Load challenge detail (from view)
  // ------------------------------
  useEffect(() => {
    if (!supabase) return;

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
  }, [challengeId, supabase]);

  // ------------------------------
  // Claim action (insert into claims)
  // ------------------------------
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
    const expiresAt = new Date(now.getTime() + 90 * 1000);

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
    [
      "Could not confirm claim.",
      updateErr.message ?? "Unknown error",
    ].join("\n")
  );

  return;
}



    setClaiming(false);
    router.push("/athlete");
  }

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <main className="min-h-screen bg-[#070B14] text-white">
      <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-white/55">Claim</p>
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
  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/8"
>
  ← Back
</button>

        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100 whitespace-pre-line">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        ) : !challenge ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
            No challenge loaded.
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/6 to-white/3 p-6 shadow-[0_0_60px_0_rgba(0,0,0,0.4)]">
              <div className="flex flex-wrap items-center gap-2">
                {challenge.activity ? (
  <span>
    {challenge.activity}
  </span>
) : null}

                {challenge.distance_miles != null ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                    {formatMiles(challenge.distance_miles)}
                  </span>
                ) : null}
                {challenge.slots_left != null ? (
  <span>
    {challenge.slots_left} slots left
  </span>
) : null}

              </div>

              <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {challenge.title}
                  </h2>
                  {challenge.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-white/70">
                      {challenge.description}
                    </p>
                  ) : null}

                  <div className="mt-4 text-sm text-white/65">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#FFD28F]/25 bg-[#0B1020] text-xs text-[#FFD28F]">
                        {(challenge.nonprofit_name || "N")[0]?.toUpperCase()}
                      </span>
                      <div>
                        <div className="text-white/85">
                          {challenge.nonprofit_name || "Unrestricted pool"}
                        </div>
                        <div className="text-white/55 text-xs">
                          {challenge.corporate_partner_name
  ? `${challenge.corporate_partner_name} matched`
  : "Unmatched"}

                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-white/55">
                    Claiming as{" "}
                    <span className="text-white/80">
                      {athlete?.display_name ||
                        (athlete?.username
                          ? `@${athlete.username}`
                          : "your athlete profile")}
                    </span>
                    .
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-3xl font-semibold text-[#FFD28F]">
                    {formatMoney(challenge.amount_cents)}
                  </div>
                  {challenge.impact_cents_estimate ? (
  <div>
    up to {formatMoney(challenge.impact_cents_estimate)} impact
  </div>
) : (
  <div>
    impact {formatMoney(challenge.amount_cents)}
  </div>
)}

                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="text-xs text-white/55">
                By confirming, you’re reserving a slot for this challenge.
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  onClick={handleConfirmClaim}
                  disabled={claiming}
                  className={[
                    "rounded-full px-5 py-3 text-sm font-medium transition",
                    "bg-[#FFD28F] text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,210,143,0.20)]",
                    "hover:-translate-y-0.5 hover:bg-[#FEC56B]",
                    "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
                  ].join(" ")}
                >
                  {claiming ? "Claiming…" : "Confirm & Start →"}
                </button>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-white/40">
              Powered by{" "}
              <span className="text-white/55">Challenge_Board_View</span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
