export const claimConfirmedSubject = "Your proof is in — we're reviewing it now";

export interface ClaimConfirmedProps {
  athleteName: string;
  challengeTitle: string;
  distanceMiles: number;
  amountDollars: number;
  nonprofitName: string;
}

export function claimConfirmedHtml(p: ClaimConfirmedProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${claimConfirmedSubject}</title></head>
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

          <p style="margin:0 0 6px;color:rgba(255,155,106,1);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Proof submitted</p>
          <h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600;line-height:1.3;">Your proof is in, ${p.athleteName}.</h1>
          <p style="margin:0 0 28px;color:rgba(255,255,255,0.55);font-size:14px;line-height:1.6;">We received your activity for <strong style="color:#ffffff;">${p.challengeTitle}</strong>. Our team will review it and if everything checks out, the funding gets released.</p>

          <!-- Stats row -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td width="50%" style="padding-right:8px;">
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;text-align:center;">
                  <div style="color:rgba(255,255,255,0.35);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">Distance</div>
                  <div style="color:#ffffff;font-size:26px;font-weight:900;line-height:1;">${p.distanceMiles % 1 === 0 ? p.distanceMiles.toFixed(0) : p.distanceMiles.toFixed(1)}<span style="font-size:13px;font-weight:400;color:rgba(255,255,255,0.35);margin-left:4px;">mi</span></div>
                </div>
              </td>
              <td width="50%" style="padding-left:8px;">
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;text-align:center;">
                  <div style="color:rgba(255,255,255,0.35);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">At Stake</div>
                  <div style="color:#FFD28F;font-size:26px;font-weight:900;line-height:1;">$${p.amountDollars.toLocaleString()}</div>
                </div>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 28px;color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;">If approved, <strong style="color:#FFD28F;">$${p.amountDollars.toLocaleString()}</strong> will be unlocked for <strong style="color:#ffffff;">${p.nonprofitName}</strong>.</p>

          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="https://thesharedmile.com/activechallenge" style="display:inline-block;background:#FF9B6A;color:#0B0F1C;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;">View Active Challenge →</a>
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
