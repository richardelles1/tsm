import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const amount = searchParams.get("amount") ?? "$0";
  const nonprofit = searchParams.get("nonprofit") ?? "a nonprofit";
  const milesVal = searchParams.get("miles") ?? "0";
  const partner = searchParams.get("partner") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1920,
          background: "#070A12",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Top gold accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #FFD28F, #FF9B6A, #C4EBF2)",
          }}
        />

        {/* Brand header */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 80,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 20,
              letterSpacing: "0.25em",
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            The Shared Mile
          </div>
          <div
            style={{
              fontSize: 14,
              letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.20)",
              textTransform: "uppercase",
            }}
          >
            by Oriva
          </div>
        </div>

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {/* Movement label */}
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.20em",
              color: "#FF9B6A",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 48,
            }}
          >
            CHALLENGE COMPLETE
          </div>

          {/* Impact amount — the hero */}
          <div
            style={{
              fontSize: 160,
              fontWeight: 900,
              color: "#FFD28F",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            {amount}
          </div>

          <div
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.50)",
              marginBottom: 72,
              letterSpacing: "0.04em",
            }}
          >
            unlocked for nonprofits
          </div>

          {/* Divider */}
          <div
            style={{
              width: 60,
              height: 2,
              background: "rgba(255,255,255,0.15)",
              marginBottom: 72,
            }}
          />

          {/* Miles commitment */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 40,
            }}
          >
            <span
              style={{
                fontSize: 96,
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {milesVal}
            </span>
            <span
              style={{
                fontSize: 36,
                color: "rgba(255,255,255,0.45)",
                fontWeight: 500,
              }}
            >
              miles
            </span>
          </div>

          {/* Nonprofit */}
          <div
            style={{
              fontSize: 34,
              color: "#C4EBF2",
              fontWeight: 600,
              textAlign: "center",
              maxWidth: 800,
              marginBottom: 12,
            }}
          >
            {nonprofit}
          </div>

          {partner ? (
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.35)",
                marginBottom: 0,
              }}
            >
              + matched by {partner}
            </div>
          ) : null}
        </div>

        {/* Bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 80,
            right: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 1,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Movement unlocks capital · thesharedmile.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  );
}
