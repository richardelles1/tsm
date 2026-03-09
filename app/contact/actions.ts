"use server";

import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email/send";

export async function submitContactInquiry(formData: FormData) {
  const type = String(formData.get("type") ?? "partner");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const org = String(formData.get("org") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !org || !message) {
    redirect("/contact?err=Please+fill+in+all+required+fields");
  }

  const isPartner = type === "partner";
  const label = isPartner ? "Impact Partner" : "Nonprofit";
  const subject = `[${label} Inquiry] ${org}`;

  const partnerRows = isPartner
    ? `
      <tr><td style="padding:6px 0;color:#8899aa;font-size:13px;width:160px;vertical-align:top;">Estimated Budget</td><td style="padding:6px 0;font-size:13px;color:#ffffff;">${formData.get("budget") ?? "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#8899aa;font-size:13px;vertical-align:top;">Industry</td><td style="padding:6px 0;font-size:13px;color:#ffffff;">${String(formData.get("industry") ?? "").trim() || "—"}</td></tr>
    `
    : "";

  const nonprofitRows = !isPartner
    ? `
      <tr><td style="padding:6px 0;color:#8899aa;font-size:13px;width:160px;vertical-align:top;">Website</td><td style="padding:6px 0;font-size:13px;color:#ffffff;">${String(formData.get("website") ?? "").trim() || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#8899aa;font-size:13px;vertical-align:top;">Cause Area</td><td style="padding:6px 0;font-size:13px;color:#ffffff;">${String(formData.get("cause") ?? "").trim() || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#8899aa;font-size:13px;vertical-align:top;">501(c)(3) Status</td><td style="padding:6px 0;font-size:13px;color:#ffffff;">${formData.get("status_501c3") ?? "—"}</td></tr>
    `
    : "";

  const accentColor = isPartner ? "#C4EBF2" : "#FF9B6A";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#070A12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#070A12" style="background:#070A12;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

          <tr>
            <td style="padding-bottom:24px;">
              <div style="color:#FFD28F;font-size:12px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;">The Shared Mile</div>
              <div style="color:#4d5e72;font-size:11px;letter-spacing:0.1em;margin-top:3px;text-transform:uppercase;">New Inquiry</div>
            </td>
          </tr>

          <tr>
            <td bgcolor="#111827" style="background:#111827;border:1px solid #1e2d40;border-radius:20px;padding:32px 28px;">
              <div style="display:inline-block;background:${accentColor}18;color:${accentColor};font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;">${label}</div>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:20px;font-weight:600;">${org}</h1>
              <p style="margin:0 0 24px;color:#8899aa;font-size:13px;">${name} &middot; <a href="mailto:${email}" style="color:${accentColor};text-decoration:none;">${email}</a></p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1e2d40;padding-top:16px;margin-bottom:20px;">
                <tr><td style="padding:6px 0;color:#8899aa;font-size:13px;width:160px;vertical-align:top;">Name</td><td style="padding:6px 0;font-size:13px;color:#ffffff;">${name}</td></tr>
                <tr><td style="padding:6px 0;color:#8899aa;font-size:13px;vertical-align:top;">Email</td><td style="padding:6px 0;font-size:13px;color:#ffffff;"><a href="mailto:${email}" style="color:${accentColor};text-decoration:none;">${email}</a></td></tr>
                <tr><td style="padding:6px 0;color:#8899aa;font-size:13px;vertical-align:top;">Organization</td><td style="padding:6px 0;font-size:13px;color:#ffffff;">${org}</td></tr>
                ${partnerRows}
                ${nonprofitRows}
              </table>

              <div style="background:#0f1520;border:1px solid #1a2535;border-radius:12px;padding:16px 18px;">
                <div style="color:#8899aa;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">Message</div>
                <p style="margin:0;color:#ffffff;font-size:13px;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding-top:20px;text-align:center;">
              <p style="margin:0;color:#334455;font-size:11px;">Submitted via thesharedmile.com/contact</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  sendEmail({ to: "rich@orivapay.com", subject, html });

  redirect("/contact?ok=1");
}
