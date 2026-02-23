"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ActiveClaimRow = {
  id: string;
  status: string;
  claimed_at: string | null;
  expires_at: string | null;

  amount_cents_snapshot: number;
  distance_miles_snapshot: number;
};

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function miles(v: number) {
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} mi`;
}

function hoursLeft(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;

  const hrs = Math.ceil(ms / (1000 * 60 * 60));
  if (hrs <= 0) return "Expired";
  return `${hrs} hour${hrs === 1 ? "" : "s"} left`;
}

export default function ActiveChallengePage() {
  const router = useRouter();

  // browser-only Supabase
  const [supabase, setSupabase] = useState<
    ReturnType<typeof createSupabaseBrowserClient> | null
  >(null);

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient({ persistSession: true }));
  }, []);

  const [loading, setLoading] = useState(true);
  const [athleteName, setAthleteName] = useState("");
  const [claim, setClaim] = useState<ActiveClaimRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  async function handleRelease() {
    if (!claim || releasing) return;

    setReleasing(true);
    setError(null);

    try {
      const res = await fetch("/api/claims/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim.id }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to release claim.");
      }

      router.replace("/challenges");
    } catch (e: any) {
      setError(e?.message || "Failed to release claim.");
      setReleasing(false);
    }
  }

  // ------------------------------
  // Guard + load ACTIVE claim
  // ------------------------------
  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await sb.auth.getUser();

      if (!user) {
        router.replace("/authorization");
        return;
      }

      // athlete identity (display only)
      const { data: athlete } = await sb
        .from("athletes")
        .select("display_name, username, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (!athlete || !athlete.onboarding_completed) {
        router.replace("/onboarding");
        return;
      }

      setAthleteName(
        athlete.display_name ||
          (athlete.username ? `@${athlete.username}` : "Athlete")
      );

      // 🔒 SINGLE authoritative query
      const { data, error } = await sb
        .from("claims")
        .select(
          `
          id,
          status,
          claimed_at,
          expires_at,
          amount_cents_snapshot,
          distance_miles_snapshot
        `
        )
        .eq("athlete_id", user.id)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setClaim(null);
        setLoading(false);
        return;
      }

      if (!data) {
        router.replace("/challenges");
        return;
      }

      setClaim(data as ActiveClaimRow);
      setLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </main>
    );
  }

  const timeLeft = hoursLeft(claim?.expires_at);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* glow */}
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-14">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60">Active Challenge</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {athleteName
                ? `${athleteName}, you’re in motion.`
                : "You’re in motion."}
            </h1>
          </div>

          <Link
            href="/athlete"
            className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            ← Athlete
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
            <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="mt-6 h-12 w-full animate-pulse rounded-2xl bg-white/10" />
          </div>
        ) : claim ? (
          <>
            <div className="mt-8 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_34px_10px_rgba(0,0,0,0.30)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-white/55">
                    Claimed
                    {timeLeft && (
                      <span className="ml-2 text-white/45">· {timeLeft}</span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-white/70">
                    <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                      {miles(claim.distance_miles_snapshot)}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                      {money(claim.amount_cents_snapshot)} unlocked
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[#FFD28F] text-2xl font-semibold">
                    {money(claim.amount_cents_snapshot)}
                  </div>
                  <div className="text-xs text-white/55">
                    claim #{claim.id.slice(0, 8)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/verify/${claim.id}`}
                className="inline-flex items-center justify-center rounded-full bg-[#FFD28F] px-5 py-3 text-sm font-medium text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,210,143,0.20)] hover:-translate-y-0.5 hover:bg-[#FEC56B] transition"
              >
                Verify activity →
              </Link>

              <button
                onClick={handleRelease}
                disabled={releasing}
                className="rounded-full bg-[#0D1326] px-5 py-3 text-sm ring-1 ring-white/10 hover:ring-white/20 transition disabled:opacity-60"
              >
                {releasing ? "Releasing…" : "Release Challenge"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
