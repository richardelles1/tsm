"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Nonprofit = { id: string; name: string; slug: string | null };

const TIP_OPTIONS = [
  { label: "5%", value: 0.05 },
  { label: "10%", value: 0.10 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.20 },
  { label: "None", value: 0 },
];

const FEE_RATE = 0.029;
const FEE_FIXED = 30;

function centsFromDollar(input: string): number {
  const n = Number(input.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DonationFormInner({
  nonprofits,
  submitAction,
  successMessage,
  errorMessage,
}: {
  nonprofits: Nonprofit[];
  submitAction: (formData: FormData) => Promise<void>;
  successMessage?: boolean;
  errorMessage?: string | null;
}) {
  const searchParams = useSearchParams();
  const npoParam = searchParams.get("npo");

  const [amount, setAmount] = useState("25.00");
  const [tipIdx, setTipIdx] = useState(1);
  const [coverFee, setCoverFee] = useState(false);
  const [selectedNpoId, setSelectedNpoId] = useState("unrestricted");

  useEffect(() => {
    if (!npoParam) return;
    const match = nonprofits.find((n) => n.slug === npoParam);
    if (match) setSelectedNpoId(match.id);
  }, [npoParam, nonprofits]);

  const amountCents = centsFromDollar(amount);
  const tipRate = TIP_OPTIONS[tipIdx]?.value ?? 0;
  const tipCents = Math.round(amountCents * tipRate);
  const feeCents = coverFee ? Math.round(amountCents * FEE_RATE) + FEE_FIXED : 0;
  const totalCents = amountCents + tipCents + feeCents;

  const inputCls = "w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/30 transition text-white";

  return (
    <form action={submitAction} className="space-y-5">
      <input type="hidden" name="tip_cents" value={tipCents} />
      <input type="hidden" name="fee_cents" value={feeCents} />
      <input type="hidden" name="total_cents" value={totalCents} />

      {successMessage && (
        <div className="rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/25 p-4">
          <div className="text-sm font-semibold text-emerald-200">Donation recorded.</div>
          <div className="text-xs text-emerald-300/70 mt-1">Pool balance updated. Thank you.</div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 p-4">
          <div className="text-sm font-semibold text-red-200">Something went wrong.</div>
          <div className="text-xs text-red-300/70 mt-1">{errorMessage}</div>
        </div>
      )}

      {/* Nonprofit selector */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Designate for</label>
        <select
          name="nonprofit_id"
          className={`${inputCls} appearance-none`}
          value={selectedNpoId}
          onChange={(e) => setSelectedNpoId(e.target.value)}
        >
          <option value="unrestricted">General fund (unrestricted)</option>
          {nonprofits.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Donation Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
          <input
            name="amount"
            type="number"
            min="1"
            step="0.01"
            placeholder="25.00"
            className={`${inputCls} pl-8`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Tip selector */}
      <div className="space-y-2">
        <label className="text-xs text-white/40 font-medium uppercase tracking-wider">
          Tip to support the platform
        </label>
        <div className="flex gap-2">
          {TIP_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setTipIdx(i)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ring-1 ${
                tipIdx === i
                  ? "bg-[#FFD28F] text-[#0B0F1C] ring-[#FFD28F]/40 shadow-[0_4px_16px_rgba(255,210,143,0.20)]"
                  : "bg-white/5 text-white/50 ring-white/10 hover:ring-white/20 hover:text-white/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {tipRate > 0 && amountCents > 0 && (
          <p className="text-xs text-white/30">Your tip: {fmt(tipCents)} · keeps the platform running</p>
        )}
      </div>

      {/* Fee coverage toggle */}
      {amountCents > 0 && (
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              className="sr-only"
              checked={coverFee}
              onChange={(e) => setCoverFee(e.target.checked)}
            />
            <div className={`h-5 w-5 rounded-md ring-1 transition flex items-center justify-center ${
              coverFee ? "bg-[#C4EBF2] ring-[#C4EBF2]/40" : "bg-white/5 ring-white/15"
            }`}>
              {coverFee && (
                <svg className="h-3 w-3 text-[#0B0F1C]" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <span className="text-sm text-white/70 group-hover:text-white/90 transition">
              Cover the processing fee <span className="text-white/35">(2.9% + $0.30 = {fmt(feeCents)})</span>
            </span>
            <p className="text-xs text-white/30 mt-0.5">Ensures 100% of your donation reaches the fund</p>
          </div>
        </label>
      )}

      {/* Breakdown */}
      {amountCents > 0 && (
        <div className="rounded-2xl bg-white/4 ring-1 ring-white/8 px-4 py-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-white/50">
            <span>Donation</span>
            <span>{fmt(amountCents)}</span>
          </div>
          {tipCents > 0 && (
            <div className="flex justify-between text-white/40">
              <span>Platform tip</span>
              <span>{fmt(tipCents)}</span>
            </div>
          )}
          {feeCents > 0 && (
            <div className="flex justify-between text-white/40">
              <span>Processing fee</span>
              <span>{fmt(feeCents)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-[#FFD28F] pt-1 border-t border-white/8">
            <span>Total</span>
            <span>{fmt(totalCents)}</span>
          </div>
        </div>
      )}

      {/* Donor info */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Your Name</label>
          <input name="donor_name" placeholder="Optional" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Email</label>
          <input name="donor_email" type="email" placeholder="Optional" className={inputCls} />
        </div>
      </div>

      <button
        type="submit"
        disabled={amountCents <= 0}
        className="w-full rounded-full bg-[#FF9B6A] py-4 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] hover:shadow-[0_10px_36px_rgba(255,155,106,0.35)] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Donate {totalCents > 0 ? fmt(totalCents) : ""} →
      </button>

      <p className="text-[10px] text-white/20 text-center">
        Funds go directly to the designated nonprofit pool, held by The Shared Mile Foundation.
      </p>
    </form>
  );
}

export default function DonationForm(props: {
  nonprofits: Nonprofit[];
  submitAction: (formData: FormData) => Promise<void>;
  successMessage?: boolean;
  errorMessage?: string | null;
}) {
  return (
    <Suspense fallback={<div className="h-1 w-16 rounded-full bg-white/10 animate-pulse mx-auto my-8" />}>
      <DonationFormInner {...props} />
    </Suspense>
  );
}
