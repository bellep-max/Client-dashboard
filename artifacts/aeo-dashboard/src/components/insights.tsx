/**
 * Shared read-only insight widgets used by the Won Keywords page, the
 * Optimization page, the campaign detail page, and the dashboard. All purely
 * presentational — no data fetching, no mutation.
 */
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlatformRank, RankTrend } from "@/lib/portal-api";

export const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
  google: "Google",
};

export function platformLabel(key: string): string {
  return PLATFORM_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Color a rank position: top-3 green, 4–10 amber, >10 muted. */
function rankColor(position: number | null | undefined): string {
  if (position == null) return "text-muted-foreground";
  if (position <= 3) return "text-emerald-600 dark:text-emerald-400";
  if (position <= 10) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function RankBadge({
  position,
}: {
  position: number | null | undefined;
}) {
  return (
    <span
      className={cn("font-mono text-sm font-semibold", rankColor(position))}
    >
      {position == null ? "—" : `#${position}`}
    </span>
  );
}

export function TrendBadge({
  trend,
  totalRuns,
}: {
  trend: RankTrend;
  totalRuns?: number;
}) {
  // A trend needs at least two measurements to mean anything. Until then show
  // "New" instead of a misleading "Steady".
  if (totalRuns != null && totalRuns < 2) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" /> New
      </span>
    );
  }
  if (trend === "improving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="w-3.5 h-3.5" /> Improving
      </span>
    );
  }
  if (trend === "declining") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <TrendingDown className="w-3.5 h-3.5" /> Declining
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="w-3.5 h-3.5" /> Steady
    </span>
  );
}

export function AtRiskBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs"
    >
      <AlertTriangle className="w-3 h-3" /> At risk
    </Badge>
  );
}

/**
 * Tiny inline rank trend line. Positions are ranks (lower is better) so the
 * Y axis is inverted: a line that climbs upward means the rank is improving.
 */
export function Sparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  if (!data || data.length < 2) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const w = 80;
  const h = 24;
  const pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      // invert: lower rank (better) → higher on the chart
      const y = pad + ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = data[data.length - 1];
  const first = data[0];
  const stroke =
    last < first
      ? "stroke-emerald-500"
      : last > first
        ? "stroke-amber-500"
        : "stroke-muted-foreground";
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-6 w-20", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        className={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StabilityBar({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, percent));
  const color =
    pct >= 66
      ? "bg-emerald-500"
      : pct >= 33
        ? "bg-amber-500"
        : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

/** Small per-platform rank chips, only rendering platforms with data. */
export function PlatformChips({
  platforms,
}: {
  platforms: Record<string, PlatformRank>;
}) {
  const entries = Object.entries(platforms).filter(
    ([, v]) => v && v.position != null,
  );
  if (entries.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No rankings yet</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, v]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px]"
          title={v.date ? `as of ${v.date}` : undefined}
        >
          <span className="text-muted-foreground">{platformLabel(key)}</span>
          <RankBadge position={v.position} />
        </span>
      ))}
    </div>
  );
}
