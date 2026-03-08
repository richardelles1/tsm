import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { proofApprovedHtml, proofApprovedSubject } from "@/lib/email/templates/proofApproved";
import { proofRejectedHtml, proofRejectedSubject } from "@/lib/email/templates/proofRejected";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string;
    const action = formData.get("action") as string;

    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let updatePayload: any = {};

    if (action === "approve") {
      updatePayload = { status: "approved", verified_at: now };
    }

    if (action === "reject") {
      updatePayload = { status: "rejected", rejected_at: now };
    }

    const { error } = await supabase
      .from("claims")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fire-and-forget: send email based on action
    void (async () => {
      try {
        const { data: claim } = await supabase
          .from("claims")
          .select(`
            athlete_id,
            amount_cents_snapshot,
            challenges:challenge_id (
              title,
              match_ratio,
              corporate_partner_pmp_id,
              nonprofits:nonprofit_id ( name )
            )
          `)
          .eq("id", id)
          .maybeSingle();

        if (!claim) return;

        const { data: athlete } = await supabase
          .from("athletes")
          .select("email, display_name")
          .eq("id", claim.athlete_id)
          .maybeSingle();

        if (!athlete?.email) return;

        const challenge = claim.challenges as any;
        const nonprofitName = challenge?.nonprofits?.name ?? "a nonprofit";
        const baseDollars = Math.round((claim.amount_cents_snapshot ?? 0) / 100);
        const matchRatio = typeof challenge?.match_ratio === "number" ? challenge.match_ratio : 0;
        const hasPartner = Boolean(challenge?.corporate_partner_pmp_id);
        const matchedDollars = hasPartner ? Math.round(baseDollars * matchRatio) : 0;

        if (action === "approve") {
          sendEmail({
            to: athlete.email,
            subject: proofApprovedSubject(baseDollars + matchedDollars),
            html: proofApprovedHtml({
              athleteName: athlete.display_name ?? "Athlete",
              challengeTitle: challenge?.title ?? "your challenge",
              amountDollars: baseDollars,
              matchedDollars,
              nonprofitName,
            }),
          });
        }

        if (action === "reject") {
          sendEmail({
            to: athlete.email,
            subject: proofRejectedSubject,
            html: proofRejectedHtml({
              athleteName: athlete.display_name ?? "Athlete",
              challengeTitle: challenge?.title ?? "your challenge",
              verifyUrl: `https://thesharedmile.com/verify/${id}`,
            }),
          });
        }
      } catch (e) {
        console.error("[verifications] Email lookup error:", e);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
