"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import AdminVerificationActions from "./AdminVerificationActions";

type VerificationRow = {
  id: string;
  status: string;
  verification_photo_url: string | null;
  submitted_at: string | null;
  claimed_at: string | null;
  distance_miles_snapshot: number | null;
  athlete_id: string;
  challenges: {
    title: string | null;
    activity: string | null;
    amount_cents: number | null;
  } | null;
};

type ChallengeRow = {
  id: string;
  title: string | null;
  activity: string | null;
  status: string | null;
  slots_total: number | null;
  slots_claimed: number | null;
  created_at: string | null;
  nonprofits?: { name?: string | null } | null;
};

type PayableRow = {
  id: string;
  total_cents: number | null;
  status: string | null;
  created_at: string | null;
  nonprofits?: { name?: string | null } | null;
};

type PoolRow = {
  id: string;
  source_name: string | null;
  source_type: string | null;
  remaining_amount_cents: number | null;
  total_amount_cents: number | null;
  is_active: boolean | null;
};

type Props = {
  verifications: VerificationRow[];
  challenges: ChallengeRow[];
  payables: PayableRow[];
  pools: PoolRow[];
};

const ACTIVITY_COLOR: Record<string, string> = {
  run: "text-[#FF9B6A]",
  walk: "text-[#C4EBF2]",
  cycle: "text-[#FFD28F]",
};

function money(cents: number | null | undefined) {
  if (cents == null) return "—";
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function activityColor(a: string | null | undefined) {
  return ACTIVITY_COLOR[(a ?? "").toLowerCase()] ?? "text-white/60";
}

function activityLabel(a: string | null | undefined) {
  if (!a) return "?";
  const map: Record<string, string> = { run: "RUN", walk: "WALK", cycle: "CYCLE" };
  return map[a.toLowerCase()] ?? a.toUpperCase();
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
      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/3 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{title}</span>
        {badge != null && badge > 0 && (
          <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <span className={`text-white/30 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </div>
    </button>
  );
}

export default function AdminHub({ verifications: initialVerifications, challenges, payables, pools }: Props) {
  const [verifications, setVerifications] = useState<VerificationRow[]>(initialVerifications);
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const [openVerif, setOpenVerif] = useState(true);
  const [openPayables, setOpenPayables] = useState(payables.length > 0);
  const [openChallenges, setOpenChallenges] = useState(false);
  const [openPools, setOpenPools] = useState(false);

  const handleDone = useCallback((id: string, action: "approve" | "reject") => {
    if (action === "approve") {
      setFlashingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setFlashingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
        setExitingIds((prev) => new Set(prev).add(id));
        setTimeout(() => {
          setVerifications((prev) => prev.filter((v) => v.id !== id));
          setExitingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
        }, 350);
      }, 650);
    } else {
      setExitingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setVerifications((prev) => prev.filter((v) => v.id !== id));
        setExitingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }, 350);
    }
  }, []);

  const unpaidTotal = payables.reduce((s, p) => s + (Number(p.total_cents) || 0), 0);

  return (
    <div className="mt-5 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl overflow-hidden divide-y divide-white/8">

      {/* ── VERIFICATIONS ─────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Verifications"
          badge={verifications.length}
          badgeTone={verifications.length > 0 ? "coral" : "neutral"}
          open={openVerif}
          onToggle={() => setOpenVerif((v) => !v)}
          action={
            <Link
              href="/admin/verifications"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-white/35 hover:text-white/60 transition"
            >
              View all →
            </Link>
          }
        />

        {openVerif && (
          <div className="px-5 pb-5">
            {verifications.length === 0 ? (
              <div className="rounded-2xl bg-white/4 ring-1 ring-white/8 py-5 text-center">
                <div className="text-2xl mb-1.5">✓</div>
                <div className="text-sm text-white/45">Queue clear — nothing pending</div>
              </div>
            ) : (
              <div className="space-y-3">
                {verifications.map((row) => {
                  const activity = row.challenges?.activity ?? null;
                  const isFlashing = flashingIds.has(row.id);
                  const isExiting = exitingIds.has(row.id);
                  return (
                    <div
                      key={row.id}
                      style={{
                        transition: "opacity 350ms ease, max-height 350ms ease",
                        maxHeight: isExiting ? "0px" : "700px",
                        opacity: isExiting ? 0 : 1,
                        overflow: "hidden",
                      }}
                    >
                      <div className={[
                        "rounded-2xl ring-1 p-4 transition-colors duration-300",
                        isFlashing
                          ? "bg-emerald-500/15 ring-emerald-400/40 shadow-[0_0_28px_4px_rgba(52,211,153,0.15)]"
                          : "bg-white/4 ring-white/8",
                      ].join(" ")}>
                        {isFlashing && (
                          <div className="mb-3 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Approved — releasing funds…
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest ${activityColor(activity)}`}>
                              {activityLabel(activity)}
                            </div>
                            <div className="mt-0.5 font-medium leading-snug">
                              {row.challenges?.title ?? "Untitled Challenge"}
                            </div>
                            <div className="text-xs text-white/35 mt-0.5">
                              {row.distance_miles_snapshot ? `${row.distance_miles_snapshot} mi · ` : ""}
                              Submitted {fmtDate(row.submitted_at)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[#FFD28F] font-semibold text-lg">
                              {money(row.challenges?.amount_cents)}
                            </div>
                            <div className="text-[10px] text-white/30">to unlock</div>
                          </div>
                        </div>
                        {row.verification_photo_url && (
                          <div className="mb-3">
                            <img
                              src={row.verification_photo_url}
                              alt="Verification"
                              className="rounded-xl ring-1 ring-white/10 max-h-44 w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="text-[10px] text-white/25 font-mono mb-2">
                          claim {row.id.slice(0, 12)}…
                        </div>
                        <AdminVerificationActions id={row.id} onDone={handleDone} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PAYABLES ──────────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Unpaid Payables"
          badge={payables.length}
          badgeTone={payables.length > 0 ? "gold" : "neutral"}
          open={openPayables}
          onToggle={() => setOpenPayables((v) => !v)}
          action={
            <Link
              href="/admin/payables"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-white/35 hover:text-white/60 transition"
            >
              Manage →
            </Link>
          }
        />

        {openPayables && (
          <div className="px-5 pb-5">
            {payables.length === 0 ? (
              <div className="rounded-2xl bg-white/4 ring-1 ring-white/8 py-5 text-center">
                <div className="text-2xl mb-1.5">✓</div>
                <div className="text-sm text-white/45">No unpaid payables</div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {payables.slice(0, 8).map((p) => {
                    const days = daysSince(p.created_at);
                    const isAging = days > 7;
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/4 ring-1 ring-white/8 px-4 py-2.5">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {(p.nonprofits as any)?.name ?? "Unknown nonprofit"}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isAging ? "text-[#FFD28F]" : "text-white/35"}`}>
                            {days}d old{isAging ? " ⚠" : ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold text-white/80">
                          {money(p.total_cents)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {payables.length > 8 && (
                  <div className="mt-2 text-[11px] text-white/35 text-center">
                    +{payables.length - 8} more
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                  <span className="text-xs text-white/40">Total: <span className="text-white/70 font-medium">{money(unpaidTotal)}</span></span>
                  <Link
                    href="/admin/payables"
                    className="rounded-full bg-[#FF9B6A] px-4 py-1.5 text-xs font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition"
                  >
                    Batch Mark Paid →
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── CHALLENGES ────────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Challenges"
          badge={null}
          open={openChallenges}
          onToggle={() => setOpenChallenges((v) => !v)}
          action={
            <Link
              href="/admin/challenges/newchallenge"
              onClick={(e) => e.stopPropagation()}
              className="rounded-full bg-[#FF9B6A] px-3 py-1 text-[11px] font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition"
            >
              + New
            </Link>
          }
        />

        {openChallenges && (
          <div className="px-5 pb-5">
            {challenges.length === 0 ? (
              <div className="rounded-2xl bg-white/4 ring-1 ring-white/8 py-5 text-center">
                <div className="text-sm text-white/45 mb-3">No challenges yet</div>
                <Link
                  href="/admin/challenges/newchallenge"
                  className="inline-flex rounded-full bg-[#FF9B6A] px-5 py-2 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition"
                >
                  Create First Challenge →
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {challenges.map((c) => {
                    const slotsLeft = (c.slots_total ?? 0) - (c.slots_claimed ?? 0);
                    return (
                      <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white/4 ring-1 ring-white/8 px-4 py-2.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${activityColor(c.activity)}`}>
                          {activityLabel(c.activity)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{c.title ?? "Untitled"}</div>
                          {(c.nonprofits as any)?.name && (
                            <div className="text-[10px] text-white/35">{(c.nonprofits as any).name}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={`text-xs font-medium ${c.status === "open" ? "text-emerald-400" : "text-white/40"}`}>
                            {c.status ?? "—"}
                          </div>
                          <div className="text-[10px] text-white/30">{slotsLeft}/{c.slots_total ?? 0}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-center">
                  <Link href="/admin/challenges" className="text-xs text-white/35 hover:text-white/60 transition">
                    View all challenges →
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── POOL HEALTH ───────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Pool Health"
          badge={null}
          open={openPools}
          onToggle={() => setOpenPools((v) => !v)}
          action={
            <Link
              href="/admin/pmpentry"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-white/35 hover:text-white/60 transition"
            >
              + Add Funding
            </Link>
          }
        />

        {openPools && (
          <div className="px-5 pb-5">
            {pools.length === 0 ? (
              <div className="rounded-2xl bg-white/4 ring-1 ring-white/8 py-5 text-center">
                <div className="text-sm text-white/45">No active pools</div>
              </div>
            ) : (
              <div className="space-y-3">
                {pools.map((p) => {
                  const total = Number(p.total_amount_cents) || 0;
                  const remaining = Number(p.remaining_amount_cents) || 0;
                  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
                  const barColor = pct < 15 ? "bg-red-400" : pct < 40 ? "bg-[#FFD28F]" : "bg-white/50";
                  const labelColor = pct < 15 ? "text-red-300" : pct < 40 ? "text-[#FFD28F]" : "text-white/60";
                  return (
                    <div key={p.id} className="rounded-xl bg-white/4 ring-1 ring-white/8 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{p.source_name ?? p.id.slice(0, 8)}</div>
                          <div className="text-[10px] text-white/35 mt-0.5 capitalize">{p.source_type ?? "—"}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-sm font-semibold ${labelColor}`}>{money(remaining)}</div>
                          <div className="text-[10px] text-white/30">{pct}% of {money(total)}</div>
                        </div>
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-1 text-center">
                  <Link href="/admin/fundingpools" className="text-xs text-white/35 hover:text-white/60 transition">
                    All pools →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
