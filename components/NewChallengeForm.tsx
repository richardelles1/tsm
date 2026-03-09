"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { ImpactStatement, computeImpact } from "@/lib/impactStatement";

type DonorPool = {
  id: string;
  source_name: string | null;
  pool_type: string | null;
  remaining_amount_cents: number | null;
  nonprofits: { name: string | null; impact_statements?: ImpactStatement[] | null } | null;
};

type Partner = {
  id: string;
  name: string | null;
};

type Props = {
  donorPools: DonorPool[];
  partners: Partner[];
  action: (formData: FormData) => Promise<void>;
  errorMsg: string | null;
};

function formatUsd(cents: number | null | undefined) {
  const safe = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe / 100);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[#FFD28F] px-7 py-3 text-sm font-bold text-[#0B0F1C] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all shadow-[0_8px_24px_rgba(255,210,143,0.18)] disabled:opacity-60 disabled:translate-y-0 disabled:cursor-wait"
    >
      {pending ? (
        <>
          <svg className="animate-spin h-4 w-4 text-[#0B0F1C]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Creating...
        </>
      ) : (
        "Create Challenge →"
      )}
    </button>
  );
}

const input = "w-full h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-neutral-100 placeholder:text-white/30 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/30 transition text-sm";
const textarea = "w-full min-h-[80px] rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-neutral-100 placeholder:text-white/30 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/30 transition text-sm";
const selectClass = "w-full h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-neutral-100 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/30 transition text-sm";
const label = "text-sm font-medium text-neutral-100";
const help = "text-xs text-white/35";
const card = "rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5";
const sectionLabel = "text-[10px] font-bold tracking-[0.20em] text-white/35 uppercase pl-3 border-l-2 border-[#FF9B6A]/50";

const ACTIVITIES = [
  { value: "run", label: "Run" },
  { value: "walk", label: "Walk" },
  { value: "cycle", label: "Cycle" },
];

export default function NewChallengeForm({ donorPools, partners, action, errorMsg }: Props) {
  const [activity, setActivity] = useState("run");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [pinnedIndex, setPinnedIndex] = useState<number | "random">("random");
  const [amountDollars, setAmountDollars] = useState(25);

  const selectedPool = donorPools.find((p) => p.id === selectedPoolId) ?? null;
  const availableStatements: ImpactStatement[] = selectedPool?.nonprofits?.impact_statements ?? [];

  const pinnedStatement: ImpactStatement | null =
    pinnedIndex === "random" || !availableStatements[pinnedIndex as number]
      ? null
      : availableStatements[pinnedIndex as number];

  return (
    <form action={action} className="space-y-5">

      {errorMsg && (
        <div className="rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 p-4 text-sm text-red-200">
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      {/* Card 1: Challenge Details */}
      <div className={card}>
        <div className={sectionLabel}>Challenge Details</div>

        <div className="space-y-1.5">
          <label className={label}>Title</label>
          <input
            name="title"
            placeholder="Run 3 miles to unlock $25 for City Food Bank"
            className={input}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className={label}>
            Description{" "}
            <span className="text-white/30 font-normal">(optional)</span>
          </label>
          <textarea
            name="description"
            placeholder="Short context shown on the challenge card"
            className={textarea}
          />
        </div>

        {/* Activity pill toggle */}
        <div className="space-y-1.5">
          <label className={label}>Activity</label>
          <input type="hidden" name="activity" value={activity} />
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITIES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setActivity(a.value)}
                className={`h-11 rounded-xl text-sm font-semibold transition-all ${
                  activity === a.value
                    ? "bg-[#FF9B6A] text-[#0B0F1C] shadow-[0_4px_16px_rgba(255,155,106,0.30)]"
                    : "ring-1 ring-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:ring-white/20"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Distance + Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={label}>Distance</label>
            <div className="relative">
              <input
                name="distance_miles"
                type="number"
                step="0.1"
                min="0.1"
                defaultValue="3"
                className={`${input} pr-10`}
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-medium">
                mi
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>Amount</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl font-black text-white/30 leading-none">
                $
              </span>
              <input
                name="amount_dollars"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue="25"
                className="w-full h-11 rounded-xl border border-white/10 bg-black/30 pl-8 pr-3 text-2xl font-black text-[#FFD28F] placeholder:text-white/30 outline-none focus:border-[#FFD28F]/40 focus:ring-2 focus:ring-[#FFD28F]/30 transition"
                required
                onChange={(e) => setAmountDollars(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Pool and Options */}
      <div className={card}>
        <div className={sectionLabel}>Pool and Options</div>

        <div className="space-y-1.5">
          <label className={label}>Funding Pool</label>
          <select
            name="funding_pool_id"
            defaultValue=""
            className={selectClass}
            required
            onChange={(e) => { setSelectedPoolId(e.target.value); setPinnedIndex("random"); }}
          >
            <option value="" disabled>Select a donor pool...</option>
            {donorPools.map((p) => {
              const npName = p?.nonprofits?.name ?? "Unrestricted";
              return (
                <option key={p.id} value={p.id}>
                  {p.source_name} — {npName} — {formatUsd(p.remaining_amount_cents)} remaining
                </option>
              );
            })}
          </select>
          <div className={help}>
            Nonprofit and lane are set from the pool. Funds are only deducted on approval.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={label}>Slots</label>
            <input
              name="slots_total"
              type="number"
              step="1"
              min="1"
              defaultValue="1"
              className={input}
            />
            <div className={help}>Athletes who can claim this challenge.</div>
          </div>

          <div className="space-y-1.5">
            <label className={label}>
              Expires At{" "}
              <span className="text-white/30 font-normal">(optional)</span>
            </label>
            <input name="expires_at" type="datetime-local" className={input} />
          </div>
        </div>

        {/* Impact statement pin */}
        <input
          type="hidden"
          name="pinned_impact_statement"
          value={pinnedStatement ? JSON.stringify(pinnedStatement) : ""}
        />
        {availableStatements.length > 0 && (
          <div className="border-t border-white/8 pt-5 space-y-3">
            <div className={sectionLabel}>
              Impact Statement{" "}
              <span className="font-normal normal-case tracking-normal text-white/25">
                — shown on cards and completion screens
              </span>
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer">
                <input
                  type="radio"
                  name="_pin_idx"
                  className="mt-0.5 accent-[#FFD28F]"
                  checked={pinnedIndex === "random"}
                  onChange={() => setPinnedIndex("random")}
                />
                <div>
                  <div className="text-sm font-medium">Random (default)</div>
                  <div className={help}>Cycles through all of the nonprofit's impact statements.</div>
                </div>
              </label>
              {availableStatements.map((stmt, i) => {
                const preview = computeImpact(stmt, Math.round(amountDollars * 100));
                return (
                  <label key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer">
                    <input
                      type="radio"
                      name="_pin_idx"
                      className="mt-0.5 accent-[#FFD28F]"
                      checked={pinnedIndex === i}
                      onChange={() => setPinnedIndex(i)}
                    />
                    <div>
                      <div className="text-sm font-medium text-[#FFD28F]/80">{preview}</div>
                      <div className={help}>
                        {stmt.type === "quantity"
                          ? `$${stmt.dollars_per_unit} per ${stmt.label}`
                          : `General: ${stmt.description}`}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Match partner section */}
        <div className="border-t border-white/8 pt-5 space-y-4">
          <div className={sectionLabel}>
            Match Partner{" "}
            <span className="font-normal normal-case tracking-normal text-white/25">
              — optional
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={label}>Corporate Partner</label>
              <select
                name="corporate_partner_pmp_id"
                defaultValue=""
                className={selectClass}
              >
                <option value="">None</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className={label}>Match Multiplier</label>
              <input
                name="match_ratio"
                type="number"
                step="0.1"
                min="0"
                defaultValue="1.0"
                className={input}
              />
              <div className={help}>1.0 = 1:1 match. Only applies if a partner is selected.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <SubmitButton />
        <a
          href="/admin/challenges"
          className="text-sm text-white/35 hover:text-white/60 transition"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
