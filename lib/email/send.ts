import { Resend } from "resend";

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — email send skipped.");
    return null;
  }
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export function sendEmail(opts: SendEmailOptions): void {
  const client = getClient();
  if (!client) return;

  void client.emails
    .send({
      from: "The Shared Mile <hello@thesharedmile.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    .then((res) => {
      if (res.error) {
        console.error("[email] Send failed:", res.error.message);
      } else {
        console.log("[email] Sent:", opts.subject, "→", opts.to);
      }
    })
    .catch((err) => {
      console.error("[email] Send error:", err?.message ?? err);
    });
}
