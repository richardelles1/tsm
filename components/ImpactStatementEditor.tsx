"use client";

import { useState } from "react";
import { ImpactStatement, QuantityStatement, GeneralStatement } from "@/lib/impactStatement";

type Props = {
  initial: ImpactStatement[];
};

const input = "w-full h-9 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-neutral-100 placeholder:text-neutral-400/60 outline-none focus:border-white/20";
const inputSm = "h-9 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-neutral-100 placeholder:text-neutral-400/60 outline-none focus:border-white/20";

function blankQuantity(): QuantityStatement {
  return { type: "quantity", dollars_per_unit: 5, label: "" };
}

function blankGeneral(): GeneralStatement {
  return { type: "general", description: "" };
}

export default function ImpactStatementEditor({ initial }: Props) {
  const [statements, setStatements] = useState<ImpactStatement[]>(initial ?? []);

  function update(index: number, patch: Partial<ImpactStatement>) {
    setStatements((prev) =>
      prev.map((s, i) => (i === index ? ({ ...s, ...patch } as ImpactStatement) : s))
    );
  }

  function remove(index: number) {
    setStatements((prev) => prev.filter((_, i) => i !== index));
  }

  function addQuantity() {
    if (statements.length >= 6) return;
    setStatements((prev) => [...prev, blankQuantity()]);
  }

  function addGeneral() {
    if (statements.length >= 6) return;
    setStatements((prev) => [...prev, blankGeneral()]);
  }

  function switchType(index: number, newType: "quantity" | "general") {
    setStatements((prev) =>
      prev.map((s, i) =>
        i !== index
          ? s
          : newType === "quantity"
          ? blankQuantity()
          : blankGeneral()
      )
    );
  }

  const help = "text-xs text-neutral-300/70";

  return (
    <div className="space-y-3">
      <input type="hidden" name="impact_statements" value={JSON.stringify(statements)} />

      {statements.length === 0 && (
        <p className={help}>No statements yet. Add one below.</p>
      )}

      {statements.map((stmt, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchType(i, "quantity")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  stmt.type === "quantity"
                    ? "bg-[#FFD28F]/20 text-[#FFD28F] ring-1 ring-[#FFD28F]/30"
                    : "bg-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                $ per unit
              </button>
              <button
                type="button"
                onClick={() => switchType(i, "general")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  stmt.type === "general"
                    ? "bg-[#C4EBF2]/20 text-[#C4EBF2] ring-1 ring-[#C4EBF2]/30"
                    : "bg-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                General $
              </button>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-red-400/60 hover:text-red-400 transition"
            >
              Remove
            </button>
          </div>

          {stmt.type === "quantity" ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-white/50 shrink-0">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={`${inputSm} w-24`}
                value={(stmt as QuantityStatement).dollars_per_unit}
                placeholder="5"
                onChange={(e) =>
                  update(i, { dollars_per_unit: parseFloat(e.target.value) || 0 })
                }
              />
              <span className="text-sm text-white/50 shrink-0">=</span>
              <span className="text-sm text-white/50 shrink-0">1</span>
              <input
                type="text"
                className={`${inputSm} flex-1 min-w-[120px]`}
                value={(stmt as QuantityStatement).label}
                placeholder="school lunch"
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <p className={`${help} w-full`}>
                Example: $5 = 1 school lunch. When a $25 challenge unlocks, it shows "$25 = 5 school lunches."
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-white/50 shrink-0">$ toward/for</span>
              <input
                type="text"
                className={`${inputSm} flex-1 min-w-[180px]`}
                value={(stmt as GeneralStatement).description}
                placeholder="mitochondrial disease research"
                onChange={(e) => update(i, { description: e.target.value })}
              />
              <p className={`${help} w-full`}>
                Example: "$25 toward mitochondrial disease research."
              </p>
            </div>
          )}
        </div>
      ))}

      {statements.length < 6 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addQuantity}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-neutral-300 hover:bg-white/10 transition"
          >
            + Per-unit statement
          </button>
          <button
            type="button"
            onClick={addGeneral}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-neutral-300 hover:bg-white/10 transition"
          >
            + General statement
          </button>
        </div>
      )}
      {statements.length >= 6 && (
        <p className={help}>Maximum of 6 statements reached.</p>
      )}
    </div>
  );
}
