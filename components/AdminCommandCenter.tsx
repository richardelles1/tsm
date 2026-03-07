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

type AlertItem = {
  key: string;
  severity: "warn" | "bad";
  title: string;
  detail: string;
  href?: string;
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

type Props = {
  verifications: VerificationRow[];
  alerts: AlertItem[];
  challenges: ChallengeRow[];
};

const ACTIVITY_COLOR: Record<string, string> = {
  run: "text-[#FF9B6A]",
  walk: "text-[#C4EBF2]",
  cycle: "text-[#FFD28F]",
};

function money(cents: number | null | undefined) {
  if (!cents) return "—";
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

function activityLabel(a: string | null | undefined) {
  if (!a) return "?";
  return a.charAt(0).toUpperCase() + a.slice(1);
}

function activityColor(a: string | null | undefined) {
  return ACTIVITY_COLOR[(a ?? "").toLowerCase()] ?? "text-white/60";
}

export default function AdminCommandCenter({ verifications: initialVerifications, alerts, challenges }: Props) {
  const defaultTab = initialVerifications.length > 0 ? "verifications" : "challenges";
  const [tab, setTab] = useState<"verifications" | "alerts" | "challenges">(defaultTab);

  const [verifications, setVerifications] = useState<VerificationRow[]>(initialVerifications);
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const handleDone = useCallback((id: string, action: "approve" | "reject") => {
    if (action === "approve") {
      setFlashingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setFlashingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setExitingIds((prev) => new Set(prev).add(id));
        setTimeout(() => {
          setVerifications((prev) => prev.filter((v) => v.id !== id));
          setExitingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 350);
      }, 650);
    } else {
      setExitingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setVerifications((prev) => prev.filter((v) => v.id !== id));
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 350);
    }
  }, []);

  const tabs = [
    { key: "verifications", label: "Verifications", count: verifications.length },
    { key: "alerts", label: "Alerts", count: alerts.length },
    { key: "challenges", label: "Challenges", count: null },
  ] as const;

  return (
    <div className="mt-6 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl shadow-[0_0_34px_10px_rgba(0,0,0,0.30)] overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-5 pt-4 pb-0 border-b border-white/8">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all -mb-px border-b-2",
              tab === t.key
                ? "text-[#FFD28F] border-[#FFD28F] bg-white/5"
                : "text-white/45 border-transparent hover:text-white/65 hover:border-white/20",
            ].join(" ")}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={[
                "ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                tab === t.key
                  ? "bg-[#FFD28F]/20 text-[#FFD28F]"
                  : t.key === "alerts" && alerts.some((a) => a.severity === "bad")
                    ? "bg-red-500/20 text-red-300"
                    : "bg-white/10 text-white/55",
              ].join(" ")}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* VERIFICATIONS TAB */}
        {tab === "verifications" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-white/40">
                {verifications.length === 0
                  ? "All clear — no pending submissions."
                  : `${verifications.length} pending review`}
              </div>
              <Link
                href="/admin/verifications"
                className="text-xs text-[#FFD28F]/70 hover:text-[#FFD28F] transition"
              >
                View All →
              </Link>
            </div>

            {verifications.length === 0 ? (
              <div className="rounded-2xl bg-white/4 ring-1 ring-white/8 p-6 text-center">
                <div className="text-3xl mb-2">✓</div>
                <div className="text-sm text-white/50">Queue is clear</div>
              </div>
            ) : (
              <div className="space-y-4">
                {verifications.map((row) => {
                  const activity = row.challenges?.activity ?? null;
                  const isFlashing = flashingIds.has(row.id);
                  const isExiting = exitingIds.has(row.id);

                  return (
                    <div
                      key={row.id}
                      style={{
                        transition: "background-color 300ms ease, box-shadow 300ms ease, opacity 350ms ease, max-height 350ms ease",
                        maxHeight: isExiting ? "0px" : "600px",
                        opacity: isExiting ? 0 : 1,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className={[
                          "rounded-2xl ring-1 p-4 transition-colors duration-300",
                          isFlashing
                            ? "bg-emerald-500/15 ring-emerald-400/40 shadow-[0_0_28px_4px_rgba(52,211,153,0.15)]"
                            : "bg-white/4 ring-white/8",
                        ].join(" ")}
                      >
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
                              className="rounded-xl ring-1 ring-white/10 max-h-40 w-full object-cover"
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

        {/* ALERTS TAB */}
        {tab === "alerts" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-white/40">
                {alerts.length === 0
                  ? "No active alerts."
                  : `${alerts.length} alert${alerts.length !== 1 ? "s" : ""} need attention`}
              </div>
              <Link
                href="/admin/alerts"
                className="text-xs text-[#FFD28F]/70 hover:text-[#FFD28F] transition"
              >
                View All →
              </Link>
            </div>

            {alerts.length === 0 ? (
              <div className="rounded-2xl bg-white/4 ring-1 ring-white/8 p-6 text-center">
                <div className="text-3xl mb-2">✓</div>
                <div className="text-sm text-white/50">All systems healthy</div>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.key}
                    className={[
                      "rounded-2xl ring-1 px-4 py-3",
                      alert.severity === "bad"
                        ? "bg-red-500/10 ring-red-500/25"
                        : "bg-[#FFD28F]/8 ring-[#FFD28F]/15",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={[
                          "text-xs font-bold",
                          alert.severity === "bad" ? "text-red-300" : "text-[#FFD28F]",
                        ].join(" ")}>
                          {alert.title}
                        </div>
                        <div className="text-xs text-white/55 mt-0.5">{alert.detail}</div>
                      </div>
                      {alert.href && (
                        <Link
                          href={alert.href}
                          className="text-[10px] text-white/35 hover:text-white/60 shrink-0 transition"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHALLENGES TAB */}
        {tab === "challenges" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-white/40">5 most recent challenges</div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/challenges"
                  className="text-xs text-white/40 hover:text-white/65 transition"
                >
                  View All →
                </Link>
                <Link
                  href="/admin/challenges/newchallenge"
                  className="rounded-full bg-[#FF9B6A] px-4 py-1.5 text-xs font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition shadow-[0_4px_16px_rgba(255,155,106,0.20)]"
                >
                  + New Challenge
                </Link>
              </div>
            </div>

            {challenges.length === 0 ? (
              <div className="rounded-2xl bg-white/4 ring-1 ring-white/8 p-6 text-center">
                <div className="text-sm text-white/50 mb-3">No challenges yet.</div>
                <Link
                  href="/admin/challenges/newchallenge"
                  className="inline-flex items-center rounded-full bg-[#FF9B6A] px-5 py-2.5 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] transition"
                >
                  Create First Challenge →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {challenges.map((c) => {
                  const slotsLeft = (c.slots_total ?? 0) - (c.slots_claimed ?? 0);
                  const activity = c.activity ?? "—";
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-2xl bg-white/4 ring-1 ring-white/8 px-4 py-3"
                    >
                      <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${activityColor(activity)}`}>
                        {activityLabel(activity)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium line-clamp-1">{c.title ?? "Untitled"}</div>
                        {c.nonprofits?.name && (
                          <div className="text-[10px] text-white/35 mt-0.5">{c.nonprofits.name}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={[
                          "text-xs font-medium",
                          c.status === "open" ? "text-emerald-400" : "text-white/40",
                        ].join(" ")}>
                          {c.status ?? "—"}
                        </div>
                        <div className="text-[10px] text-white/30">
                          {slotsLeft} / {c.slots_total ?? 0} slots
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
