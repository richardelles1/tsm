// NEW
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ClaimRow = {
  id: string;
  status: string;
  claimed_at: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  expires_at: string | null;
  amount_cents: number | null;
  distance_miles: number | null;
  challenges?: {
    id: string;
    title: string | null;
    description: string | null;
    activity_type: string | null;
    distance_miles: number | null;
    amount_cents: number | null;
    nonprofits?: {
      id: string;
      name: string | null;
      slug: string | null;
      logo_url: string | null;
    } | null;
  } | null;
};

function money(cents?: number | null) {
  if (!cents) return "$0";
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default function ClaimHubPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const claimId = params?.id;

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claim, setClaim] = useState<ClaimRow | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!claimId) return;
      setLoading(true);
      setError(null);

      // Pull claim + challenge + nonprofit in one shot
      const { data, error } = await supabase
        .from("claims")
        .select(
          `
          id,
          status,
          claimed_at,
          submitted_at,
          verified_at,
          expires_at,
          amount_cents,
          distance_miles,
          challenges (
            id,
            title,
            description,
            activity_type,
            distance_miles,
            amount_cents,
            nonprofits (
              id,
              name,
              slug,
              logo_url
            )
          )
        `
        )
        .eq("id", claimId)
        .single();

      if (!mounted) return;

      if (error) {
        setError(error.message || "Failed to load claim.");
        setClaim(null);
      } else {
        setClaim(data as any);
      }

      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [claimId, supabase]);

  async function submitCompletion() {
    if (!claimId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/claims/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Could not submit completion.");
      }

      router.push(`/complete/${claimId}`);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const challenge = claim?.challenges ?? null;
  const nonprofit = challenge?.nonprofits ?? null;

  return (
    <main className="min-h-screen bg-[#070B14] text-white">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60">
              Claim
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Your challenge
            </h1>
          </div>

          <button
            onClick={() => router.push("/challenges")}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
          >
            ← Board
          </button>
        </div>

        {/* Body */}
        <div className="mt-8 space-y-5">
          {/* Loading / Error */}
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
              Loading…
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-[#FFB48E]/30 bg-[#2A0F12]/60 p-6 text-[#FFB48E]">
              {error}
            </div>
          ) : !claim ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
              Claim not found.
            </div>
          ) : (
            <>
              {/* Challenge Card */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_8px_rgba(255,210,143,0.10)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {challenge?.activity_type ? (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                          {challenge.activity_type}
                        </span>
                      ) : null}
                      {challenge?.distance_miles ? (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                          {challenge.distance_miles} mi
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                        status: {claim.status}
                      </span>
                    </div>

                    <div className="text-2xl font-semibold tracking-tight">
                      {challenge?.title || "Challenge"}
                    </div>

                    {challenge?.description ? (
                      <div className="text-white/70">
                        {challenge.description}
                      </div>
                    ) : null}

                    {nonprofit?.name ? (
                      <div className="mt-3 flex items-center gap-3 text-white/80">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm">
                          {(nonprofit.name || "N").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="leading-tight">
                          <div className="font-medium">{nonprofit.name}</div>
                          <div className="text-xs text-white/50">
                            beneficiary
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-semibold text-[#FFD28F]">
                      {money(claim.amount_cents ?? challenge?.amount_cents)}
                    </div>
                    <div className="text-sm text-white/60">impact</div>
                  </div>
                </div>
              </div>

              {/* Action Card */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-white/70">
                  When you’re done, submit completion to unlock the funds.
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-white/50">
                    Claim ID: <span className="text-white/70">{claim.id}</span>
                  </div>

                  <button
                    onClick={submitCompletion}
                    disabled={submitting || claim.status === "verified"}
                    className="rounded-full bg-[#FFCC88] px-6 py-3 text-sm font-semibold text-[#0B0F1C] shadow-inner hover:bg-[#FEC56B] disabled:opacity-60"
                  >
                    {claim.status === "verified"
                      ? "Already Verified"
                      : submitting
                      ? "Submitting…"
                      : "Submit completion →"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-10 text-center text-xs text-white/35">
          Mobile-first MVP • Claim hub
        </div>
      </div>
    </main>
  );
}
