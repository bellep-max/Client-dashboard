import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Target,
  ListChecks,
  Info,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { listPortalReports, type PortalReport } from "@/lib/portal-api";

const REPORTS_KEY = ["portal", "reports"] as const;

function periodLabel(r: PortalReport): string {
  const start = format(new Date(r.periodStart), "MMM d");
  const end = format(new Date(r.periodEnd), "MMM d, yyyy");
  return `${start} – ${end}`;
}

function steadyCount(r: PortalReport): number {
  return Math.max(
    0,
    r.keywordsTracked - r.keywordsImproved - r.keywordsDeclined,
  );
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** Plain-English recap a non-technical customer can read at a glance. */
function plainSummary(r: PortalReport): string {
  const out: string[] = [];
  const n = r.keywordsTracked;
  out.push(
    `Over these two weeks we checked ${n} search ${n === 1 ? "phrase" : "phrases"} for your business across ChatGPT, Gemini, and Perplexity.`,
  );
  const moves: string[] = [];
  if (r.keywordsImproved) moves.push(`${r.keywordsImproved} moved up`);
  if (r.keywordsDeclined) moves.push(`${r.keywordsDeclined} slipped`);
  const steady = steadyCount(r);
  if (steady) moves.push(`${steady} stayed about the same`);
  if (moves.length)
    out.push(`Compared with the previous report, ${joinList(moves)}.`);
  if (r.averagePosition != null)
    out.push(
      `On average you show up around position #${Math.round(r.averagePosition)} in AI answers — the closer to #1, the better.`,
    );
  if (r.visibilityScore != null)
    out.push(
      `Overall, your business appeared in about ${Math.round(r.visibilityScore)}% of the checks we ran.`,
    );
  return out.join(" ");
}

export default function ReportsPage() {
  const [selected, setSelected] = useState<PortalReport | null>(null);

  const { data: reports, isLoading } = useQuery<PortalReport[]>({
    queryKey: REPORTS_KEY,
    queryFn: listPortalReports,
  });

  return (
    <div className="flex h-[calc(100vh-2px)] overflow-hidden">
      {/* Left — report period list */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-border bg-card flex flex-col h-full shrink-0 ${
          selected ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold">Your Reports</h1>
          <p className="text-sm text-muted-foreground">
            Every 2 weeks we check how your business shows up in AI search
            answers and summarize what changed.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !reports || reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">
                No reports yet. Your first one will appear here after we run a
                couple of weeks of checks.
              </p>
            </div>
          ) : (
            reports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r)}
                aria-pressed={selected?.id === r.id}
                className={`w-full text-left p-4 hover:bg-muted/40 transition-colors flex items-center gap-3 ${
                  selected?.id === r.id
                    ? "bg-primary/5 border-l-2 border-primary"
                    : ""
                }`}
              >
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {periodLabel(r)}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-green-600 font-medium">
                      ↑ {r.keywordsImproved} moved up
                    </span>
                    <span className="text-xs text-red-500 font-medium">
                      ↓ {r.keywordsDeclined} slipped
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right — period detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <FileText className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground text-sm">
              Pick a date range on the left to see how your business did.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Mobile back */}
            <button
              type="button"
              className="md:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setSelected(null)}
            >
              ← Back to reports
            </button>

            <div>
              <h2 className="text-2xl font-bold">{periodLabel(selected)}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Here's how your business did over these two weeks.
              </p>
            </div>

            {/* Plain-English recap */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4 flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">
                  {plainSummary(selected)}
                </p>
              </CardContent>
            </Card>

            {/* What changed */}
            <div>
              <h3 className="text-sm font-semibold mb-2">What changed</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  label="Phrases checked"
                  value={selected.keywordsTracked}
                  help="Search phrases we track for you"
                  icon={<ListChecks className="w-4 h-4 text-primary" />}
                />
                <MetricCard
                  label="Moved up"
                  value={selected.keywordsImproved}
                  help="Ranked better than last report"
                  icon={<TrendingUp className="w-4 h-4 text-green-600" />}
                  valueClass="text-green-600"
                />
                <MetricCard
                  label="Slipped"
                  value={selected.keywordsDeclined}
                  help="Ranked worse than last report"
                  icon={<TrendingDown className="w-4 h-4 text-red-500" />}
                  valueClass="text-red-500"
                />
                <MetricCard
                  label="No change"
                  value={steadyCount(selected)}
                  help="Held the same spot"
                  icon={<Minus className="w-4 h-4 text-muted-foreground" />}
                />
              </div>
            </div>

            {/* Where you stand */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Where you stand</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricCard
                  label="Average position"
                  value={
                    selected.averagePosition == null
                      ? "—"
                      : `#${Math.round(selected.averagePosition)}`
                  }
                  help="Your typical spot in AI answers — #1 is the top, lower numbers are better"
                  icon={<Target className="w-4 h-4 text-primary" />}
                  big
                />
                <MetricCard
                  label="Visibility"
                  value={
                    selected.visibilityScore == null
                      ? "—"
                      : `${Math.round(selected.visibilityScore)}%`
                  }
                  help="How often your business appeared in the checks we ran — higher is better"
                  icon={<Eye className="w-4 h-4 text-primary" />}
                  big
                />
              </div>
            </div>

            {/* How to read this */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" /> How to read this report
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1.5">
                <p>
                  <span className="font-medium text-foreground">Position</span>{" "}
                  is where your business appears when someone asks an AI
                  assistant (ChatGPT, Gemini, Perplexity) a question.{" "}
                  <strong>#1 is the best</strong> — the lower the number, the
                  higher you rank.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Visibility
                  </span>{" "}
                  is the share of our checks where your business showed up at
                  all. Higher is better.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Moved up / Slipped
                  </span>{" "}
                  compares this report to your previous one, so you can see the
                  direction of progress.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  help,
  icon,
  valueClass = "",
  big = false,
}: {
  label: string;
  value: React.ReactNode;
  help: string;
  icon: React.ReactNode;
  valueClass?: string;
  big?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">{label}</p>
          {icon}
        </div>
        <p
          className={`${big ? "text-3xl" : "text-2xl"} font-bold mt-0.5 ${valueClass}`}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">
          {help}
        </p>
      </CardContent>
    </Card>
  );
}
