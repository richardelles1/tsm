"use client";

import { useEffect, useState } from "react";

export type OverlayStep = {
  label: string;
  description: string;
  color: string;
};

type Props = {
  storageKey: string;
  title: string;
  subtitle: string;
  steps: OverlayStep[];
  ctaLabel: string;
  footnote?: string;
};

export default function FirstVisitOverlay({
  storageKey,
  title,
  subtitle,
  steps,
  ctaLabel,
  footnote,
}: Props) {
  const [show, setShow] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => {
      setShow(true);
      requestAnimationFrame(() => setFadeIn(true));
    }, 400);
    return () => clearTimeout(t);
  }, [storageKey]);

  function dismiss() {
    setFadeIn(false);
    setTimeout(() => setShow(false), 200);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        backgroundColor: `rgba(0,0,0,${fadeIn ? 0.72 : 0})`,
        backdropFilter: fadeIn ? "blur(6px)" : "none",
        transition: "background-color 200ms, backdrop-filter 200ms",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[#0B0F1C] ring-1 ring-white/10 p-7 space-y-6"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 200ms, transform 200ms",
        }}
      >
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-white/45 leading-relaxed">{subtitle}</p>
        </div>

        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mt-0.5"
                style={{ backgroundColor: `${s.color}18`, color: s.color }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-white/40 mt-0.5 leading-relaxed">{s.description}</div>
              </div>
            </div>
          ))}
        </div>

        {footnote && (
          <p className="text-xs text-white/30 leading-relaxed">{footnote}</p>
        )}

        <button
          onClick={dismiss}
          className="w-full rounded-full bg-[#FF9B6A] py-3 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] active:scale-[0.98] transition-all"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
