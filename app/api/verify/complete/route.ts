
// NEW
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY", 500);
    }

    // ✅ admin client (service role) for writes (bypasses RLS)
    const admin = createSupabaseServerClient();

    // ✅ auth client (anon) ONLY to validate the bearer token
    const authClient = createClient(url, anon, { auth: { persistSession: false } });

    // 1) Auth: require Bearer token from client
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) return jsonError("Not authenticated. (Missing bearer token)", 401);

    const {
      data: { user },
      error: userErr,
    } = await authClient.auth.getUser(token);

    if (userErr || !user) return jsonError("Not authenticated.", 401);

    // 2) Parse payload
    const body = await req.json().catch(() => null);
    const claimId = body?.claimId as string | undefined;
    if (!claimId) return jsonError("Missing claimId.");

    // 3) Load claim + challenge context
    const { data: claimRow, error: claimErr } = await admin
      .from("claims")
      .select(
        `
        id,
        athlete_id,
        challenge_id,
        status,
        submitted_at,
        verified_at,
        amount_cents_snapshot,
        distance_miles_snapshot,
        challenges (
          id,
          nonprofit_id,
          funding_pool_id,
          corporate_partner_pmp_id,
          match_ratio,
          amount_cents,
          distance_miles
        )
      `
      )
      .eq("id", claimId)
      .eq("athlete_id", user.id)
      .maybeSingle();

    if (claimErr) return jsonError(claimErr.message, 500);
    if (!claimRow) return jsonError("Claim not found (or not yours).", 404);

    const challenge = (claimRow as any).challenges;
    if (!challenge) return jsonError("Challenge record missing for this claim.", 500);

    const amount_cents = claimRow.amount_cents_snapshot ?? challenge.amount_cents ?? null;
    if (typeof amount_cents !== "number" || amount_cents <= 0) {
      return jsonError("Missing/invalid amount on claim snapshot.", 400);
    }

    const nonprofit_id = challenge.nonprofit_id ?? null;
    const funding_pool_id = challenge.funding_pool_id ?? null;

    if (!funding_pool_id) return jsonError("Challenge is missing funding_pool_id.", 500);
    if (!nonprofit_id) {
      return jsonError(
        "No nonprofit selected for this challenge. (Unrestricted needs nonprofit selection at verification.)",
        400
      );
    }

    // 4) Approve claim
    const now = new Date().toISOString();

    const { error: approveErr } = await admin
      .from("claims")
      .update({
        status: "approved",
        submitted_at: claimRow.submitted_at ?? now,
        verified_at: now,
      })
      .eq("id", claimId)
      .eq("athlete_id", user.id)
      .in("status", ["claimed", "submitted", "approved"]);

    if (approveErr) return jsonError(approveErr.message, 500);

    // 5) Ensure release exists
    // NEW
// 5) Create release + debit pools atomically (base + partial match) in DB
const partnerId = challenge.corporate_partner_pmp_id ?? null;
const matchRatio =
  typeof challenge.match_ratio === "number" ? Number(challenge.match_ratio) : null;

const { data: releaseRows, error: releaseRpcErr } = await admin.rpc(
  "create_release_and_debit_pools",
  {
    p_claim_id: claimId,
    p_challenge_id: claimRow.challenge_id,
    p_nonprofit_id: nonprofit_id,
    p_base_pool_id: funding_pool_id,
    p_partner_id: partnerId,
    p_amount_cents: amount_cents,
    p_match_ratio: matchRatio,
  }
);

if (releaseRpcErr) return jsonError(releaseRpcErr.message, 500);

const r = Array.isArray(releaseRows) ? releaseRows[0] : releaseRows;

if (!r?.ok || !r?.release_id) {
  return jsonError("Release creation failed.", 500);
}

const releaseId = r.release_id as string;
const matched_amount_cents = Number(r.match_applied ?? 0);


    // 6) Ensure payable exists
    const { data: existingPayable, error: existingPayableErr } = await admin
      .from("payables")
      .select("id")
      .eq("release_id", releaseId!)
      .maybeSingle();

    if (existingPayableErr) return jsonError(existingPayableErr.message, 500);

    if (!existingPayable) {
      const { error: payableErr } = await admin.from("payables").insert({
        release_id: releaseId!,
        nonprofit_id,
        amount_cents,
        matched_amount_cents,
        status: "queued",
      });

      if (payableErr) return jsonError(payableErr.message, 500);
    }

    // 7) Ensure verification exists (method REQUIRED)
        // 7) Ensure verification exists AND reflects completion
    const { data: existingVerification, error: existingVerificationErr } = await admin
      .from("verifications")
      .select("id, status")
      .eq("claim_id", claimId)
      .maybeSingle();

    if (existingVerificationErr) return jsonError(existingVerificationErr.message, 500);

    // We are treating "Verify & Complete" as the verification action in MVP,
    // so verifications should not remain "pending" after this endpoint succeeds.
    if (!existingVerification) {
      const { error: verificationErr } = await admin.from("verifications").insert({
        claim_id: claimId,
        method: "manual" as any,
        status: "approved" as any,
        verified_by: user.id,
        verified_at: now,
      });

      if (verificationErr) return jsonError(verificationErr.message, 500);
    } else if (existingVerification.status !== "approved") {
      const { error: verificationUpdateErr } = await admin
        .from("verifications")
        .update({
          status: "approved" as any,
          verified_by: user.id,
          verified_at: now,
        })
        .eq("id", existingVerification.id);

      if (verificationUpdateErr) return jsonError(verificationUpdateErr.message, 500);
    }

    return NextResponse.json({ ok: true, claimId, releaseId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown server error." },
      { status: 500 }
    );
  }
}
