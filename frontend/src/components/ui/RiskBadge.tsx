import { riskLabelText } from "@/lib/utils";

interface Props {
  label: string;
  score?: number;
  className?: string;
}

export function RiskBadge({ label, score, className }: Props) {
  const cls = `risk-${label}`;
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${cls} ${className ?? ""}`}
    >
      Riesgo: {riskLabelText(label)}
      {typeof score === "number" && <span className="opacity-70">({score.toFixed(1)})</span>}
    </span>
  );
}
