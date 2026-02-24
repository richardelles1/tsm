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
  photo_url: string | null;
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
    nonprofit_id: string | null;
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

  const [uploading, setUploading] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    loadAthlete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadAthlete() {
    if (!supabase) return;

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
        .select("id, display_name, username, location, age_bracket, photo_url")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        setLoading(false);
        router.replace("/onboarding");
        return;
      }

      setAthlete(data);

      const { data: claim } = await supabase
        .from("claims")
        .select("id, amount_cents_snapshot, distance_miles_snapshot")
        .eq("athlete_id", session.user.id)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setActiveClaim(claim ? (claim as ActiveClaimMini) : null);

      const { data: history } = await supabase
        .from("claims")
        .select(
          `
            id,
            verified_at,
            amount_cents_snapshot,
            distance_miles_snapshot,
            challenges:challenge_id (
              id,
              title,
              nonprofit_id
            )
          `
        )
        .eq("athlete_id", session.user.id)
        .eq("status", "approved")
        .order("verified_at", { ascending: false })
        .limit(50);

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
            ? {
                id: String(r.challenges.id),
                title: r.challenges.title ?? null,
                nonprofit_id: r.challenges.nonprofit_id ?? null,
              }
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

  async function handlePhotoUpload(file: File) {
    if (!supabase || !athlete) return;

    try {
      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const filePath = `${athlete.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("athlete-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("athlete-photos")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      const { data: updateData, error: updateError } = await supabase
  .from("athletes")
  .update({ photo_url: publicUrl })
  .eq("id", athlete.id)
  .select()
  .single();

console.log("PHOTO UPDATE DATA:", updateData);
console.log("PHOTO UPDATE ERROR:", updateError);

if (updateError) throw updateError;

setAthlete((prev) =>
  prev ? { ...prev, photo_url: publicUrl } : prev
);

await loadAthlete();   } catch (err) {
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
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </main>
    );
  }

  if (!athlete) return null;

  const challengesCompleted = approvedHistory.length;

  const totalUnlockedCents = approvedHistory.reduce(
    (sum, row) => sum + (row.amount_cents_snapshot ?? 0),
    0
  );

  const uniqueNonprofits = new Set(
    approvedHistory
      .map((row) => row.challenges?.nonprofit_id)
      .filter(Boolean)
  );

  const orgsSupported = uniqueNonprofits.size;

  const historyToDisplay = showAllHistory
    ? approvedHistory
    : approvedHistory.slice(0, 3);

  return (
    <main className="min-h-screen bg-[#0b0f1c] text-white px-4 py-12">
      <div className="mx-auto max-w-xl space-y-12">
        {/* Profile */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="h-28 w-28 rounded-full bg-gradient-to-b from-[#FFD28F] to-[#BFA46A] p-[1px]">
              <div className="h-full w-full rounded-full bg-[#0b0f1c] overflow-hidden flex items-center justify-center text-3xl font-semibold">
                {athlete.photo_url ? (
                  <img
  src={`${athlete.photo_url}?t=${Date.now()}`}
  alt="Profile"
  className="h-full w-full object-cover"
/>
                ) : (
                  athlete.display_name?.[0] ?? "A"
                )}
              </div>
            </div>
          </div>

          <label className="text-xs text-[#FFD28F] cursor-pointer">
            {uploading ? "Uploading..." : "Change Photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file);
              }}
            />
          </label>

          <div>
            <h1 className="text-3xl font-semibold">
              {athlete.display_name}
            </h1>
            {athlete.username && (
              <p className="text-[#FFD28F]">@{athlete.username}</p>
            )}
            <p className="text-white/60 text-sm">
              STRAVA Connected
            </p>
            <p className="text-white/50 text-sm">
              {[athlete.location, athlete.age_bracket]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
          <div className="p-5">
            <div className="text-2xl font-semibold">
              {challengesCompleted}
            </div>
            <div className="text-xs text-white/60">
              Challenges Completed
            </div>
          </div>
          <div className="p-5">
            <div className="text-2xl font-semibold">
              {money(totalUnlockedCents)}
            </div>
            <div className="text-xs text-white/60">
              Money Unlocked
            </div>
          </div>
          <div className="p-5">
            <div className="text-2xl font-semibold">
              {orgsSupported}
            </div>
            <div className="text-xs text-white/60">
              Orgs Supported
            </div>
          </div>
        </div>

        {/* Active Claim */}
        {activeClaim && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Active Challenge</h2>

            <Link
              href={`/verify/${activeClaim.id}`}
              className="flex items-center justify-between rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 hover:ring-white/20 transition shadow-[0_0_34px_10px_rgba(0,0,0,0.30)]"
            >
              <div>
                <div className="text-xs text-white/55">
                  Status: Claimed
                </div>

                <div className="mt-1 text-base font-medium">
                  {miles(activeClaim.distance_miles_snapshot)} •{" "}
                  {money(activeClaim.amount_cents_snapshot)} unlocked
                </div>
              </div>

              <div className="text-[#FFD28F] text-sm font-medium">
                Verify →
              </div>
            </Link>
          </div>
        )}

        {/* History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">History</h2>

          {historyToDisplay.map((row) => {
            const title = row.challenges?.title ?? "Completed challenge";
            const amt = row.amount_cents_snapshot ?? 0;
            const dist = row.distance_miles_snapshot ?? 0;

            return (
              <Link
                key={row.id}
                href={`/challengecomplete/${row.id}`}
                className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 transition"
              >
                <div>
                  <div className="text-sm font-medium truncate">
                    {title}
                  </div>
                  <div className="mt-1 flex gap-2 text-xs text-white/60">
                    <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                      {miles(dist)}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                      {money(amt)} unlocked
                    </span>
                  </div>
                </div>
                <div className="text-white/40">{">"}</div>
              </Link>
            );
          })}

          {approvedHistory.length > 3 && (
            <button
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="text-sm text-[#FFD28F] underline"
            >
              {showAllHistory ? "Show Less" : "View All"}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => router.push("/challenges")}
            className="w-full rounded-full bg-[#FFCC88] text-black font-medium py-4 hover:bg-[#FEC56B] transition"
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