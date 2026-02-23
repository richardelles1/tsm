// NEW
import Link from "next/link";

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "ok" | "warn";
}) {
  const cls =
    tone === "gold"
      ? "bg-[#FFD28F]/10 text-[#FFD28F] ring-1 ring-[#FFD28F]/20"
      : tone === "ok"
        ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/25"
        : tone === "warn"
          ? "bg-red-500/10 text-red-100 ring-1 ring-red-500/25"
          : "bg-white/5 text-white/70 ring-1 ring-white/10";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-5 shadow-[0_0_34px_10px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium tracking-tight">{title}</div>
          <div className="mt-1 text-xs text-white/55">{desc}</div>
        </div>
        <Pill tone="neutral">UI-only</Pill>
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-black/20 ring-1 ring-white/10 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm text-white/80">{label}</div>
        {hint ? <div className="mt-1 text-[11px] text-white/45">{hint}</div> : null}
      </div>
      <div className="shrink-0 text-sm text-white/85">{value}</div>
    </div>
  );
}

export default async function AdminSettingsPage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm text-white/60">Admin</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-2 text-sm text-white/65 max-w-2xl">
              The rules of the universe. This page should never move money directly — it only sets defaults,
              thresholds, and safety locks that the engines respect.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              ← Admin Home
            </Link>
            <Link
              href="/admin/fundingpools"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
            >
              Funding Pools →
            </Link>
          </div>
        </div>

        {/* Callouts */}
        <div className="mt-8 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_34px_10px_rgba(0,0,0,0.30)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="text-sm text-white/70">Governance Defaults</div>
            <div className="text-xs text-white/50">
              Tip: Keep this “harmless until wired” — then attach to a single admin_settings row.
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              title="Payout Policy"
              desc="How and when payables become eligible to be paid out. (Later: payout engine reads these.)"
            >
              <div className="space-y-2">
                <Row label="Cadence" value={<Pill tone="gold">Weekly</Pill>} hint="How often we run payout batches." />
                <Row
                  label="Minimum payout"
                  value={<Pill tone="neutral">$100</Pill>}
                  hint="Avoid tiny payouts; accumulate until threshold."
                />
                <Row
                  label="Hold window"
                  value={<Pill tone="neutral">3 days</Pill>}
                  hint="Buffer after release before a payable can be paid."
                />
              </div>
            </Card>

            <Card
              title="Matching Rules"
              desc="Guardrails for partner-funded match behavior. (No edits from UI yet.)"
            >
              <div className="space-y-2">
                <Row
                  label="Default match ratio"
                  value={<Pill tone="gold">1×</Pill>}
                  hint="Used only when a challenge doesn’t specify a ratio."
                />
                <Row
                  label="Allow partial match"
                  value={<Pill tone="ok">ON</Pill>}
                  hint="If partner pool runs low, still release base + whatever match is available."
                />
                <Row
                  label="Partner must be active"
                  value={<Pill tone="ok">ON</Pill>}
                  hint="If partner is inactive, match is not applied."
                />
              </div>
            </Card>

            <Card
              title="Challenge Defaults"
              desc="Default values for New Challenge so creation is fast and consistent."
            >
              <div className="space-y-2">
                <Row label="Slots per challenge" value={<Pill tone="neutral">1</Pill>} hint="Default capacity." />
                <Row label="Per-claim amount" value={<Pill tone="neutral">$25</Pill>} hint="Base unlock amount." />
                <Row label="Expiry window" value={<Pill tone="neutral">14 days</Pill>} hint="Default expires_at horizon." />
              </div>
            </Card>

            <Card
              title="Alerts Thresholds"
              desc="What counts as 'uh oh'. (Alerts page can read these later.)"
            >
              <div className="space-y-2">
                <Row
                  label="Low pool threshold"
                  value={<Pill tone="gold">15%</Pill>}
                  hint="If remaining drops below this, flag it."
                />
                <Row
                  label="Aging payables"
                  value={<Pill tone="gold">14 days</Pill>}
                  hint="If unpaid past this, flag it."
                />
                <Row
                  label="Match exhaustion"
                  value={<Pill tone="gold">Warn</Pill>}
                  hint="Flag when partner pool can’t cover advertised match."
                />
              </div>
            </Card>

            <div className="md:col-span-2">
              <div className="rounded-[22px] bg-black/20 ring-1 ring-white/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Admin Safety Locks</div>
                    <div className="mt-1 text-xs text-white/55">
                      These are the “CEO seatbelts.” We keep them UI-only until we wire a dedicated admin route.
                    </div>
                  </div>
                  <Pill tone="warn">Not wired</Pill>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                    <div className="text-sm text-white/80">Read-only mode</div>
                    <div className="mt-2 text-xs text-white/55">
                      Freeze any mutation routes if you ever need a system-wide halt.
                    </div>
                    <div className="mt-3">
                      <Pill tone="neutral">OFF</Pill>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                    <div className="text-sm text-white/80">Enable payout engine</div>
                    <div className="mt-2 text-xs text-white/55">
                      Only flips on when we’re ready to actually send money out.
                    </div>
                    <div className="mt-3">
                      <Pill tone="neutral">OFF</Pill>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                    <div className="text-sm text-white/80">Audit exports</div>
                    <div className="mt-2 text-xs text-white/55">
                      One-click CSV exports of releases + payables for reconciliation.
                    </div>
                    <div className="mt-3">
                      <Pill tone="neutral">Soon</Pill>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[11px] text-white/45">
                  Read-only by design. Settings should change defaults — never directly mutate pools, releases, or payables.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin/releases"
            className="rounded-full bg-[#0D1326] px-4 py-2 ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            Releases
          </Link>
          <Link
            href="/admin/payables"
            className="rounded-full bg-[#0D1326] px-4 py-2 ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            Payables
          </Link>
          <Link
            href="/admin/nonprofits"
            className="rounded-full bg-[#0D1326] px-4 py-2 ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            Nonprofits
          </Link>
          <Link
            href="/admin/challenges"
            className="rounded-full bg-[#0D1326] px-4 py-2 ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            Challenges
          </Link>
          <Link
            href="/admin/fundingpools"
            className="rounded-full bg-[#0D1326] px-4 py-2 ring-1 ring-[#FFD28F]/20 hover:ring-[#FFD28F]/35 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.14)] transition"
          >
            Funding Pools
          </Link>
        </div>
      </div>
    </main>
  );
}
