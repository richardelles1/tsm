"use client";

import { useState } from "react";
import Link from "next/link";

type PayableRow = {
  id: string;
  total_cents: number | null;
  status: string | null;
  created_at: string | null;
};

type ReleaseRow = {
  id: string;
  amount_cents: number | null;
  matched_amount_cents: number | null;
  released_at: string | null;
  challenges?: { title?: string | null } | null;
};

type ClaimRow = {
  id: string;
  distance_miles_snapshot: number | null;
  verified_at: string | null;
  challenges?: { title?: string | null } | null;
};

type ChallengeRow = {
  id: string;
  title: string | null;
  status: string | null;
  amount_cents: number | null;
  match_ratio: number | null;
  expires_at: string | null;
};

type Props = {
  slug: string;
  payables: PayableRow[];
  releases: ReleaseRow[];
  claims: ClaimRow[];
  challenges: ChallengeRow[];
};

function money(cents: number | null | undefined) {
  const v = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v / 100);
}

function fmtDate(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SectionHeader({
  title,
  badge,
  badgeTone,
  open,
  onToggle,
  action,
}: {
  title: string;
  badge?: number | null;
  badgeTone?: "coral" | "gold" | "neutral";
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
}) {
  const badgeClass =
    badgeTone === "coral"
      ? "bg-[#FF9B6A]/20 text-[#FF9B6A]"
      : badgeTone === "gold"
        ? "bg-[#FFD28F]/20 text-[#FFD28F]"
        : "bg-white/10 text-white/55";

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm text-neutral-100">{title}</span>
        {badge != null && badge > 0 && (
          <span
            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${badgeClass}`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <span
          className={`text-white/30 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </div>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/8 py-5 text-center">
      <div className="text-sm text-white/45">{text}</div>
    </div>
  );
}

export default function NpoHub({ slug, payables, releases, claims, challenges }: Props) {
  const queuedPayables = payables.filter((p) => p.status === "queued");
  const activeChallenges = challenges.filter(
    (c) => c.status === "open" || c.status === "claimed"
  );

  const [openPayouts, setOpenPayouts] = useState(queuedPayables.length > 0);
  const [openChallenges, setOpenChallenges] = useState(activeChallenges.length > 0);
  const [openLedger, setOpenLedger] = useState(false);
  const [openImpact, setOpenImpact] = useState(false);

  const queuedTotal = queuedPayables.reduce(
    (s, p) => s + (Number(p.total_cents) || 0),
    0
  );

  return (
    <div className="rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl overflow-hidden divide-y divide-white/[0.07]">

      {/* PAYOUTS */}
      <div>
        <SectionHeader
          title="Payouts"
          badge={queuedPayables.length}
          badgeTone={queuedPayables.length > 0 ? "gold" : "neutral"}
          open={openPayouts}
          onToggle={() => setOpenPayouts((v) => !v)}
          action={
            <Link
              href={`/npo/${slug}/funds`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-white/35 hover:text-white/60 transition"
            >
              View all →
            </Link>
          }
        />

        {openPayouts && (
          <div className="px-5 pb-5 space-y-3">
            {queuedPayables.length === 0 ? (
              <EmptyState text="No queued payouts right now." />
            ) : (
              <>
                <div className="space-y-2">
                  {queuedPayables.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/8 px-4 py-2.5"
                    >
                      <div className="text-sm text-neutral-300/80">{fmtDate(p.created_at)}</div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[11px] text-neutral-200">
                          queued
                        </span>
                        <span className="text-sm font-semibold text-[#FFD28F]">
                          {money(p.total_cents)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {queuedPayables.length > 6 && (
                  <div className="text-[11px] text-white/35 text-center">
                    +{queuedPayables.length - 6} more
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-white/[0.07] pt-3">
                  <span className="text-xs text-white/40">
                    Total queued:{" "}
                    <span className="text-white/70 font-medium">{money(queuedTotal)}</span>
                  </span>
                  <Link
                    href={`/npo/${slug}/funds`}
                    className="text-xs text-white/40 hover:text-white/70 transition underline underline-offset-2"
                  >
                    Full breakdown →
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* CHALLENGES */}
      <div>
        <SectionHeader
          title="Challenges"
          badge={activeChallenges.length}
          badgeTone={activeChallenges.length > 0 ? "coral" : "neutral"}
          open={openChallenges}
          onToggle={() => setOpenChallenges((v) => !v)}
          action={
            <Link
              href={`/npo/${slug}/challenges`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-white/35 hover:text-white/60 transition"
            >
              View all →
            </Link>
          }
        />

        {openChallenges && (
          <div className="px-5 pb-5 space-y-3">
            {activeChallenges.length === 0 ? (
              <EmptyState text="No active challenges right now." />
            ) : (
              <>
                <div className="space-y-2">
                  {activeChallenges.slice(0, 6).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/8 px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate text-neutral-100">
                          {c.title ?? "Untitled"}
                        </div>
                        {c.expires_at && (
                          <div className="text-[11px] text-white/35 mt-0.5">
                            Expires {fmtDate(c.expires_at)}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {c.match_ratio ? (
                          <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[11px] text-[#FFD28F]">
                            {c.match_ratio}x match
                          </span>
                        ) : null}
                        <span className="text-sm font-semibold text-neutral-100">
                          {money(c.amount_cents)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {activeChallenges.length > 6 && (
                  <div className="text-[11px] text-white/35 text-center">
                    +{activeChallenges.length - 6} more
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* UNLOCK LEDGER */}
      <div>
        <SectionHeader
          title="Unlock Ledger"
          badge={releases.length > 0 ? releases.length : null}
          badgeTone="neutral"
          open={openLedger}
          onToggle={() => setOpenLedger((v) => !v)}
          action={
            <Link
              href={`/npo/${slug}/ledger`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-white/35 hover:text-white/60 transition"
            >
              Full ledger →
            </Link>
          }
        />

        {openLedger && (
          <div className="px-5 pb-5 space-y-3">
            {releases.length === 0 ? (
              <EmptyState text="No releases recorded yet." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
                <table className="min-w-[520px] w-full">
                  <thead className="bg-black/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-neutral-300/70">Date</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-neutral-300/70">Base</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-neutral-300/70">Match</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-neutral-300/70">Challenge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {releases.slice(0, 5).map((r) => (
                      <tr key={r.id} className="border-t border-white/10">
                        <td className="px-4 py-2.5 text-sm text-neutral-100/90 whitespace-nowrap">
                          {fmtDate(r.released_at)}
                        </td>
                        <td className="px-4 py-2.5 text-sm font-mono text-neutral-100/90 whitespace-nowrap">
                          {money(r.amount_cents)}
                        </td>
                        <td className="px-4 py-2.5 text-sm font-mono text-neutral-100/90 whitespace-nowrap">
                          {r.matched_amount_cents ? money(r.matched_amount_cents) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-neutral-100/90 max-w-[180px] truncate">
                          {r.challenges?.title ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* IMPACT */}
      <div>
        <SectionHeader
          title="Impact"
          badge={null}
          open={openImpact}
          onToggle={() => setOpenImpact((v) => !v)}
          action={
            <Link
              href={`/npo/${slug}/impact`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-white/35 hover:text-white/60 transition"
            >
              View all →
            </Link>
          }
        />

        {openImpact && (
          <div className="px-5 pb-5 space-y-3">
            {claims.length === 0 ? (
              <EmptyState text="No approved activity yet." />
            ) : (
              <div className="space-y-2">
                {claims.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] ring-1 ring-white/8 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate text-neutral-100">
                        {c.challenges?.title ?? "Challenge"}
                      </div>
                      <div className="text-[11px] text-white/35 mt-0.5">
                        Verified {fmtDate(c.verified_at)}
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[11px] text-neutral-200">
                      {Number(c.distance_miles_snapshot) || 0} mi
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
