import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gold" | "ghost";
};

export function Button({ variant = "gold", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";

  const gold =
    "bg-[rgba(240,197,122,0.92)] text-[#081022] shadow-[0_10px_30px_rgba(240,197,122,0.14)] hover:bg-[rgba(240,197,122,1)] hover:-translate-y-[1px]";

  const ghost =
    "bg-transparent text-[rgba(245,241,232,0.9)] border border-[rgba(154,196,255,0.18)] hover:border-[rgba(240,197,122,0.28)] hover:bg-[rgba(11,22,48,0.25)]";

  const styles = variant === "gold" ? gold : ghost;

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
