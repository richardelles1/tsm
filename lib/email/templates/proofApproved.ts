export const proofApprovedSubject = (amountDollars: number) =>
  `Your miles just moved $${amountDollars.toLocaleString()} — it's official.`;

export interface ProofApprovedProps {
  athleteName: string;
  challengeTitle: string;
  amountDollars: number;
  matchedDollars: number;
  nonprofitName: string;
}

export function proofApprovedHtml(p: ProofApprovedProps): string {
  const totalDollars = p.amountDollars + p.matchedDollars;
  const hasMatch = p.matchedDollars > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your miles moved real money</title></head>
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

          <p style="margin:0 0 6px;color:rgba(196,235,242,1);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Approved</p>
          <h1 style="margin:0 0 24px;color:#ffffff;font-size:22px;font-weight:600;line-height:1.3;">Your miles moved real money, ${p.athleteName}.</h1>

          <!-- Hero amount -->
          <div style="background:rgba(255,210,143,0.08);border:1px solid rgba(255,210,143,0.18);border-radius:20px;padding:28px;text-align:center;margin-bottom:28px;">
            <div style="color:rgba(255,255,255,0.40);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:10px;">${hasMatch ? "Total Impact" : "Unlocked for"} ${p.nonprofitName}</div>
            <div style="color:#FFD28F;font-size:48px;font-weight:900;line-height:1;">$${totalDollars.toLocaleString()}</div>
            ${hasMatch ? `
            <div style="margin-top:12px;color:rgba(255,255,255,0.40);font-size:12px;">
              $${p.amountDollars.toLocaleString()} base &nbsp;+&nbsp; <span style="color:#C4EBF2;">$${p.matchedDollars.toLocaleString()} matched</span>
            </div>` : ""}
          </div>

          <p style="margin:0 0 8px;color:rgba(255,255,255,0.55);font-size:14px;line-height:1.6;">Challenge: <strong style="color:#ffffff;">${p.challengeTitle}</strong></p>
          <p style="margin:0 0 28px;color:rgba(255,255,255,0.55);font-size:14px;line-height:1.6;">Funding has been released to <strong style="color:#ffffff;">${p.nonprofitName}</strong>. This is permanently on record as your impact.</p>

          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="https://thesharedmile.com/athlete" style="display:inline-block;background:#FF9B6A;color:#0B0F1C;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;">See My Impact →</a>
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
