import { ImpactStatement, computeImpact } from "@/lib/impactStatement";

type Props = {
  statement: ImpactStatement | null;
  amountCents: number;
  size?: "sm" | "md";
};

export default function ImpactBadge({ statement, amountCents, size = "sm" }: Props) {
  if (!statement) return null;
  const text = computeImpact(statement, amountCents);
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 ${textSize} font-medium text-[#FFD28F]/80`}
      title="Estimated impact when funds unlock"
    >
      <svg
        className="shrink-0"
        width={size === "md" ? 12 : 10}
        height={size === "md" ? 12 : 10}
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden="true"
      >
        <path d="M5.5 1L2 5.5h3L4.5 9 8 4.5H5L5.5 1z" fill="#FFD28F" opacity="0.8" />
      </svg>
      {text}
    </span>
  );
}
