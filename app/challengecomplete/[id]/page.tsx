"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

type NonprofitMini = { name: string | null; logo_url: string | null } | null;

type CompleteRow = {
  id: string;
  status: string;
  verified_at: string | null;
  amount_cents_snapshot: number | null;
  distance_miles_snapshot: number | null;
  challenges?: {
    id: string;
    title: string | null;
    description: string | null;
    nonprofits?: NonprofitMini;
  } | null;
};

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${Math.round(v / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function milesStr(v?: number | null) {
  if (typeof v !== "number") return null;
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}`;
}

function fireConfetti() {
  const colors = ["#FFD28F", "#FF9B6A", "#C4EBF2", "#ffffff", "#FFB48E"];
  confetti({ particleCount: 80, spread: 65, origin: { y: 0.55 }, colors });
  setTimeout(() => {
    confetti({ particleCount: 50, spread: 90, origin: { y: 0.45, x: 0.25 }, colors });
  }, 200);
  setTimeout(() => {
    confetti({ particleCount: 50, spread: 90, origin: { y: 0.45, x: 0.75 }, colors });
  }, 350);
}

export default function ChallengeCompletePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const claimId = params?.id;

  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  useEffect(() => { setSupabase(createSupabaseBrowserClient({ persistSession: true })); }, []);

  const [loading, setLoading] = useState(true);
  const [athleteName, setAthleteName] = useState<string>("");
  const [row, setRow] = useState<CompleteRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!supabase || !claimId) return;
    const sb = supabase;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user) { router.replace("/authorization"); return; }

      const { data: athlete } = await sb
        .from("athletes")
        .select("display_name, username, onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (!athlete?.onboarding_completed) { router.replace("/onboarding"); return; }

      setAthleteName(athlete.display_name || (athlete.username ? `@${athlete.username}` : "Athlete"));

      const { data, error: fetchError } = await sb
        .from("claims")
        .select(`
          id,
          status,
          verified_at,
          amount_cents_snapshot,
          distance_miles_snapshot,
          challenges:challenge_id (
            id,
            title,
            description,
            nonprofits:nonprofit_id (
              name,
              logo_url
            )
          )
        `)
        .eq("id", claimId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) { setError(fetchError.message); setRow(null); setLoading(false); return; }
      if (!data) { router.replace("/athlete"); return; }

      setRow(data as any);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [supabase, claimId, router]);

  useEffect(() => {
    if (row) {
      const t = setTimeout(fireConfetti, 300);
      return () => clearTimeout(t);
    }
  }, [row]);

  async function handleShare() {
    const amt = money(row?.amount_cents_snapshot);
    const dist = milesStr(row?.distance_miles_snapshot);
    const nonprofit = (row?.challenges?.nonprofits as any)?.name ?? "a nonprofit";
    const ogUrl = `${window.location.origin}/api/og/share?amount=${encodeURIComponent(amt)}&nonprofit=${encodeURIComponent(nonprofit)}&miles=${encodeURIComponent(dist ?? "0")}`;
    const pageUrl = window.location.href;
    const text = `I moved ${dist} miles and unlocked ${amt} for ${nonprofit} via The Shared Mile.`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `I just unlocked ${amt} for ${nonprofit}`, text, url: pageUrl });
        return;
      } catch (_) {}
    }
    try {
      await navigator.clipboard.writeText(`${text}\n\n${pageUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      window.open(ogUrl, "_blank");
    }
  }

  function handleDownloadCard() {
    const amt = money(row?.amount_cents_snapshot);
    const dist = milesStr(row?.distance_miles_snapshot);
    const nonprofit = (row?.challenges?.nonprofits as any)?.name ?? "a nonprofit";
    const ogUrl = `${window.location.origin}/api/og/share?amount=${encodeURIComponent(amt)}&nonprofit=${encodeURIComponent(nonprofit)}&miles=${encodeURIComponent(dist ?? "0")}`;
    window.open(ogUrl, "_blank");
  }

  if (!supabase) {
    return <main className="min-h-screen flex items-center justify-center text-white bg-[#070A12]">Loading…</main>;
  }

  const nonprofit = row?.challenges?.nonprofits as NonprofitMini | undefined;
  const nonprofitName = nonprofit?.name ?? null;
  const nonprofitLogo = nonprofit?.logo_url ?? null;
  const title = row?.challenges?.title ?? "Challenge complete";
  const amt = row?.amount_cents_snapshot ?? 0;
  const dist = row?.distance_miles_snapshot ?? 0;

  return (
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.18),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.12),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl px-5 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase">The Shared Mile</div>
          <Link href="/athlete" className="rounded-full bg-[#0D1326] px-4 py-2 text-xs ring-1 ring-white/10 hover:ring-white/20 transition">
            ← My Impact
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 p-4 text-sm text-red-100">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-1/2 animate-pulse rounded-xl bg-white/8" />
            <div className="h-5 w-1/3 animate-pulse rounded-xl bg-white/6" />
            <div className="mt-6 h-48 animate-pulse rounded-3xl bg-white/5" />
          </div>
        ) : !row ? (
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 text-white/50">Redirecting…</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Hero headline */}
            <div className="mb-8">
              <div className="text-sm text-[#FF9B6A] font-bold tracking-[0.18em] uppercase mb-2">
                Challenge Complete
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                {athleteName ? `${athleteName}, you just` : "You just"}{" "}
                <span className="text-[#FFD28F]">unlocked {money(amt)}</span>
                {nonprofitName ? (
                  <> for <span className="text-white">{nonprofitName}</span></>
                ) : null}.
              </h1>
              <p className="mt-3 text-white/50 text-sm">
                Movement unlocks capital. This is how it changes hands.
              </p>
            </div>

            {/* Impact card */}
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_60px_rgba(255,210,143,0.08)]">
              {/* Nonprofit header */}
              {(nonprofitName || nonprofitLogo) && (
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/8">
                  {nonprofitLogo && (
                    <img src={nonprofitLogo} alt={nonprofitName ?? ""} className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Beneficiary</div>
                    <div className="font-semibold">{nonprofitName}</div>
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Unlocked</div>
                  <div className="text-[#FFD28F] text-3xl font-bold leading-none">{money(amt)}</div>
                  <div className="text-xs text-white/30 mt-1">pending approval</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Distance</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white text-3xl font-bold leading-none">{milesStr(dist)}</span>
                    <span className="text-white/40 text-sm">mi</span>
                  </div>
                  <div className="text-xs text-white/30 mt-1">verified movement</div>
                </div>
              </div>

              {/* Challenge title */}
              <div className="rounded-2xl bg-white/4 px-4 py-3">
                <div className="text-xs text-white/35 mb-0.5">Challenge</div>
                <div className="font-medium text-sm">{title}</div>
                {row.id && (
                  <div className="text-[10px] text-white/20 mt-1">#{row.id.slice(0, 8)}</div>
                )}
              </div>
            </div>

            {/* Share section */}
            <div className="mt-6 rounded-3xl bg-white/4 ring-1 ring-white/8 p-5">
              <div className="text-sm font-semibold mb-1">Share Your Win</div>
              <p className="text-xs text-white/45 mb-4">
                Screenshot your story card and share it — or copy a link to inspire your crew.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 rounded-2xl bg-[#FF9B6A] py-3.5 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] hover:shadow-[0_10px_36px_rgba(255,155,106,0.35)] active:scale-[0.98] transition-all"
                >
                  {copied ? "Link Copied ✓" : "Share Your Win →"}
                </button>
                <button
                  onClick={handleDownloadCard}
                  className="flex-1 rounded-2xl bg-transparent py-3.5 text-sm ring-1 ring-white/15 text-white/70 hover:ring-white/25 hover:text-white transition"
                >
                  View Story Card ↗
                </button>
              </div>
            </div>

            {/* Nav actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/challenges"
                className="flex-1 inline-flex items-center justify-center rounded-full bg-[#FFD28F] px-5 py-3 text-sm font-semibold text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,210,143,0.18)] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all"
              >
                Claim Another →
              </Link>
              <Link
                href="/athlete"
                className="flex-1 inline-flex items-center justify-center rounded-full bg-transparent px-5 py-3 text-sm ring-1 ring-white/15 text-white/70 hover:ring-white/25 hover:text-white transition"
              >
                My Impact Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
