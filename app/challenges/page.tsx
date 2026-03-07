"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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

type TickerItem = {
  id: string;
  challengeTitle: string;
};

const ACTIVITY_CONFIG: Record<string, { label: string; color: string; glow: string; accent: string }> = {
  run:   { label: "RUN",   color: "text-[#FF9B6A]", glow: "rgba(255,155,106,0.20)", accent: "#FF9B6A" },
  walk:  { label: "WALK",  color: "text-[#C4EBF2]", glow: "rgba(196,235,242,0.15)", accent: "#C4EBF2" },
  cycle: { label: "CYCLE", color: "text-[#FFD28F]", glow: "rgba(255,210,143,0.20)", accent: "#FFD28F" },
};

function getActivity(a: string | null | undefined) {
  return ACTIVITY_CONFIG[(a ?? "").toLowerCase()] ?? { label: (a ?? "MOVE").toUpperCase(), color: "text-white/70", glow: "rgba(255,255,255,0.10)", accent: "rgba(255,255,255,0.4)" };
}

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${(v / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function miles(v?: number | null) {
  if (typeof v !== "number") return null;
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}`;
}

function SlotBadge({ left, total }: { left: number; total: number }) {
  const isLow = left > 0 && left <= 3;
  const isFull = left >= total && total > 0;
  if (isFull) return <span className="text-xs text-white/35">{left} / {total} slots</span>;
  if (isLow) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FF9B6A]/15 px-2 py-0.5 text-xs text-[#FF9B6A] ring-1 ring-[#FF9B6A]/30 animate-pulse">
      ⚡ {left} left
    </span>
  );
  return <span className="text-xs text-white/40">{left} slot{left !== 1 ? "s" : ""} left</span>;
}

export default function ChallengesPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [rows, setRows] = useState<ChallengeBoardRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasActiveClaim, setHasActiveClaim] = useState(false);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [ticker, setTicker] = useState<TickerItem[]>([]);
  const tickerTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const supabase = useMemo(() => {
    if (!url || !anon) return null;
    return createClient(url, anon);
  }, [url, anon]);

  function addTicker(item: TickerItem) {
    setTicker((prev) => [item, ...prev].slice(0, 3));
    const t = setTimeout(() => {
      setTicker((prev) => prev.filter((x) => x.id !== item.id));
      tickerTimers.current.delete(item.id);
    }, 4500);
    tickerTimers.current.set(item.id, t);
  }

  async function handleReserve(c: ChallengeBoardRow) {
    if (!supabase || reservingId) return;
    setReservingId(c.challenge_id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/authorization"; return; }

    if (c.amount_cents == null || c.distance_miles == null) {
      alert("Challenge missing required data.");
      setReservingId(null);
      return;
    }

    await supabase
      .from("claims")
      .update({ status: "expired", expires_at: new Date().toISOString() })
      .eq("athlete_id", user.id)
      .eq("status", "reserved");

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

    if (error) { alert(error.message); setReservingId(null); return; }
    window.location.href = `/claim/${c.challenge_id}`;
  }

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    async function init() {
      const { data, error } = await client
        .from("Challenge_Board_View")
        .select("*")
        .gt("slots_left", 0)
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (error) setErrorMsg(error.message);
        setRows((data as ChallengeBoardRow[]) ?? []);
      }

      const { data: { user } } = await client.auth.getUser();
      if (!user || cancelled) { if (!cancelled) setHasActiveClaim(false); return; }

      const { data: athlete } = await client
        .from("athletes")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!athlete?.id || cancelled) { if (!cancelled) setHasActiveClaim(false); return; }

      const { data: activeClaim } = await client
        .from("claims")
        .select("id")
        .eq("athlete_id", athlete.id)
        .in("status", ["claimed", "submitted"])
        .limit(1);

      if (!cancelled) setHasActiveClaim(!!activeClaim?.length);
    }

    init();

    const channel = client
      .channel("challenge-board-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "challenges" },
        (payload: any) => {
          const updatedId = payload.new?.id;
          if (!updatedId) return;
          const slotsTotal = payload.new?.slots_total ?? 0;
          const slotsClaimed = payload.new?.slots_claimed ?? 0;
          const slotsLeft = slotsTotal - slotsClaimed;

          if (slotsLeft <= 0) {
            setRows((prev) => prev.filter((r) => r.challenge_id !== updatedId));
          } else {
            setRows((prev) =>
              prev.map((r) =>
                r.challenge_id === updatedId
                  ? { ...r, slots_claimed: slotsClaimed, slots_left: slotsLeft }
                  : r
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "claims" },
        (payload: any) => {
          const challengeId = payload.new?.challenge_id;
          if (!challengeId) return;
          setRows((current) => {
            const match = current.find((r) => r.challenge_id === challengeId);
            if (match?.title) {
              addTicker({ id: `${Date.now()}-${Math.random()}`, challengeTitle: match.title });
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
      tickerTimers.current.forEach((t) => clearTimeout(t));
    };
  }, [supabase]);

  return (
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.10),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-[0.22em] text-white/35 uppercase mb-1">The Shared Mile</div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              MILES <span className="text-[#FFD28F]">★</span> MARKETPLACE
            </h1>
            <p className="mt-2 text-sm text-white/50 max-w-xs">
              Claim a challenge. Move. Unlock real funding for nonprofits.
            </p>
          </div>
          <Link
            href="/athlete"
            className="self-start sm:self-auto rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            My Impact →
          </Link>
        </div>

        {/* Live ticker */}
        <div className="mt-5 min-h-[2rem]">
          <AnimatePresence>
            {ticker.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 8 }}
                exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs text-white/60 ring-1 ring-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9B6A] animate-pulse shrink-0" />
                  Someone just claimed <span className="text-white font-medium">{item.challengeTitle}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 p-4 text-sm text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Board */}
        <div className="relative">
          {rows.length === 0 && !errorMsg && (
            <div className="mt-16 text-center text-white/35 text-sm">
              No challenges available right now. Check back soon.
            </div>
          )}

          <AnimatePresence mode="popLayout">
            <div className="grid gap-4 sm:grid-cols-2">
              {rows.map((c, i) => {
                const act = getActivity(c.activity);
                const dist = miles(c.distance_miles);
                const base = money(c.amount_cents);
                const impact = money(c.impact_cents_estimate ?? c.amount_cents);
                const slotsLeft = c.slots_left ?? 0;
                const slotsTotal = c.slots_total ?? 0;
                const hasMatch = !!c.corporate_partner_name;
                const isReserving = reservingId === c.challenge_id;

                return (
                  <motion.div
                    key={c.challenge_id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.3) }}
                    className="relative rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl overflow-hidden"
                    whileHover={{ boxShadow: `0 8px 40px 0 ${act.glow}`, scale: 1.005 }}
                  >
                    {/* Activity color accent strip */}
                    <div className="h-0.5 w-full" style={{ background: act.accent }} />

                    <div className="p-5 sm:p-6 flex flex-col gap-4">
                      {/* Activity + slots + matched badge — all in one row, no overlap */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black tracking-[0.20em] uppercase shrink-0 ${act.color}`}>
                          {act.label}
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          {hasMatch && (
                            <span className="shrink-0 rounded-full bg-gradient-to-br from-[#FFD28F]/20 to-[#FFD28F]/5 px-2.5 py-0.5 text-[9px] font-black tracking-[0.15em] text-[#FFD28F] ring-1 ring-[#FFD28F]/25">
                              MATCHED
                            </span>
                          )}
                          <SlotBadge left={slotsLeft} total={slotsTotal} />
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <h2 className="text-base sm:text-lg font-semibold leading-snug line-clamp-2">
                          {c.title ?? "Untitled Challenge"}
                        </h2>
                        {c.description && (
                          <p className="mt-1 text-xs text-white/45 line-clamp-2">{c.description}</p>
                        )}
                      </div>

                      {/* Distance commitment */}
                      {dist && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black tracking-tighter text-white leading-none">
                            {dist}
                          </span>
                          <span className="text-sm text-white/45 font-medium pb-1">miles</span>
                        </div>
                      )}

                      {/* Money block + stacked logos */}
                      <div className="flex items-end justify-between gap-3">
                        {/* Left: money text */}
                        <div className="min-w-0">
                          <div className="text-[#FFD28F] text-3xl font-semibold leading-none">
                            {base}
                          </div>
                          {hasMatch && (
                            <div className="mt-1 text-xs text-white/45">
                              {impact} with match
                            </div>
                          )}
                          <div className="mt-1 text-xs text-white/35">unlocked on approval</div>
                        </div>

                        {/* Right: stacked nonprofit + PMP logos */}
                        {(c.nonprofit_name || hasMatch) && (
                          <div className="flex flex-col items-center shrink-0">
                            {/* Nonprofit logo or letter avatar */}
                            {c.nonprofit_logo_url ? (
                              <img
                                src={c.nonprofit_logo_url}
                                alt={c.nonprofit_name ?? ""}
                                className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
                              />
                            ) : c.nonprofit_name ? (
                              <div className="h-10 w-10 rounded-full bg-white/10 ring-1 ring-white/15 flex items-center justify-center text-sm font-bold text-white/60">
                                {c.nonprofit_name.charAt(0).toUpperCase()}
                              </div>
                            ) : null}

                            {/* PMP badge — overlaps slightly */}
                            {hasMatch && c.corporate_partner_name && (
                              <div className="-mt-2 h-8 w-8 rounded-full bg-[#FFD28F]/10 ring-1 ring-[#FFD28F]/30 flex items-center justify-center text-[9px] font-black text-[#FFD28F] tracking-wide">
                                {c.corporate_partner_name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Beneficiary names row */}
                      {(c.nonprofit_name || c.corporate_partner_name) && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/6">
                          {c.nonprofit_name && (
                            <span className="text-xs text-white/65 font-medium">
                              {c.nonprofit_name}
                            </span>
                          )}
                          {hasMatch && c.corporate_partner_name && (
                            <>
                              <span className="text-white/20 text-xs">·</span>
                              <span className="text-[10px] text-white/35">
                                + {c.corporate_partner_name}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* CTA */}
                      <button
                        onClick={() => handleReserve(c)}
                        disabled={!!reservingId}
                        className="w-full rounded-2xl bg-[#FF9B6A] py-3.5 text-sm font-bold text-[#0B0F1C] tracking-wide shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] hover:shadow-[0_10px_36px_rgba(255,155,106,0.35)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isReserving ? "Claiming…" : "Claim Challenge →"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>

          {/* Active claim overlay */}
          {hasActiveClaim && !reservingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-start justify-center pt-16"
            >
              <div className="max-w-sm w-full mx-4 rounded-3xl bg-[#0B0F1C]/95 ring-1 ring-white/20 backdrop-blur-2xl p-8 text-center shadow-[0_0_60px_10px_rgba(0,0,0,0.60)]">
                <div className="text-4xl mb-3">🏃</div>
                <h2 className="text-xl font-semibold">You're Already in Motion</h2>
                <p className="mt-2 text-white/55 text-sm">
                  Complete your active challenge before claiming another.
                </p>
                <div className="mt-6">
                  <Link
                    href="/activechallenge"
                    className="inline-flex items-center justify-center w-full rounded-full bg-[#FFD28F] text-[#0B0F1C] px-6 py-3 font-bold hover:bg-[#FFB48E] transition"
                  >
                    Go Verify Activity →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-12 text-[10px] text-white/20 text-center tracking-[0.2em] uppercase">
          Live · Supabase Realtime
        </div>
      </div>
    </main>
  );
}
