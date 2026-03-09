"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { submitContactInquiry } from "./actions";

const inputCls =
  "w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/25 transition text-white";

const selectCls =
  "w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none transition text-white appearance-none";

type InquiryType = "partner" | "nonprofit";

function ContactFormInner({
  successMessage,
  errorMessage,
}: {
  successMessage: boolean;
  errorMessage: string | null;
}) {
  const searchParams = useSearchParams();
  const [type, setType] = useState<InquiryType>("partner");

  useEffect(() => {
    const t = searchParams.get("type");
    if (t === "nonprofit") setType("nonprofit");
    else setType("partner");
  }, [searchParams]);

  const isPartner = type === "partner";

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/25 p-4">
          <div className="text-sm font-semibold text-emerald-200">Message received.</div>
          <div className="text-xs text-emerald-300/70 mt-1">
            We will be in touch shortly at the email you provided.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 p-4">
          <div className="text-sm font-semibold text-red-200">Something went wrong.</div>
          <div className="text-xs text-red-300/70 mt-1">{decodeURIComponent(errorMessage)}</div>
        </div>
      )}

      {/* Toggle */}
      <div className="flex rounded-2xl bg-black/30 ring-1 ring-white/10 p-1 gap-1">
        <button
          type="button"
          onClick={() => setType("partner")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            isPartner
              ? "bg-[#C4EBF2] text-[#0B0F1C] shadow-[0_2px_12px_rgba(196,235,242,0.20)]"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          Impact Partner
        </button>
        <button
          type="button"
          onClick={() => setType("nonprofit")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            !isPartner
              ? "bg-[#FF9B6A] text-[#0B0F1C] shadow-[0_2px_12px_rgba(255,155,106,0.20)]"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          Nonprofit
        </button>
      </div>

      {/* Context blurb */}
      <p className="text-xs text-white/45 leading-relaxed">
        {isPartner
          ? "Impact Partners commit funds that athletes unlock through verified physical activity. Your contribution is matched against real movement and released only when challenges are completed."
          : "Nonprofits receive funds unlocked by athletes completing distance challenges. We handle the pool management, matching, and payouts. You focus on the mission."}
      </p>

      <form action={submitContactInquiry} className="space-y-4">
        <input type="hidden" name="type" value={type} />

        {/* Common fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/45 uppercase tracking-wider">
              Your Name <span className="text-[#FF9B6A]">*</span>
            </label>
            <input name="name" required placeholder="Jane Smith" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/45 uppercase tracking-wider">
              Email <span className="text-[#FF9B6A]">*</span>
            </label>
            <input name="email" type="email" required placeholder="jane@example.com" className={inputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/45 uppercase tracking-wider">
            Organization Name <span className="text-[#FF9B6A]">*</span>
          </label>
          <input
            name="org"
            required
            placeholder={isPartner ? "Acme Corp" : "Friends of the Trail"}
            className={inputCls}
          />
        </div>

        {/* Impact Partner fields */}
        {isPartner && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/45 uppercase tracking-wider">
                  Estimated Annual Budget
                </label>
                <select name="budget" className={selectCls}>
                  <option value="">Prefer not to say</option>
                  <option value="Under $10k">Under $10k</option>
                  <option value="$10k – $50k">$10k – $50k</option>
                  <option value="$50k – $250k">$50k – $250k</option>
                  <option value="$250k+">$250k+</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/45 uppercase tracking-wider">
                  Industry
                </label>
                <input
                  name="industry"
                  placeholder="e.g. Financial Services, Health"
                  className={inputCls}
                />
              </div>
            </div>
          </>
        )}

        {/* Nonprofit fields */}
        {!isPartner && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/45 uppercase tracking-wider">
                  Website
                </label>
                <input name="website" type="url" placeholder="https://example.org" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/45 uppercase tracking-wider">
                  501(c)(3) Status
                </label>
                <select name="status_501c3" className={selectCls}>
                  <option value="Yes">Yes</option>
                  <option value="Pending">Pending</option>
                  <option value="No">No</option>
                  <option value="International equivalent">International equivalent</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/45 uppercase tracking-wider">
                Cause Area
              </label>
              <input
                name="cause"
                placeholder="e.g. Youth sports, environmental conservation"
                className={inputCls}
              />
            </div>
          </>
        )}

        {/* Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/45 uppercase tracking-wider">
            {isPartner ? "Tell us about your giving goals" : "Tell us about your organization"}{" "}
            <span className="text-[#FF9B6A]">*</span>
          </label>
          <textarea
            name="message"
            required
            rows={4}
            placeholder={
              isPartner
                ? "What causes matter to your organization? Are you exploring cause marketing, employee giving, or something else?"
                : "What is your mission? Who do you serve? How would movement-powered funding fit your work?"
            }
            className={`${inputCls} resize-none`}
          />
        </div>

        <button
          type="submit"
          className={`w-full rounded-full py-4 text-sm font-bold text-[#0B0F1C] transition-all hover:-translate-y-0.5 active:scale-[0.98] ${
            isPartner
              ? "bg-[#C4EBF2] shadow-[0_8px_24px_rgba(196,235,242,0.18)] hover:shadow-[0_10px_36px_rgba(196,235,242,0.28)]"
              : "bg-[#FF9B6A] shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] hover:shadow-[0_10px_36px_rgba(255,155,106,0.35)]"
          }`}
        >
          {isPartner ? "Apply as Impact Partner" : "Apply as Nonprofit"} →
        </button>

        <p className="text-[10px] text-white/20 text-center">
          We review every submission personally. You will hear back within a few business days.
        </p>
      </form>
    </div>
  );
}

export default function ContactForm({
  successMessage,
  errorMessage,
}: {
  successMessage: boolean;
  errorMessage: string | null;
}) {
  return (
    <Suspense fallback={<div className="h-1 w-16 rounded-full bg-white/10 animate-pulse mx-auto my-8" />}>
      <ContactFormInner successMessage={successMessage} errorMessage={errorMessage} />
    </Suspense>
  );
}
