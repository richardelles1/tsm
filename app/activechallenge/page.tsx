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
  challenges?: { title: string | null; description: string | null } | null;
};

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function milesDisp(v: number) {
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}`;
}

function timeLeft(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "Expired";
  const hrs = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

export default function ActiveChallengePage() {
  const router = useRouter();

  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  useEffect(() => { setSupabase(createSupabaseBrowserClient({ persistSession: true })); }, []);

  const [loading, setLoading] = useState(true);
  const [athleteName, setAthleteName] = useState("");
  const [claim, setClaim] = useState<ActiveClaimRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);

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
      setConfirmRelease(false);
    }
  }

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/authorization"); return; }

      const { data: athlete } = await sb
        .from("athletes")
        .select("display_name, username, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (!athlete?.onboarding_completed) { router.replace("/onboarding"); return; }

      setAthleteName(athlete.display_name || (athlete.username ? `@${athlete.username}` : "Athlete"));

      const { data, error: claimErr } = await sb
        .from("claims")
        .select(`
          id, status, claimed_at, expires_at,
          amount_cents_snapshot, distance_miles_snapshot,
          challenges:challenge_id ( title, description )
        `)
        .eq("athlete_id", user.id)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (claimErr) { setError(claimErr.message); setClaim(null); setLoading(false); return; }
      if (!data) { router.replace("/challenges"); return; }

      setClaim(data as any);
      setLoading(false);
    }

    run();
    return () => { cancelled = true; };
  }, [router, supabase]);

  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070A12] text-white">
        <div className="h-1 w-24 rounded-full bg-white/10 animate-pulse" />
      </main>
    );
  }

  const remaining = timeLeft(claim?.expires_at);
  const isExpired = remaining === "Expired";
  const challengeTitle = (claim?.challenges as any)?.title ?? null;
  const challengeDesc = (claim?.challenges as any)?.description ?? null;

  return (
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.18),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] right-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,155,106,0.12),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-2xl px-5 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase">Active Challenge</div>
          <Link href="/athlete" className="rounded-full bg-[#0D1326] px-4 py-2 text-xs ring-1 ring-white/10 hover:ring-white/20 transition">
            ← My Impact
          </Link>
        </div>

        {/* Greeting */}
        <div className="mb-6">
          <div className="text-xs text-[#FF9B6A] font-bold tracking-[0.15em] uppercase mb-1">You're in motion</div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {athleteName ? `${athleteName}, keep going.` : "Keep going."}
          </h1>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 p-4 text-sm text-red-100">{error}</div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 space-y-3">
            <div className="h-5 w-1/3 animate-pulse rounded bg-white/10" />
            <div className="h-14 w-2/3 animate-pulse rounded-xl bg-white/8" />
            <div className="h-10 w-full animate-pulse rounded-2xl bg-white/6 mt-2" />
          </div>
        ) : claim ? (
          <div className="space-y-4">
            {/* Main challenge card */}
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl overflow-hidden">
              {/* Urgency bar */}
              {remaining && !isExpired && (
                <div className="bg-[#FF9B6A]/10 border-b border-[#FF9B6A]/15 px-5 py-2.5 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9B6A] animate-pulse shrink-0" />
                  <span className="text-xs text-[#FF9B6A] font-medium">{remaining}</span>
                </div>
              )}
              {isExpired && (
                <div className="bg-red-500/10 border-b border-red-500/15 px-5 py-2.5">
                  <span className="text-xs text-red-300 font-medium">This challenge has expired</span>
                </div>
              )}

              <div className="p-6">
                {/* Challenge title */}
                {challengeTitle && (
                  <h2 className="text-lg font-semibold mb-1 leading-snug">{challengeTitle}</h2>
                )}
                {challengeDesc && (
                  <p className="text-xs text-white/45 mb-4 line-clamp-2">{challengeDesc}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Distance</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white leading-none">
                        {milesDisp(claim.distance_miles_snapshot)}
                      </span>
                      <span className="text-sm text-white/40">miles</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <div className="text-xs text-white/35 uppercase tracking-wider mb-1">At Stake</div>
                    <div className="text-4xl font-black text-[#FFD28F] leading-none">
                      {money(claim.amount_cents_snapshot)}
                    </div>
                    <div className="text-xs text-white/25 mt-1">for nonprofits</div>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-white/20 text-right">claim #{claim.id.slice(0, 8)}</div>
              </div>
            </div>

            {/* Primary CTA */}
            <Link
              href={`/verify/${claim.id}`}
              className="flex items-center justify-center w-full rounded-full bg-[#FF9B6A] py-4 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_30px_rgba(255,155,106,0.25)] hover:bg-[#FFB48E] hover:shadow-[0_10px_40px_rgba(255,155,106,0.35)] hover:-translate-y-0.5 transition-all"
            >
              Verify Activity →
            </Link>

            {/* Release */}
            {!confirmRelease ? (
              <button
                onClick={() => setConfirmRelease(true)}
                className="w-full text-xs text-white/25 hover:text-white/50 py-2 transition"
              >
                Release this challenge
              </button>
            ) : (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 text-center space-y-3">
                <p className="text-sm text-white/70">Release this challenge and lose your spot?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRelease}
                    disabled={releasing}
                    className="flex-1 rounded-full bg-red-500/20 ring-1 ring-red-500/30 py-2.5 text-sm text-red-200 hover:bg-red-500/30 transition disabled:opacity-50"
                  >
                    {releasing ? "Releasing…" : "Yes, release it"}
                  </button>
                  <button
                    onClick={() => setConfirmRelease(false)}
                    className="flex-1 rounded-full bg-white/5 ring-1 ring-white/10 py-2.5 text-sm text-white/60 hover:ring-white/20 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
