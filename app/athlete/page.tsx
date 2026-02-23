"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Athlete = {
  id: string;
  display_name: string | null;
  username: string | null;
  location: string | null;
  age_bracket: string | null;
};

type ActiveClaimMini = {
  id: string;
  amount_cents_snapshot: number;
  distance_miles_snapshot: number;
};

type ApprovedHistoryRow = {
  id: string;
  verified_at: string | null;
  amount_cents_snapshot: number | null;
  distance_miles_snapshot: number | null;
  challenges?: {
    id: string;
    title: string | null;
  } | null;
};

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function miles(v: number) {
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} mi`;
}

export default function AthletePage() {
  const router = useRouter();

  // ✅ DEFERRED SUPABASE CLIENT (browser-only, after mount)
  const [supabase, setSupabase] = useState<
    ReturnType<typeof createSupabaseBrowserClient> | null
  >(null);

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient({ persistSession: true }));
  }, []);

  const [athlete, setAthlete] = useState<Athlete | null>(null);
const [activeClaim, setActiveClaim] = useState<ActiveClaimMini | null>(null);
const [approvedHistory, setApprovedHistory] = useState<ApprovedHistoryRow[]>([]);
const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (!supabase) return;
    loadAthlete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

    async function loadAthlete() {
    if (!supabase) return; // ✅ wait for browser client

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        router.replace("/authorization");
        return;
      }

      const { data, error } = await supabase
        .from("athletes")
        .select("id, display_name, username, location, age_bracket")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        setLoading(false);
        router.replace("/onboarding");
        return;
      }

      setAthlete(data);

      // 🔑 Load active claim (claimed only)
      const { data: claim } = await supabase
        .from("claims")
        .select("id, amount_cents_snapshot, distance_miles_snapshot")
        .eq("athlete_id", session.user.id)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (claim) {
        setActiveClaim(claim as ActiveClaimMini);
      } else {
        setActiveClaim(null);
      }

      // ✅ Load approved history (approved only)
      const { data: history } = await supabase
        .from("claims")
        .select(
          `
            id,
            verified_at,
            amount_cents_snapshot,
            distance_miles_snapshot,
            challenges (
              id,
              title
            )
          `
        )
        .eq("athlete_id", session.user.id)
        .eq("status", "approved")
        .order("verified_at", { ascending: false })
        .limit(10);

      const normalized: ApprovedHistoryRow[] = ((history as any[]) ?? []).map(
        (r) => ({
          id: String(r.id),
          verified_at: r.verified_at ?? null,
          amount_cents_snapshot:
            typeof r.amount_cents_snapshot === "number"
              ? r.amount_cents_snapshot
              : null,
          distance_miles_snapshot:
            typeof r.distance_miles_snapshot === "number"
              ? r.distance_miles_snapshot
              : null,
          challenges: r.challenges
            ? { id: String(r.challenges.id), title: r.challenges.title ?? null }
            : null,
        })
      );

      setApprovedHistory(normalized);

      setLoading(false);
    } catch (err) {
      console.error("[athlete] load failed", err);
      setLoading(false);
    }
  }

  async function handleLogout() {

    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/authorization");
  }

  // ✅ hard safety net (prevents browser-client error on first render)
  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </main>
    );
  }

  if (!athlete) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0b0f1c] text-white px-4 py-12">
      <div className="mx-auto max-w-xl space-y-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="h-28 w-28 rounded-full bg-gradient-to-b from-[#FFD28F] to-[#BFA46A] p-[1px]">
              <div className="h-full w-full rounded-full bg-[#0b0f1c] flex items-center justify-center text-3xl font-semibold">
                {athlete.display_name?.[0] ?? "A"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              {athlete.display_name}
            </h1>

            {athlete.username && (
              <p className="text-[#FFD28F] font-medium">@{athlete.username}</p>
            )}

            <p className="text-white/60 text-sm">
              STRAVA <span className="opacity-70">Connected</span>
            </p>

            {(athlete.location || athlete.age_bracket) && (
              <p className="text-white/50 text-sm">
                {[athlete.location, athlete.age_bracket]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* ✅ Active Challenge Module */}
        {activeClaim && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-white/55">Active Challenge</div>
                <div className="mt-2 flex gap-2 text-sm text-white/70">
                  <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                    {miles(activeClaim.distance_miles_snapshot)}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                    {money(activeClaim.amount_cents_snapshot)} unlocked
                  </span>
                </div>
              </div>

              <Link
                href="/activechallenge"
                className="rounded-full bg-[#FFD28F] px-4 py-2 text-sm font-medium text-[#0B0F1C] hover:bg-[#FEC56B] transition"
              >
                View →
              </Link>
            </div>
          </div>
        )}

        {/* Stats Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
            <div className="p-5">
              <div className="text-2xl font-semibold">0</div>
              <div className="text-xs text-white/60 mt-1">
                Challenges Completed
              </div>
            </div>

            <div className="p-5">
              <div className="text-2xl font-semibold">$0</div>
              <div className="text-xs text-white/60 mt-1">Money Unlocked</div>
            </div>

            <div className="p-5">
              <div className="text-2xl font-semibold">0</div>
              <div className="text-xs text-white/60 mt-1">Orgs Supported</div>
            </div>
          </div>
        </div>

        {/* History */}
<div className="space-y-4">
  <h2 className="text-lg font-semibold">History</h2>

  {approvedHistory.length === 0 ? (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/60">
      No completed challenges yet.
    </div>
  ) : (
    <div className="space-y-3">
      {approvedHistory.map((row) => {
        const title = row.challenges?.title ?? "Completed challenge";
        const amt = row.amount_cents_snapshot ?? 0;
        const dist = row.distance_miles_snapshot ?? 0;

        return (
          <Link
            key={row.id}
            href={`/challengecomplete/${row.id}`}
            className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 transition"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{title}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/60">
                <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                  {miles(dist)}
                </span>
                <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                  {money(amt)} unlocked
                </span>
              </div>
            </div>

            <div className="text-white/40 text-sm">{">"}</div>
          </Link>
        );
      })}
    </div>
  )}
</div>

        {/* Actions */}
        <div className="pt-2 space-y-4">
          <button
            onClick={() => router.push("/challenges")}
            className="w-full rounded-full bg-[#FFCC88] text-black font-medium py-4 hover:bg-[#FEC56B] transition shadow-[0_0_25px_rgba(255,204,136,0.35)]"
          >
            Browse Challenges
          </button>

          <button
            onClick={handleLogout}
            className="block w-full text-sm text-white/50 underline"
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}
