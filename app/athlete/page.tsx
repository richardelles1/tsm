"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import FirstVisitOverlay from "@/components/FirstVisitOverlay";

const ATHLETE_TOUR_STEPS = [
  { label: "Active Challenge", description: "What you're working on right now", color: "#FF9B6A" },
  { label: "Total Unlocked", description: "Your running impact total, across every challenge you've completed", color: "#FFD28F" },
  { label: "Keep Going", description: "New challenges open regularly. Each completion adds to your permanent record", color: "#C4EBF2" },
];

type Athlete = {
  id: string;
  display_name: string | null;
  username: string | null;
  location: string | null;
  age_bracket: string | null;
  photo_url: string | null;
};

type ActiveClaimMini = {
  id: string;
  amount_cents_snapshot: number;
  distance_miles_snapshot: number;
  challenges?: { title: string | null } | null;
};

type ApprovedHistoryRow = {
  id: string;
  verified_at: string | null;
  amount_cents_snapshot: number | null;
  distance_miles_snapshot: number | null;
  challenges?: {
    id: string;
    title: string | null;
    nonprofit_id: string | null;
    nonprofits?: { name: string | null } | null;
  } | null;
};

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function milesDisp(v: number) {
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AthletePage() {
  const router = useRouter();

  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  useEffect(() => { setSupabase(createSupabaseBrowserClient({ persistSession: true })); }, []);

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [activeClaim, setActiveClaim] = useState<ActiveClaimMini | null>(null);
  const [approvedHistory, setApprovedHistory] = useState<ApprovedHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    loadAthlete();
  }, [supabase]);

  async function loadAthlete() {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); router.replace("/authorization"); return; }

      const { data, error } = await supabase
        .from("athletes")
        .select("id, display_name, username, location, age_bracket, photo_url")
        .eq("id", session.user.id)
        .single();

      if (error || !data) { setLoading(false); router.replace("/onboarding"); return; }
      setAthlete(data);

      const { data: claim } = await supabase
        .from("claims")
        .select("id, amount_cents_snapshot, distance_miles_snapshot, challenges:challenge_id(title)")
        .eq("athlete_id", session.user.id)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setActiveClaim(claim ? (claim as any) : null);

      const { data: history } = await supabase
        .from("claims")
        .select(`
          id,
          verified_at,
          amount_cents_snapshot,
          distance_miles_snapshot,
          challenges:challenge_id (
            id,
            title,
            nonprofit_id,
            nonprofits:nonprofit_id ( name )
          )
        `)
        .eq("athlete_id", session.user.id)
        .eq("status", "approved")
        .order("verified_at", { ascending: false })
        .limit(50);

      const normalized: ApprovedHistoryRow[] = ((history as any[]) ?? []).map((r) => ({
        id: String(r.id),
        verified_at: r.verified_at ?? null,
        amount_cents_snapshot: typeof r.amount_cents_snapshot === "number" ? r.amount_cents_snapshot : null,
        distance_miles_snapshot: typeof r.distance_miles_snapshot === "number" ? r.distance_miles_snapshot : null,
        challenges: r.challenges ? {
          id: String(r.challenges.id),
          title: r.challenges.title ?? null,
          nonprofit_id: r.challenges.nonprofit_id ?? null,
          nonprofits: r.challenges.nonprofits ? { name: r.challenges.nonprofits.name ?? null } : null,
        } : null,
      }));

      setApprovedHistory(normalized);
      setLoading(false);
    } catch (err) {
      console.error("[athlete] load failed", err);
      setLoading(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!supabase || !athlete) return;
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${athlete.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("athlete-photos").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("athlete-photos").getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("athletes").update({ photo_url: data.publicUrl }).eq("id", athlete.id).select().single();
      if (updateError) throw updateError;
      setAthlete((prev) => prev ? { ...prev, photo_url: data.publicUrl } : prev);
      await loadAthlete();
    } catch (err) {
      console.error("Photo upload failed", err);
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/authorization");
  }

  if (!supabase || loading) {
    return <main className="min-h-screen flex items-center justify-center text-white bg-[#070A12]">Loading…</main>;
  }

  if (!athlete) return null;

  const totalUnlockedCents = approvedHistory.reduce((sum, r) => sum + (r.amount_cents_snapshot ?? 0), 0);
  const totalMiles = approvedHistory.reduce((sum, r) => sum + (r.distance_miles_snapshot ?? 0), 0);
  const challengesCompleted = approvedHistory.length;
  const uniqueNonprofits = new Set(approvedHistory.map((r) => r.challenges?.nonprofit_id).filter(Boolean)).size;
  const historyToDisplay = showAll ? approvedHistory : approvedHistory.slice(0, 5);
  const displayName = athlete.display_name || (athlete.username ? `@${athlete.username}` : "Athlete");

  return (
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      <FirstVisitOverlay
        storageKey="tsm_tour_v1_athlete"
        title="Your impact hub"
        subtitle="Everything you've moved, in one place."
        steps={ATHLETE_TOUR_STEPS}
        ctaLabel="Got it"
      />
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.12),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.09),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-xl px-4 py-10 space-y-8">
        {/* Profile */}
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="relative group cursor-pointer">
            <label className="cursor-pointer">
              <div className="h-24 w-24 rounded-full bg-gradient-to-b from-[#FFD28F] to-[#BFA46A] p-[1.5px]">
                <div className="h-full w-full rounded-full bg-[#0B0F1C] overflow-hidden flex items-center justify-center text-2xl font-semibold">
                  {athlete.photo_url ? (
                    <img src={`${athlete.photo_url}?t=${Date.now()}`} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span>{athlete.display_name?.[0] ?? "A"}</span>
                  )}
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
            </label>
            <div className="mt-1.5 text-[10px] text-[#FFD28F]/70 tracking-wide">
              {uploading ? "Uploading…" : "Change photo"}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            {athlete.username && <p className="text-[#FFD28F] text-sm">@{athlete.username}</p>}
            <p className="text-white/40 text-xs mt-1">
              {[athlete.location, athlete.age_bracket].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {/* Hero stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl overflow-hidden"
        >
          <div className="px-5 pt-5 pb-2">
            <div className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Lifetime Impact</div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/8">
            <div className="px-5 py-4">
              <div className="text-[#FFD28F] text-3xl font-black tracking-tight leading-none">
                {money(totalUnlockedCents)}
              </div>
              <div className="text-xs text-white/40 mt-1.5">Funds Unlocked</div>
            </div>
            <div className="px-5 py-4">
              <div className="text-white text-3xl font-black tracking-tight leading-none">
                {milesDisp(totalMiles)}
                <span className="text-base text-white/40 font-medium ml-1">mi</span>
              </div>
              <div className="text-xs text-white/40 mt-1.5">Miles Moved</div>
            </div>
          </div>
          <div className="border-t border-white/8 grid grid-cols-2 divide-x divide-white/8">
            <div className="px-5 py-4">
              <div className="text-white text-2xl font-bold">{challengesCompleted}</div>
              <div className="text-xs text-white/40 mt-1">Challenges Done</div>
            </div>
            <div className="px-5 py-4">
              <div className="text-white text-2xl font-bold">{uniqueNonprofits}</div>
              <div className="text-xs text-white/40 mt-1">Orgs Supported</div>
            </div>
          </div>
        </motion.div>

        {/* Active claim */}
        {activeClaim && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <div className="text-xs font-bold tracking-[0.15em] text-white/35 uppercase mb-3">Active Challenge</div>
            <Link
              href="/activechallenge"
              className="flex items-center justify-between rounded-3xl bg-white/5 ring-1 ring-[#FF9B6A]/25 backdrop-blur-xl p-5 hover:ring-[#FF9B6A]/45 hover:bg-white/8 transition shadow-[0_0_30px_rgba(255,155,106,0.08)]"
            >
              <div>
                {(activeClaim.challenges as any)?.title && (
                  <div className="font-semibold mb-1 line-clamp-1">{(activeClaim.challenges as any).title}</div>
                )}
                <div className="text-sm text-white/55">
                  {milesDisp(activeClaim.distance_miles_snapshot)} mi · {money(activeClaim.amount_cents_snapshot)} at stake
                </div>
              </div>
              <div className="rounded-full bg-[#FF9B6A] px-4 py-2 text-xs font-bold text-[#0B0F1C] shrink-0 ml-3">
                View →
              </div>
            </Link>
          </motion.div>
        )}

        {/* History */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
          <div className="text-xs font-bold tracking-[0.15em] text-white/35 uppercase mb-3">Activity History</div>

          {approvedHistory.length === 0 ? (
            <div className="rounded-3xl bg-white/4 ring-1 ring-white/8 p-6 text-center">
              <p className="text-white/40 text-sm">No completed challenges yet.</p>
              <Link href="/challenges" className="mt-3 inline-block text-[#FFD28F] text-sm">
                Browse Challenges →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {historyToDisplay.map((row, i) => {
                const challengeTitle = row.challenges?.title ?? "Completed challenge";
                const nonprofitName = row.challenges?.nonprofits?.name ?? null;
                const amt = row.amount_cents_snapshot ?? 0;
                const dist = row.distance_miles_snapshot ?? 0;
                const date = formatDate(row.verified_at);

                return (
                  <Link
                    key={row.id}
                    href={`/challengecomplete/${row.id}`}
                    className="flex items-center gap-4 rounded-2xl bg-white/4 ring-1 ring-white/8 px-4 py-3.5 hover:bg-white/7 hover:ring-white/15 transition"
                  >
                    <div className="shrink-0 text-center w-8">
                      <div className="text-[#FFD28F] text-sm font-bold">{milesDisp(dist)}</div>
                      <div className="text-[9px] text-white/30">mi</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-1">{challengeTitle}</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {nonprofitName ? <span className="text-white/55">{nonprofitName} · </span> : null}
                        {date}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[#FFD28F] text-sm font-semibold">{money(amt)}</div>
                      <div className="text-[9px] text-white/25">unlocked</div>
                    </div>
                  </Link>
                );
              })}

              {approvedHistory.length > 5 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full text-xs text-white/40 hover:text-white/60 py-2 transition"
                >
                  {showAll ? "Show less ↑" : `Show all ${approvedHistory.length} ↓`}
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <div className="space-y-3 pb-8">
          <button
            onClick={() => router.push("/challenges")}
            className="w-full rounded-full bg-[#FFD28F] text-[#0B0F1C] font-bold py-4 shadow-[0_8px_30px_rgba(255,210,143,0.18)] hover:bg-[#FFB48E] hover:shadow-[0_10px_40px_rgba(255,210,143,0.28)] transition"
          >
            Browse Challenges →
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-white/30 hover:text-white/50 py-2 transition"
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}
