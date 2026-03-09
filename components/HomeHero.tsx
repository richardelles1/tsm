"use client";

import Link from "next/link";
import { useState } from "react";

type AudienceKey = "athletes" | "nonprofits" | "partners";

const TABS: { key: AudienceKey; label: string }[] = [
  { key: "athletes", label: "Athletes" },
  { key: "nonprofits", label: "Nonprofits" },
  { key: "partners", label: "Impact Partners" },
];

function Check({ muted }: { muted?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 mt-0.5 ${muted ? "text-white/20" : "text-[#FF9B6A]"}`}
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Eyebrow({ text }: { text: string }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.22em] text-white/35 uppercase mb-4">
      {text}
    </div>
  );
}

function Prop({ text, muted, soon }: { text: string; muted?: boolean; soon?: boolean }) {
  return (
    <div className={`flex items-start gap-3 text-left ${muted ? "opacity-40" : ""}`}>
      <Check muted={muted} />
      <p className="text-sm text-white/65 leading-relaxed">
        {text}
        {soon && (
          <span className="ml-2 inline-block rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-bold tracking-widest text-white/35 uppercase ring-1 ring-white/10 align-middle">
            Soon
          </span>
        )}
      </p>
    </div>
  );
}

type Step = {
  num: string;
  color: string;
  glow: string;
  title: string;
  body: string;
};

function StepsGrid({ steps }: { steps: Step[] }) {
  return (
    <div className="w-full mt-10 pt-8 border-t border-white/8">
      <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase mb-5 text-center">
        Your 3-Step Process
      </div>
      <div className="grid gap-3 sm:grid-cols-3 text-left">
        {steps.map((step) => (
          <div
            key={step.num}
            className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5"
            style={{ boxShadow: `0 8px 40px 0 ${step.glow}` }}
          >
            <div className={`text-3xl font-black ${step.color} mb-3 leading-none`}>{step.num}</div>
            <h3 className="text-sm font-semibold mb-1.5">{step.title}</h3>
            <p className="text-xs text-white/50 leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const ATHLETE_STEPS: Step[] = [
  {
    num: "01",
    color: "text-[#FF9B6A]",
    glow: "rgba(255,155,106,0.10)",
    title: "Claim a Challenge",
    body: "Browse the marketplace and lock in a challenge tied to a cause and a real dollar amount already sitting in a pool, waiting for you.",
  },
  {
    num: "02",
    color: "text-[#C4EBF2]",
    glow: "rgba(196,235,242,0.08)",
    title: "Move and Verify",
    body: "Complete the distance. Upload a photo or connect your tracker. Your effort is the proof.",
  },
  {
    num: "03",
    color: "text-[#FFD28F]",
    glow: "rgba(255,210,143,0.10)",
    title: "Funding Gets Released",
    body: "Once approved, committed funds move to the nonprofit. If an Impact Partner is backing your challenge, the amount doubles.",
  },
];

const PARTNER_STEPS: Step[] = [
  {
    num: "01",
    color: "text-[#C4EBF2]",
    glow: "rgba(196,235,242,0.08)",
    title: "Commit to a Pool",
    body: "Choose your cause and deposit matching funds. They sit in a dedicated, auditable pool waiting for athletes to activate them. No movement, no release.",
  },
  {
    num: "02",
    color: "text-[#FF9B6A]",
    glow: "rgba(255,155,106,0.10)",
    title: "Athletes Do the Work",
    body: "When a challenge is claimed and completed, your committed dollars are unlocked. You set the parameters; athletes deliver the activity.",
  },
  {
    num: "03",
    color: "text-[#FFD28F]",
    glow: "rgba(255,210,143,0.10)",
    title: "Your Match Gets Applied",
    body: "At payout, your contribution is matched against what athletes unlocked. The nonprofit receives more, and you get a full impact report.",
  },
];

const NONPROFIT_STEPS: Step[] = [
  {
    num: "01",
    color: "text-[#C4EBF2]",
    glow: "rgba(196,235,242,0.08)",
    title: "Apply and Get Listed",
    body: "Submit your organization to join the platform. We review your application and build out your cause profile.",
  },
  {
    num: "02",
    color: "text-[#FF9B6A]",
    glow: "rgba(255,155,106,0.10)",
    title: "Challenges Go Live",
    body: "Athletes claim challenges in your name. Every completion unlocks real committed dollars that are already earmarked for your cause.",
  },
  {
    num: "03",
    color: "text-[#FFD28F]",
    glow: "rgba(255,210,143,0.10)",
    title: "Receive the Funds",
    body: "Once activity is verified, money moves directly to you. No gala, no campaign, no asks. Just funds released by movement.",
  },
];

function AthletesPanel() {
  return (
    <div className="flex flex-col items-center">
      <Eyebrow text="For Athletes" />
      <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05] mb-6">
        Add Meaning to<br />
        <span className="text-[#FFD28F]">Your Miles.</span>
      </h2>
      <p className="text-base sm:text-lg text-white/60 max-w-lg mx-auto leading-relaxed mb-8">
        You&apos;re already putting in the work. Now your miles can fund causes that matter. Claim a challenge, complete it, and watch real money move to a nonprofit you actually care about.
      </p>
      <div className="w-full max-w-sm mx-auto flex flex-col gap-3 mb-10 text-left">
        <Prop text="No donations, no asks. Your movement does the giving." />
        <Prop text="Pick challenges tied to causes you believe in." />
        <Prop text="When a corporate partner backs your challenge, they can match what you unlock." />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm sm:max-w-none mx-auto">
        <Link
          href="/challenges"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#FF9B6A] px-8 py-4 text-base font-bold text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,155,106,0.30)] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all"
        >
          Browse Challenges →
        </Link>
      </div>
      <StepsGrid steps={ATHLETE_STEPS} />
    </div>
  );
}

function NonprofitsPanel() {
  return (
    <div className="flex flex-col items-center">
      <Eyebrow text="For Nonprofits" />
      <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05] mb-6">
        Turn Movement<br />
        <span className="text-[#FFD28F]">Into Momentum.</span>
      </h2>
      <p className="text-base sm:text-lg text-white/60 max-w-lg mx-auto leading-relaxed mb-6">
        A funding source that doesn&apos;t require a gala, a campaign, or asking your donors for more. Athletes earn it. Corporate partners match it. You receive it.
      </p>
      <div className="w-full max-w-lg mx-auto rounded-2xl bg-[#FFD28F]/8 ring-1 ring-[#FFD28F]/15 px-5 py-4 mb-8 text-left">
        <p className="text-sm text-[#FFD28F]/80 leading-relaxed">
          When a match partner is in play, every dollar released can become two. That&apos;s not a rounding error. That&apos;s a category shift in how you fund your mission.
        </p>
      </div>
      <div className="w-full max-w-sm mx-auto flex flex-col gap-3 mb-10 text-left">
        <Prop text="Double your donations when a match partner backs your challenge." />
        <Prop text="Zero fundraising overhead. No campaigns to run, no events to host." />
        <Prop text="Real-time visibility into how much is unlocking for your cause." />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm sm:max-w-none mx-auto">
        <Link
          href="/contact?type=nonprofit"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#FF9B6A] px-8 py-4 text-base font-bold text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,155,106,0.30)] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all"
        >
          Apply to Be a Beneficiary →
        </Link>
      </div>
      <StepsGrid steps={NONPROFIT_STEPS} />
    </div>
  );
}

function PartnersPanel() {
  return (
    <div className="flex flex-col items-center">
      <Eyebrow text="For Impact Partners" />
      <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05] mb-6">
        Amplify<br />
        <span className="text-[#FFD28F]">Every Mile.</span>
      </h2>
      <p className="text-base sm:text-lg text-white/60 max-w-lg mx-auto leading-relaxed mb-8">
        You commit the funds. Athletes activate them. We give you the story, for your board, your team, and anyone watching your ESG commitments.
      </p>
      <div className="w-full max-w-sm mx-auto flex flex-col gap-3 mb-10 text-left">
        <Prop text='Impact reports with real outcomes. Not "we gave $10k" but "your commitment funded 8,400 meals for children in need."' />
        <Prop text="Your brand on every challenge you back, seen by athletes in motion. Awareness that feels nothing like advertising." />
        <Prop text="Activity metrics for your reports: miles moved, athletes inspired, activities completed." />
        <Prop
          text="Run your own challenges for employees. Team leaderboards, shared milestones, and an interactive map of how far your company moved together."
          muted
          soon
        />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm sm:max-w-none mx-auto">
        <Link
          href="/contact?type=partner"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#FF9B6A] px-8 py-4 text-base font-bold text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,155,106,0.30)] hover:bg-[#FFB48E] hover:-translate-y-0.5 transition-all"
        >
          Become an Impact Partner →
        </Link>
      </div>
      <StepsGrid steps={PARTNER_STEPS} />
    </div>
  );
}

export default function HomeHero() {
  const [active, setActive] = useState<AudienceKey>("athletes");

  return (
    <section className="relative px-6 py-20 bg-[#070A12]">
      <div className="mx-auto max-w-2xl text-center">

        {/* Section label */}
        <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase mb-8">
          Who It&apos;s For
        </div>

        {/* Audience toggle — equal width pills */}
        <div className="flex justify-center mb-14">
          <div className="flex w-full max-w-sm rounded-full bg-white/6 ring-1 ring-white/10 p-1 gap-1">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 ${
                  active === key
                    ? "bg-[#FF9B6A] text-[#0B0F1C] shadow-[0_4px_16px_rgba(255,155,106,0.35)]"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Panels — overlaid for crossfade */}
        <div className="grid">
          <div
            className={`col-start-1 row-start-1 transition-opacity duration-300 ${
              active === "athletes" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <AthletesPanel />
          </div>
          <div
            className={`col-start-1 row-start-1 transition-opacity duration-300 ${
              active === "nonprofits" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <NonprofitsPanel />
          </div>
          <div
            className={`col-start-1 row-start-1 transition-opacity duration-300 ${
              active === "partners" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <PartnersPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
