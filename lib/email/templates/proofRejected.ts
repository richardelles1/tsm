export const proofRejectedSubject = "We couldn't verify your activity — here's what to do";

export interface ProofRejectedProps {
  athleteName: string;
  challengeTitle: string;
  verifyUrl: string;
}

export function proofRejectedHtml(p: ProofRejectedProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${proofRejectedSubject}</title></head>
<body style="margin:0;padding:0;background:#070A12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070A12;min-height:100vh;">
    <tr><td align="center" style="padding:48px 16px;">
      <table role="presentation" width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <div style="color:#FFD28F;font-size:13px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;">The Shared Mile</div>
          <div style="color:rgba(255,255,255,0.30);font-size:11px;letter-spacing:0.12em;margin-top:4px;text-transform:uppercase;">Movement Unlocks Capital</div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:24px;padding:36px 32px;">

          <p style="margin:0 0 6px;color:rgba(255,155,106,0.80);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Needs attention</p>
          <h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600;line-height:1.3;">We couldn't verify your activity, ${p.athleteName}.</h1>
          <p style="margin:0 0 16px;color:rgba(255,255,255,0.55);font-size:14px;line-height:1.6;">Your submission for <strong style="color:#ffffff;">${p.challengeTitle}</strong> wasn't quite what we needed. That's okay — you can resubmit.</p>

          <!-- Tips -->
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:20px 24px;margin-bottom:28px;">
            <p style="margin:0 0 10px;color:rgba(255,255,255,0.60);font-size:13px;font-weight:600;">For a clean resubmission:</p>
            <ul style="margin:0;padding:0 0 0 18px;color:rgba(255,255,255,0.45);font-size:13px;line-height:1.8;">
              <li>A clear screenshot from your fitness app showing distance and date</li>
              <li>Make sure the distance matches the challenge goal</li>
              <li>The activity should be dated during your active claim window</li>
            </ul>
          </div>

          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${p.verifyUrl}" style="display:inline-block;background:#FF9B6A;color:#0B0F1C;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;">Resubmit Proof →</a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:32px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.20);font-size:11px;line-height:1.6;">The Shared Mile &mdash; You're receiving this because you're a member.<br>To unsubscribe, reply with "unsubscribe" in the subject line.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
