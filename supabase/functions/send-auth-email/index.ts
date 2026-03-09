import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "The Shared Mile <hello@thesharedmile.com>";

// Solid-color equivalents of the glass rgba values — renders correctly in all email clients
const BG_OUTER = "#070A12";
const BG_CARD = "#111827";
const BG_STEP = "#0f1520";
const TEXT_PRIMARY = "#ffffff";
const TEXT_SECONDARY = "#8899aa";
const TEXT_MUTED = "#4d5e72";
const TEXT_TINY = "#334455";
const GOLD = "#FFD28F";
const CORAL = "#FF9B6A";
const AQUA = "#C4EBF2";
const BORDER_CARD = "#1e2d40";
const BORDER_STEP = "#1a2535";

const BRAND_HEADER = `
  <tr>
    <td bgcolor="${BG_OUTER}" style="padding-bottom:32px;text-align:center;background:${BG_OUTER};">
      <div style="color:${GOLD};font-size:13px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">The Shared Mile</div>
      <div style="color:${TEXT_MUTED};font-size:11px;letter-spacing:0.12em;margin-top:4px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Movement Unlocks Capital</div>
    </td>
  </tr>
`;

const BRAND_FOOTER = `
  <tr>
    <td bgcolor="${BG_OUTER}" style="padding-top:32px;text-align:center;background:${BG_OUTER};">
      <p style="margin:0;color:${TEXT_TINY};font-size:11px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">The Shared Mile &mdash; Movement Unlocks Capital<br>You're receiving this because you created an account. If this wasn't you, you can safely ignore it.</p>
    </td>
  </tr>
`;

function wrapLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
</head>
<body style="margin:0;padding:0;background:${BG_OUTER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" bgcolor="${BG_OUTER}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BG_OUTER}" style="background:${BG_OUTER};min-height:100vh;">
    <tr>
      <td align="center" bgcolor="${BG_OUTER}" style="padding:48px 16px;background:${BG_OUTER};">
        <table role="presentation" width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
          ${BRAND_HEADER}
          ${content}
          ${BRAND_FOOTER}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding:8px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td bgcolor="${CORAL}" style="background:${CORAL};border-radius:100px;padding:14px 32px;">
                <a href="${url}" style="display:inline-block;color:#0B0F1C;font-size:14px;font-weight:700;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;white-space:nowrap;">${label}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function signupTemplate(confirmUrl: string, name: string): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] || "";
  const greeting = firstName ? `You're almost in, ${firstName}.` : "You're almost in.";

  const steps = [
    { label: "Claim a challenge", desc: "Pick a distance goal that fits your pace", color: CORAL, num: "01" },
    { label: "Complete it", desc: "Run, walk, or ride — then submit proof", color: GOLD, num: "02" },
    { label: "Unlock funding", desc: "Real dollars flow to a nonprofit", color: AQUA, num: "03" },
  ];

  const stepsHtml = steps.map((s) => `
    <td width="33%" style="padding:0 4px;vertical-align:top;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td bgcolor="${BG_STEP}" style="background:${BG_STEP};border:1px solid ${BORDER_STEP};border-radius:16px;padding:14px 10px;text-align:center;">
            <div style="color:${s.color};font-size:11px;font-weight:800;letter-spacing:0.1em;margin-bottom:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${s.num}</div>
            <div style="color:${TEXT_PRIMARY};font-size:12px;font-weight:600;margin-bottom:4px;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${s.label}</div>
            <div style="color:${TEXT_SECONDARY};font-size:11px;line-height:1.4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${s.desc}</div>
          </td>
        </tr>
      </table>
    </td>
  `).join("");

  const html = wrapLayout(`
    <tr>
      <td bgcolor="${BG_CARD}" style="background:${BG_CARD};border:1px solid ${BORDER_CARD};border-radius:24px;padding:36px 32px;">
        <p style="margin:0 0 6px;color:${AQUA};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">One step away</p>
        <h1 style="margin:0 0 14px;color:${TEXT_PRIMARY};font-size:22px;font-weight:600;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${greeting}</h1>
        <p style="margin:0 0 28px;color:${TEXT_SECONDARY};font-size:14px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Confirm your email and your athlete profile will be ready. Here's what happens when you do:</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>${stepsHtml}</tr>
        </table>

        ${ctaButton("Confirm Email &rarr;", confirmUrl)}

        <p style="margin:24px 0 0;color:${TEXT_MUTED};font-size:12px;text-align:center;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">If you didn't sign up for The Shared Mile, you can safely ignore this email.</p>
      </td>
    </tr>
  `);

  return { subject: "Confirm your email — The Shared Mile", html };
}

function recoveryTemplate(resetUrl: string): { subject: string; html: string } {
  const html = wrapLayout(`
    <tr>
      <td bgcolor="${BG_CARD}" style="background:${BG_CARD};border:1px solid ${BORDER_CARD};border-radius:24px;padding:36px 32px;">
        <p style="margin:0 0 6px;color:${CORAL};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Account recovery</p>
        <h1 style="margin:0 0 14px;color:${TEXT_PRIMARY};font-size:22px;font-weight:600;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Reset your password.</h1>
        <p style="margin:0 0 28px;color:${TEXT_SECONDARY};font-size:14px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">We got your request. Click below to choose a new password and get back to your challenges.</p>

        ${ctaButton("Reset Password &rarr;", resetUrl)}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
          <tr>
            <td bgcolor="${BG_STEP}" style="background:${BG_STEP};border:1px solid ${BORDER_STEP};border-radius:12px;padding:14px 18px;text-align:center;">
              <p style="margin:0;color:${TEXT_SECONDARY};font-size:12px;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">This link expires in <strong style="color:${TEXT_PRIMARY};">1 hour</strong>. If you didn't request a reset, your account is safe and no changes were made.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);

  return { subject: "Reset your password — The Shared Mile", html };
}

function emailChangeTemplate(confirmUrl: string): { subject: string; html: string } {
  const html = wrapLayout(`
    <tr>
      <td bgcolor="${BG_CARD}" style="background:${BG_CARD};border:1px solid ${BORDER_CARD};border-radius:24px;padding:36px 32px;">
        <p style="margin:0 0 6px;color:${AQUA};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Email update</p>
        <h1 style="margin:0 0 14px;color:${TEXT_PRIMARY};font-size:22px;font-weight:600;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Confirm your new email.</h1>
        <p style="margin:0 0 28px;color:${TEXT_SECONDARY};font-size:14px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">You requested an email address change on your Shared Mile account. Click below to confirm the new address.</p>

        ${ctaButton("Confirm New Email &rarr;", confirmUrl)}

        <p style="margin:24px 0 0;color:${TEXT_MUTED};font-size:12px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">If you didn't request this change, please contact us immediately.</p>
      </td>
    </tr>
  `);

  return { subject: "Confirm your new email — The Shared Mile", html };
}

function magicLinkTemplate(magicUrl: string): { subject: string; html: string } {
  const html = wrapLayout(`
    <tr>
      <td bgcolor="${BG_CARD}" style="background:${BG_CARD};border:1px solid ${BORDER_CARD};border-radius:24px;padding:36px 32px;">
        <p style="margin:0 0 6px;color:${GOLD};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Magic link</p>
        <h1 style="margin:0 0 14px;color:${TEXT_PRIMARY};font-size:22px;font-weight:600;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Sign in to The Shared Mile.</h1>
        <p style="margin:0 0 28px;color:${TEXT_SECONDARY};font-size:14px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Click below to sign in instantly. This link is single-use and expires in 1 hour.</p>

        ${ctaButton("Sign In &rarr;", magicUrl)}

        <p style="margin:24px 0 0;color:${TEXT_MUTED};font-size:12px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">If you didn't request this, you can ignore this email.</p>
      </td>
    </tr>
  `);

  return { subject: "Your sign-in link — The Shared Mile", html };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const user = payload?.user ?? {};
  const emailData = payload?.email_data ?? {};
  const toEmail: string = user?.email ?? "";
  const actionType: string = emailData?.email_action_type ?? "";
  const tokenHash: string = emailData?.token_hash ?? "";
  const redirectTo: string = emailData?.redirect_to ?? "https://thesharedmile.com/auth/callback?next=/onboarding";
  const userName: string = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "";

  if (!toEmail) {
    return new Response(JSON.stringify({ error: "No email address" }), { status: 400 });
  }

  const confirmUrl = `${redirectTo}&token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(actionType)}`;

  let emailPayload: { subject: string; html: string };

  switch (actionType) {
    case "signup":
      emailPayload = signupTemplate(confirmUrl, userName);
      break;
    case "recovery":
      emailPayload = recoveryTemplate(confirmUrl);
      break;
    case "email_change":
    case "email_change_new":
      emailPayload = emailChangeTemplate(confirmUrl);
      break;
    case "magiclink":
      emailPayload = magicLinkTemplate(confirmUrl);
      break;
    default:
      emailPayload = signupTemplate(confirmUrl, userName);
  }

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [toEmail],
        subject: emailPayload.subject,
        html: emailPayload.html,
      }),
    });

    const resendBody = await resendRes.json();

    if (!resendRes.ok) {
      console.error("[send-auth-email] Resend error:", JSON.stringify(resendBody));
    } else {
      console.log("[send-auth-email] Sent:", emailPayload.subject, "→", toEmail);
    }
  } catch (err) {
    console.error("[send-auth-email] Fetch error:", err);
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
