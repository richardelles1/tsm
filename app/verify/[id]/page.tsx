"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ImpactBadge from "@/components/ImpactBadge";
import { ImpactStatement, pickStatement } from "@/lib/impactStatement";

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
  verification_photo_url: string | null;
  challenges?: {
    id: string;
    title: string | null;
    description: string | null;
    activity: string | null;
    distance_miles: number | null;
    amount_cents: number | null;
    nonprofit_id?: string | null;
    pinned_impact_statement?: ImpactStatement | null;
    nonprofits?: { id?: string | null; name: string | null; impact_statements?: ImpactStatement[] | null } | null;
  } | null;
};

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${Math.round(v / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function milesLabel(v?: number | null) {
  if (typeof v !== "number") return null;
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} mi`;
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function CheckDot({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-white/20 shrink-0" />
      <span className="text-xs text-white/30">{text}</span>
    </div>
  );
}

export default function VerifyPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const claimId = params?.id;

  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  useEffect(() => { setSupabase(createSupabaseBrowserClient({ persistSession: true })); }, []);

  const [loading, setLoading] = useState(true);
  const [athleteName, setAthleteName] = useState<string>("");
  const [claim, setClaim] = useState<ClaimWithChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rejectFileInputRef = useRef<HTMLInputElement>(null);

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
        .select(`
          id, athlete_id, challenge_id, status,
          claimed_at, submitted_at, verified_at, expires_at,
          amount_cents_snapshot, distance_miles_snapshot,
          verification_photo_url,
          challenges (
            id, title, description, activity, distance_miles, amount_cents,
            nonprofit_id, pinned_impact_statement,
            nonprofits ( id, name, impact_statements )
          )
        `)
        .eq("id", claimId)
        .eq("athlete_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) { setError(error.message); setClaim(null); setLoading(false); return; }
      if (!data) { setError("Claim not found (or not yours)."); setClaim(null); setLoading(false); return; }
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
      if (aErr || !a || !a.onboarding_completed) { router.replace("/onboarding"); return; }
      setAthleteName(a.display_name || (a.username ? `@${a.username}` : "Athlete"));
      await loadClaim(user.id);
    }

    const { data: listener } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      const u = session?.user;
      if (u) { if (timeoutId) clearTimeout(timeoutId); listener.subscription.unsubscribe(); await runWithUser(u); }
    });

    async function guard() {
      const firstUser = (await sb.auth.getUser()).data.user;
      if (firstUser) { if (timeoutId) clearTimeout(timeoutId); listener.subscription.unsubscribe(); await runWithUser(firstUser); return; }
      timeoutId = setTimeout(() => { if (cancelled) return; listener.subscription.unsubscribe(); router.replace("/authorization"); }, 1200);
    }

    guard();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); listener.subscription.unsubscribe(); };
  }, [router, supabase, claimId]);

  function handleFileSelect(file: File) {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPendingFile(file);
    setUploadError(null);
  }

  async function handleSubmitProof() {
    if (!supabase || !claim || !pendingFile) return;
    setUploading(true);
    setUploadError(null);

    try {
      const fileExt = pendingFile.name.split(".").pop();
      const filePath = `${claim.id}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("claim-verifications")
        .upload(filePath, pendingFile, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("claim-verifications").getPublicUrl(filePath);

      const { data: updatedClaim, error: updateErr } = await supabase
        .from("claims")
        .update({
          verification_photo_url: data.publicUrl,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", claim.id)
        .select(`
          id, athlete_id, challenge_id, status,
          claimed_at, submitted_at, verified_at, expires_at,
          amount_cents_snapshot, distance_miles_snapshot,
          verification_photo_url,
          challenges (
            id, title, description, activity, distance_miles, amount_cents,
            nonprofits ( name )
          )
        `)
        .single();

      if (updateErr) throw updateErr;
      setClaim(updatedClaim as unknown as ClaimWithChallenge);
      setPreviewUrl(null);
      setPendingFile(null);
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed. Please try again.");
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

  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070A12] text-white">
        <div className="h-1 w-24 rounded-full bg-white/10 animate-pulse" />
      </main>
    );
  }

  const title = claim?.challenges?.title ?? "Verify Activity";
  const amount = claim?.amount_cents_snapshot ?? claim?.challenges?.amount_cents ?? null;
  const dist = claim?.distance_miles_snapshot ?? claim?.challenges?.distance_miles ?? null;
  const activityType = claim?.challenges?.activity ?? null;
  const nonprofitName = (claim?.challenges as any)?.nonprofits?.name ?? null;
  const npoImpactStmts: ImpactStatement[] = (claim?.challenges?.nonprofits as any)?.impact_statements ?? [];
  const pinnedStmt: ImpactStatement | null = (claim?.challenges as any)?.pinned_impact_statement ?? null;
  const verifyImpactStmt = pinnedStmt ?? pickStatement(npoImpactStmts, claim?.challenge_id ?? "");

  return (
    <main className="min-h-screen bg-[#070A12] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.18),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.12),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-2xl px-5 py-14">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase mb-1">Verification</div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {athleteName ? `${athleteName}, close the loop.` : "Close the loop."}
            </h1>
          </div>
          <Link
            href="/activechallenge"
            className="rounded-full bg-white/5 px-4 py-2 text-xs ring-1 ring-white/10 hover:ring-white/20 transition shrink-0 mt-1"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 p-4 text-sm text-red-200">{error}</div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 space-y-4">
            <div className="h-5 w-1/3 animate-pulse rounded-full bg-white/10" />
            <div className="h-8 w-1/2 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/8" />
            <div className="mt-4 h-32 w-full animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : !claim ? (
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 text-center">
            <p className="text-white/50 text-sm">No claim found.</p>
            <Link href="/challenges" className="mt-4 inline-flex items-center justify-center rounded-full bg-[#FF9B6A] px-6 py-3 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition">
              Browse Challenges →
            </Link>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Challenge summary card */}
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight leading-snug truncate">{title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activityType && (
                      <span className="rounded-full bg-[#FF9B6A]/10 ring-1 ring-[#FF9B6A]/20 px-2.5 py-1 text-[11px] font-medium text-[#FF9B6A] uppercase tracking-wide">
                        {activityType}
                      </span>
                    )}
                    {milesLabel(dist) && (
                      <span className="rounded-full bg-white/5 ring-1 ring-white/10 px-2.5 py-1 text-[11px] text-white/55">
                        {milesLabel(dist)}
                      </span>
                    )}
                    {nonprofitName && (
                      <span className="rounded-full bg-white/5 ring-1 ring-white/10 px-2.5 py-1 text-[11px] text-white/55">
                        {nonprofitName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-black text-[#FFD28F]">{money(amount)}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">unlocking</div>
                </div>
              </div>
            </div>

            {/* STATUS: CLAIMED — two-path verification */}
            {claim.status === "claimed" && (
              <div className="space-y-4">
                <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase">
                  How would you like to verify?
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card A: Upload Proof */}
                  <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 flex flex-col gap-4">
                    <div className="h-[3px] w-8 rounded-full bg-[#FF9B6A]" />
                    <div className="flex items-center gap-3">
                      <CameraIcon className="w-5 h-5 text-[#FF9B6A]" />
                      <div>
                        <div className="text-sm font-semibold">Upload Proof</div>
                        <div className="text-xs text-white/45 mt-0.5">Screenshot from your activity app</div>
                      </div>
                    </div>

                    <p className="text-xs text-white/45 leading-relaxed">
                      A screenshot from Strava, Apple Fitness, Garmin, or any app works. We review and approve within 24 hours.
                    </p>

                    <div className="border-t border-white/8 pt-4 flex flex-col gap-3">
                      {previewUrl ? (
                        <>
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full max-h-40 object-contain rounded-xl ring-1 ring-white/10"
                          />
                          <button
                            onClick={handleSubmitProof}
                            disabled={uploading}
                            className="w-full rounded-full bg-[#FF9B6A] py-3 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {uploading ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0B0F1C]/30 border-t-[#0B0F1C] animate-spin" />
                                Submitting...
                              </span>
                            ) : "Submit Proof →"}
                          </button>
                          <button
                            onClick={() => { setPreviewUrl(null); setPendingFile(null); }}
                            className="text-xs text-white/30 hover:text-white/50 transition text-center"
                          >
                            Choose a different file
                          </button>
                        </>
                      ) : (
                        <label className="w-full rounded-full bg-[#FF9B6A] py-3 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition cursor-pointer flex items-center justify-center gap-2">
                          <CameraIcon className="w-4 h-4" />
                          Choose Screenshot
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                          />
                        </label>
                      )}

                      {uploadError && (
                        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/20 px-3 py-2 text-xs text-red-300">
                          {uploadError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card B: Strava — coming soon */}
                  <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 flex flex-col gap-4 opacity-55 pointer-events-none relative">
                    <div className="absolute top-4 right-4">
                      <span className="rounded-full bg-white/6 ring-1 ring-white/10 px-3 py-1 text-[9px] font-bold tracking-[0.2em] text-white/35 uppercase">
                        Soon
                      </span>
                    </div>
                    <div className="h-[3px] w-8 rounded-full bg-[#FC4C02]" />
                    <div className="flex items-center gap-3">
                      <BoltIcon className="w-5 h-5 text-[#FC4C02]" />
                      <div>
                        <div className="text-sm font-semibold">Verify with Strava</div>
                        <div className="text-xs text-white/40 mt-0.5">Automatic activity sync</div>
                      </div>
                    </div>

                    <p className="text-xs text-white/35 leading-relaxed">
                      Connect once. We auto-check your distance, activity type, and timing. No admin review, instant release.
                    </p>

                    <div className="border-t border-white/8 pt-4 flex flex-col gap-2">
                      <CheckDot text="Distance requirement met" />
                      <CheckDot text="Activity type matched" />
                      <CheckDot text="Completed after your claim" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleReleaseClaim}
                  className="w-full text-xs text-white/20 hover:text-white/40 py-2 transition text-center"
                >
                  Release this claim
                </button>
              </div>
            )}

            {/* STATUS: SUBMITTED */}
            {claim.status === "submitted" && (
              <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#C4EBF2] animate-pulse shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.18em] text-[#C4EBF2] uppercase">Under Review</div>
                    <h3 className="text-lg font-semibold mt-0.5">Activity submitted.</h3>
                  </div>
                </div>

                <p className="text-sm text-white/55 leading-relaxed">
                  We typically review within 24 hours. Your impact page updates the moment you're approved.
                </p>

                {claim.verification_photo_url && (
                  <div className="rounded-2xl overflow-hidden ring-1 ring-white/10">
                    <img
                      src={claim.verification_photo_url}
                      alt="Submitted verification"
                      className="w-full max-h-64 object-contain bg-black/20"
                    />
                  </div>
                )}

                <div className="border-t border-white/8 pt-4">
                  <button
                    onClick={handleReleaseClaim}
                    className="text-xs text-white/20 hover:text-white/40 transition"
                  >
                    Withdraw submission
                  </button>
                </div>
              </div>
            )}

            {/* STATUS: APPROVED — the payoff screen */}
            {claim.status === "approved" && (
              <div
                className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-8 text-center"
                style={{ boxShadow: "0 0 80px 20px rgba(255,210,143,0.09), 0 0 34px 10px rgba(0,0,0,0.30)" }}
              >
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FF9B6A]/15 ring-1 ring-[#FF9B6A]/30 px-3 py-1 mb-6">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9B6A]" />
                  <span className="text-[10px] font-bold tracking-[0.20em] text-[#FF9B6A] uppercase">Verified</span>
                </div>

                <div
                  className="text-6xl font-black text-[#FFD28F] leading-none mb-2"
                  style={{ textShadow: "0 0 40px rgba(255,210,143,0.35)" }}
                >
                  {money(amount)}
                </div>

                {nonprofitName && (
                  <div className="text-sm text-white/50 mb-1">released to</div>
                )}
                {nonprofitName && (
                  <div className="text-base font-semibold text-white/80 mb-6">{nonprofitName}</div>
                )}
                {!nonprofitName && <div className="mb-6" />}

                <div className="border-t border-white/8 pt-6 mb-6">
                  <p className="text-base font-medium text-white/70">Your miles moved real money.</p>
                  {verifyImpactStmt && amount && (
                    <div className="mt-2 flex items-center justify-center">
                      <ImpactBadge statement={verifyImpactStmt} amountCents={amount} size="md" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/athlete"
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#FF9B6A] px-7 py-3.5 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_30px_rgba(255,155,106,0.25)] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all"
                  >
                    View My Impact →
                  </Link>
                  <Link
                    href="/challenges"
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-transparent px-7 py-3.5 text-sm ring-1 ring-white/20 text-white/70 hover:ring-white/35 hover:text-white transition"
                  >
                    Browse More Challenges
                  </Link>
                </div>
              </div>
            )}

            {/* STATUS: REJECTED */}
            {claim.status === "rejected" && (
              <div className="rounded-3xl bg-red-500/8 ring-1 ring-red-500/20 backdrop-blur-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.18em] text-red-400 uppercase">Not Approved</div>
                    <h3 className="text-lg font-semibold mt-0.5">Submission not approved.</h3>
                  </div>
                </div>
                <p className="text-sm text-white/55 leading-relaxed">
                  The activity didn't match the requirements. Upload a new screenshot and resubmit below.
                </p>
                <div className="border-t border-white/8 pt-4">
                  {previewUrl ? (
                    <div className="space-y-3">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full max-h-40 object-contain rounded-xl ring-1 ring-white/10"
                      />
                      <button
                        onClick={handleSubmitProof}
                        disabled={uploading}
                        className="w-full rounded-full bg-[#FF9B6A] py-3 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition disabled:opacity-60"
                      >
                        {uploading ? "Submitting..." : "Resubmit Proof →"}
                      </button>
                      <button
                        onClick={() => { setPreviewUrl(null); setPendingFile(null); }}
                        className="text-xs text-white/30 hover:text-white/50 transition w-full text-center"
                      >
                        Choose a different file
                      </button>
                    </div>
                  ) : (
                    <label className="w-full rounded-full bg-[#FF9B6A] py-3 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition cursor-pointer flex items-center justify-center gap-2">
                      <CameraIcon className="w-4 h-4" />
                      Upload New Screenshot
                      <input
                        ref={rejectFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                      />
                    </label>
                  )}
                  {uploadError && (
                    <div className="mt-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 px-3 py-2 text-xs text-red-300">
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
