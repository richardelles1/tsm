# Supabase Email Templates — The Shared Mile

Paste these into: **Supabase Dashboard → Authentication → Email Templates**

---

## Confirm Signup

**Subject line:** `Confirm your account — The Shared Mile`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm Your Account</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0F1C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0F1C;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Logo / wordmark -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.35);">
                THE SHARED MILE
              </span>
              <br />
              <span style="font-size:10px;color:rgba(255,255,255,0.18);letter-spacing:0.12em;text-transform:uppercase;">
                by Oriva
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px 36px;">

              <!-- Headline -->
              <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#FFD28F;line-height:1.2;letter-spacing:-0.02em;">
                You're one step away.
              </p>

              <!-- Subhead -->
              <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.6;">
                Click the button below to confirm your account and start moving for good.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:100px;background-color:#FF9B6A;box-shadow:0 8px 24px rgba(255,155,106,0.25);">
                    <a
                      href="{{ .ConfirmationURL }}"
                      style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#0B0F1C;text-decoration:none;border-radius:100px;letter-spacing:0.01em;"
                    >
                      Confirm My Account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.25);">
                Or copy and paste this URL into your browser:
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.20);word-break:break-all;font-family:monospace;">
                {{ .ConfirmationURL }}
              </p>

              <!-- Divider -->
              <hr style="margin:28px 0;border:none;border-top:1px solid rgba(255,255,255,0.06);" />

              <!-- What is TSM -->
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.30);line-height:1.7;">
                The Shared Mile is a movement-powered charitable marketplace where athletes complete physical challenges to unlock committed nonprofit donations. Every mile moves real money.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);letter-spacing:0.06em;">
                Powered by Oriva · The Shared Mile<br />
                <span style="font-style:italic;color:rgba(255,255,255,0.12);">Movement unlocks capital.</span>
              </p>
              <p style="margin:8px 0 0;font-size:10px;color:rgba(255,255,255,0.12);">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Magic Link (Passwordless Login)

**Subject line:** `Your login link — The Shared Mile`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Log In to The Shared Mile</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0F1C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0F1C;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.35);">
                THE SHARED MILE
              </span>
            </td>
          </tr>
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px 36px;">
              <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#FFD28F;line-height:1.2;">
                Your login link.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.6;">
                Click below to log in. This link expires in 1 hour.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:100px;background-color:#FF9B6A;">
                    <a
                      href="{{ .ConfirmationURL }}"
                      style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#0B0F1C;text-decoration:none;border-radius:100px;"
                    >
                      Log In to The Shared Mile →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.20);word-break:break-all;font-family:monospace;">
                {{ .ConfirmationURL }}
              </p>
              <hr style="margin:28px 0;border:none;border-top:1px solid rgba(255,255,255,0.06);" />
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);">
                If you didn't request this, ignore this email. Your account is safe.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);">
                Powered by Oriva · The Shared Mile
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Instructions

1. Go to **Supabase Dashboard** → your project → **Authentication** → **Email Templates**
2. Select **"Confirm signup"** from the dropdown
3. Replace the subject line with the one above
4. Replace the HTML body with the template above
5. The `{{ .ConfirmationURL }}` variable is automatically injected by Supabase — do not change it
6. Click **Save** — takes effect immediately for all new signups

> The Magic Link template follows the same process under "Magic Link".
