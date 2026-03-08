import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { claimConfirmedHtml, claimConfirmedSubject } from "@/lib/email/templates/claimConfirmed";

export async function POST(req: Request) {
  try {
    const { claimId } = await req.json();

    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("claims")
      .update({
        status: "submitted",
        submitted_at: now,
      })
      .eq("id", claimId);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update claim." },
        { status: 500 }
      );
    }

    // Fire-and-forget: send claim confirmed email
    void (async () => {
      try {
        const { data: claim } = await supabase
          .from("claims")
          .select(`
            athlete_id,
            distance_miles_snapshot,
            amount_cents_snapshot,
            challenges:challenge_id (
              title,
              nonprofits:nonprofit_id ( name )
            )
          `)
          .eq("id", claimId)
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

        sendEmail({
          to: athlete.email,
          subject: claimConfirmedSubject,
          html: claimConfirmedHtml({
            athleteName: athlete.display_name ?? "Athlete",
            challengeTitle: challenge?.title ?? "your challenge",
            distanceMiles: claim.distance_miles_snapshot ?? 0,
            amountDollars: Math.round((claim.amount_cents_snapshot ?? 0) / 100),
            nonprofitName,
          }),
        });
      } catch (e) {
        console.error("[submit] Email lookup error:", e);
      }
    })();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Bad request" },
      { status: 400 }
    );
  }
}
