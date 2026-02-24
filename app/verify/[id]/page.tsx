"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ClaimWithChallenge = {
  id: string;
  athlete_id: string;
  challenge_id: string;
  status: "claimed" | "submitted" | "approved" | "rejected" | "expired" | "cancelled";
  claimed_at: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  expires_at: string | null;

  amount_cents_snapshot: number | null;
  distance_miles_snapshot: number | null;

 // 👇 ADD THIS LINE
  verification_photo_url: string | null;

  challenges?: {
    id: string;
    title: string | null;
    description: string | null;
    activity: string | null;
    distance_miles: number | null;
    amount_cents: number | null;
  } | null;
};

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${Math.round(v / 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function miles(v?: number | null) {
  if (typeof v !== "number") return null;
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} mi`;
}

function prettyStatus(s?: string | null) {
  if (!s) return "Unknown";
  if (s === "claimed") return "Claimed";
  if (s === "submitted") return "Submitted";
  if (s === "approved") return "Completed";
  if (s === "rejected") return "Rejected";
  if (s === "expired") return "Expired";
  if (s === "cancelled") return "Cancelled";
  return s;
}

export default function VerifyPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const claimId = params?.id;

  // ✅ DEFERRED SUPABASE CLIENT (avoid “must only be used in the browser” runtime)
  const [supabase, setSupabase] = useState<
    ReturnType<typeof createSupabaseBrowserClient> | null
  >(null);

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient({ persistSession: true }));
  }, []);

  const [loading, setLoading] = useState(true);
  const [athleteName, setAthleteName] = useState<string>("");
  const [claim, setClaim] = useState<ClaimWithChallenge | null>(null);

const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function loadClaim(userId: string) {
      if (!claimId) return;

      setLoading(true);
      setError(null);

      const { data, error } = await sb
        .from("claims")
        .select(
          `
          id,
          athlete_id,
          challenge_id,
          status,
          claimed_at,
          submitted_at,
          verified_at,
          expires_at,
          amount_cents_snapshot,
          distance_miles_snapshot,
          challenges (
            id,
            title,
            description,
            activity,
            distance_miles,
            amount_cents
          )
        `
        )
        .eq("id", claimId)
        .eq("athlete_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setClaim(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Claim not found (or not yours).");
        setClaim(null);
        setLoading(false);
        return;
      }

      setClaim(data as unknown as ClaimWithChallenge);
      setLoading(false);
    }

    async function runWithUser(user: { id: string }) {
      const { data: a, error: aErr } = await sb
        .from("athletes")
        .select("display_name, username, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (aErr || !a || !a.onboarding_completed) {
        router.replace("/onboarding");
        return;
      }

      setAthleteName(a.display_name || (a.username ? `@${a.username}` : "Athlete"));
      await loadClaim(user.id);
    }

    const { data: listener } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      const u = session?.user;
      if (u) {
        if (timeoutId) clearTimeout(timeoutId);
        listener.subscription.unsubscribe();
        await runWithUser(u);
      }
    });

    async function guard() {
      const firstUser = (await sb.auth.getUser()).data.user;

      if (firstUser) {
        if (timeoutId) clearTimeout(timeoutId);
        listener.subscription.unsubscribe();
        await runWithUser(firstUser);
        return;
      }

      timeoutId = setTimeout(() => {
        if (cancelled) return;
        listener.subscription.unsubscribe();
        router.replace("/authorization");
      }, 1200);
    }

    guard();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, [router, supabase, claimId]);

  // NEW
async function handleScreenshotUpload(file: File) {
  if (!supabase || !claim) return;

  setUploading(true);
  setUploadError(null);

  try {
    const fileExt = file.name.split(".").pop();
    const filePath = `${claim.id}.${fileExt}`;

    // 1️⃣ Upload
    const { error: uploadErr } = await supabase.storage
      .from("claim-verifications")
      .upload(filePath, file, { upsert: true });

    if (uploadErr) throw uploadErr;

    // 2️⃣ Get public URL
    const { data } = supabase.storage
      .from("claim-verifications")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    // 3️⃣ Update claim
    const { data: updatedClaim, error: updateErr } = await supabase
      .from("claims")
      .update({
        verification_photo_url: publicUrl,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", claim.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 4️⃣ Update local state immediately
    setClaim(updatedClaim as ClaimWithChallenge);
  } catch (e: any) {
    setUploadError(e?.message || "Upload failed.");
  } finally {
    setUploading(false);
  }
}

async function handleReleaseClaim() {
  if (!supabase || !claim) return;

  try {
    const { error: updateErr } = await supabase
      .from("claims")
      .update({ status: "cancelled" })
      .eq("id", claim.id);

    if (updateErr) throw updateErr;

    router.replace("/athlete");
  } catch (e: any) {
    setError(e?.message || "Failed to release claim.");
  }
}


  // ✅ safety net
  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </main>
    );
  }

  const title = claim?.challenges?.title ?? "Verify activity";
  const desc = claim?.challenges?.description ?? null;

  const amount =
    claim?.amount_cents_snapshot ?? claim?.challenges?.amount_cents ?? null;

  const dist =
    claim?.distance_miles_snapshot ?? claim?.challenges?.distance_miles ?? null;

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-14">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60">Verify</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {athleteName ? `${athleteName}, close the loop.` : "Close the loop."}
            </h1>
          </div>

          <Link
            href="/activechallenge"
            className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            ← Back
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
            <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="mt-6 h-12 w-full animate-pulse rounded-2xl bg-white/10" />
          </div>
        ) : !claim ? (
          <div className="mt-8 rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 text-white/70">
            No claim found.
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_34px_10px_rgba(0,0,0,0.30)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-white/55">
                    Status: {prettyStatus(claim.status)}
                  </div>

                  <h2 className="mt-1 text-xl md:text-2xl font-semibold tracking-tight truncate">
                    {title}
                  </h2>

                  {desc ? (
                    <p className="mt-2 text-sm text-white/70 line-clamp-3">
                      {desc}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/70">
                    {miles(dist) ? (
                      <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                        {miles(dist)}
                      </span>
                    ) : null}
                    {amount != null ? (
                      <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                        {money(amount)} unlocked
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[#FFD28F] text-2xl font-semibold">
                    {money(amount)}
                  </div>
                  <div className="text-xs text-white/55">
                    claim #{claim.id.slice(0, 8)}
                  </div>
                </div>
              </div>

              {/* Screenshot-first verification */}
<div className="mt-6 flex flex-col gap-4">
  {claim.status === "claimed" && (
    <>
      <div className="text-xs text-white/60">
        Upload a screenshot of your completed activity to submit for review.
      </div>

      <label className="inline-flex items-center justify-center rounded-full bg-[#FFD28F] px-5 py-3 text-sm font-medium text-[#0B0F1C] hover:bg-[#FEC56B] cursor-pointer transition">
        {uploading ? "Uploading…" : "Upload Screenshot"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleScreenshotUpload(file);
          }}
        />
      </label>

      <button
        onClick={handleReleaseClaim}
        className="text-sm text-white/50 underline hover:text-white/70 transition"
      >
        Release this claim
      </button>

      {uploadError && (
        <div className="text-sm text-red-400">{uploadError}</div>
      )}
    </>
  )}

  {claim.status === "submitted" && (
  <div className="flex flex-col gap-3">
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 text-sm text-white/70">
      Screenshot submitted. Awaiting review.
    </div>

    {claim.verification_photo_url && (
      <img
        src={claim.verification_photo_url}
        alt="Submitted verification"
        className="rounded-xl ring-1 ring-white/10 max-h-64 object-contain"
      />
    )}

    <button
      onClick={handleReleaseClaim}
      className="text-sm text-white/50 underline hover:text-white/70 transition"
    >
      Withdraw submission
    </button>
  </div>
)}

  {claim.status === "approved" && (
    <div className="rounded-2xl bg-green-500/10 ring-1 ring-green-500/30 p-4 text-sm text-green-200">
      Verified ✓ Challenge completed.
    </div>
  )}

  {claim.status === "rejected" && (
    <div className="rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 p-4 text-sm text-red-200">
      Submission rejected. Please upload again.
    </div>
  )}

  
</div>


            </div>

            <div className="mt-6 flex justify-end">
              <Link
                href="/athlete"
                className="inline-flex items-center justify-center rounded-full bg-[#0D1326] px-5 py-3 text-sm ring-1 ring-[#FFD28F]/25 hover:ring-[#FFD28F]/45 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.18)] transition"
              >
                Back to Athlete
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
