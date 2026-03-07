"use client";

import { useState } from "react";
import { markPayablesPaid } from "@/app/admin/payables/actions";

interface Props {
  payableIds: string[];
  nonprofitName: string;
  totalCents: number;
}

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default function PayablesBatchAction({ payableIds, nonprofitName, totalCents }: Props) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await markPayablesPaid(payableIds, provider, ref);

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="rounded-full bg-[#FF9B6A]/15 px-4 py-2 text-sm text-[#FF9B6A] ring-1 ring-[#FF9B6A]/30 hover:bg-[#FF9B6A]/25 hover:ring-[#FF9B6A]/50 transition"
      >
        Mark {payableIds.length} as Paid →
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-[#0D1326] ring-1 ring-white/15 p-8 shadow-[0_0_60px_10px_rgba(0,0,0,0.6)]">
            <h2 className="text-lg font-semibold">Confirm Payout</h2>
            <p className="mt-1 text-sm text-white/60">
              Marking <span className="text-white">{payableIds.length} payable{payableIds.length > 1 ? "s" : ""}</span> as paid for{" "}
              <span className="text-white">{nonprofitName}</span>
            </p>

            <div className="mt-4 rounded-2xl bg-[#FFD28F]/10 ring-1 ring-[#FFD28F]/20 p-4 text-center">
              <div className="text-[#FFD28F] text-2xl font-semibold">{money(totalCents)}</div>
              <div className="text-xs text-white/50 mt-1">total payout amount</div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Payment method <span className="text-white/30">(optional)</span>
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full rounded-xl bg-white/5 ring-1 ring-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-[#FFD28F]/40"
                >
                  <option value="">Select…</option>
                  <option value="stripe">Stripe</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="ach">ACH</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Reference / check # <span className="text-white/30">(optional)</span>
                </label>
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="e.g. CHK-1042 or Stripe transfer ID"
                  className="w-full rounded-xl bg-white/5 ring-1 ring-white/15 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-[#FFD28F]/40"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full bg-white/5 px-4 py-2.5 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-full bg-[#FF9B6A] px-4 py-2.5 text-sm font-medium text-[#0B0F1C] hover:bg-[#FFB48E] transition disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Confirm Paid"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
