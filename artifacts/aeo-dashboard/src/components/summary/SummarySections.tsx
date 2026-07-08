/**
 * Presentational building blocks for the Summary Report body. Each renders one
 * section of the report (metrics, narrative, platforms, movers, etc). All are
 * pure — the parent owns fetching. Numbers are shown exactly as the payload
 * gives them; nothing is invented. Position closer to #1 is better.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ListChecks,
  Trophy,
  Eye,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Lightbulb,
} from "lucide-react";
import { format } from "date-fns";
import { RankBadge } from "@/components/insights";
import type {
  Glossary,
  HowAeoWorksStep,
  SummaryDecline,
  SummaryLocked,
  SummaryMetrics,
  SummaryMover,
  SummaryPlatform,
  SummaryWatch,
} from "@/lib/portal-api";

function fmtPos(value: number | null): string {
  return value == null ? "—" : `#${Math.round(value)}`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : format(d, "MMM d, yyyy");
}

// -- Narrative -------------------------------------------------------------

/** One AI narrative paragraph. Hidden entirely when the section text is "". */
export function NarrativeBlock({
  text,
  loading,
}: {
  text: string | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground no-print">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing…
      </p>
    );
  }
  if (!text) return null;
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
  );
}

/** The lead "overall + trend" narrative, in its own highlighted card. */
export function OverallNarrative({
  overall,
  trend,
  loading,
}: {
  overall: string | undefined;
  trend: string | undefined;
  loading: boolean;
}) {
  const hasContent = loading || overall || trend;
  if (!hasContent) return null;
  return (
    <Card className="bg-primary/5 border-primary/20 print-avoid-break">
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Your summary</span>
          {loading && (
            <span className="no-print flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> writing…
            </span>
          )}
        </div>
        {!loading && overall && (
          <p className="text-sm leading-relaxed">{overall}</p>
        )}
        {!loading && trend && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// -- Metrics ---------------------------------------------------------------

function MetricCard({
  label,
  value,
  help,
  icon,
  valueClass = "",
}: {
  label: string;
  value: React.ReactNode;
  help: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">{label}</p>
          {icon}
        </div>
        <p className={`text-2xl font-bold mt-0.5 ${valueClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">
          {help}
        </p>
      </CardContent>
    </Card>
  );
}

export function MetricsCards({ metrics }: { metrics: SummaryMetrics }) {
  return (
    <div className="print-avoid-break space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Tracked"
          value={metrics.tracked}
          help="Search phrases we monitor"
          icon={<ListChecks className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          label="In top 3"
          value={metrics.top3}
          help="Phrases ranking in the top 3"
          icon={<Trophy className="w-4 h-4 text-amber-500" />}
          valueClass="text-amber-600 dark:text-amber-400"
        />
        <MetricCard
          label="Improved"
          value={metrics.improved}
          help="Moved up vs prior run"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <MetricCard
          label="Slipped"
          value={metrics.declined}
          help="Moved down vs prior run"
          icon={<TrendingDown className="w-4 h-4 text-amber-600" />}
          valueClass="text-amber-600 dark:text-amber-400"
        />
        <MetricCard
          label="Steady"
          value={metrics.steady}
          help="Held the same spot"
          icon={<Minus className="w-4 h-4 text-muted-foreground" />}
        />
        <MetricCard
          label="Avg position"
          value={
            <span>
              {fmtPos(metrics.avgCurrent)}
              {metrics.avgFirst != null && (
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  was {fmtPos(metrics.avgFirst)}
                </span>
              )}
            </span>
          }
          help="Typical spot now vs first tracked — #1 is best"
          icon={<Target className="w-4 h-4 text-primary" />}
        />
      </div>
    </div>
  );
}

// -- Platforms -------------------------------------------------------------

export function PlatformAggregates({
  platforms,
  narrative,
  narrativeLoading,
}: {
  platforms: SummaryPlatform[];
  narrative: string | undefined;
  narrativeLoading: boolean;
}) {
  const visible = platforms.filter((p) => p.tracked > 0);
  if (visible.length === 0 && !narrative && !narrativeLoading) return null;
  return (
    <Card className="print-avoid-break">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" /> Visibility by AI platform
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <NarrativeBlock text={narrative} loading={narrativeLoading} />
        {visible.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {visible.map((p) => (
              <div
                key={p.platform}
                className="rounded-lg border border-border p-3"
              >
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">
                  {fmtPos(p.avgCurrent)}
                </p>
                <p className="text-xs text-muted-foreground">avg rank</p>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-emerald-500 font-medium">{p.top3}</span>{" "}
                  of {p.tracked} in top 3
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -- Movers ----------------------------------------------------------------

export function MoversList({
  movers,
  narrative,
  narrativeLoading,
}: {
  movers: SummaryMover[];
  narrative: string | undefined;
  narrativeLoading: boolean;
}) {
  if (movers.length === 0 && !narrative && !narrativeLoading) return null;
  return (
    <Card className="print-avoid-break">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" /> Biggest movers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <NarrativeBlock text={narrative} loading={narrativeLoading} />
        {movers.length > 0 && (
          <ul className="divide-y divide-border">
            {movers.map((m) => {
              const up =
                m.first != null && m.current != null && m.current < m.first;
              return (
                <li
                  key={m.keyword}
                  className="flex items-center justify-between py-2 gap-3"
                >
                  <span className="text-sm font-medium truncate">
                    {m.keyword}
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-sm">
                    <span className="text-muted-foreground">
                      {fmtPos(m.first)}
                    </span>
                    {up ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <RankBadge position={m.current} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// -- Locked ----------------------------------------------------------------

export function LockedList({
  locked,
  narrative,
  narrativeLoading,
}: {
  locked: SummaryLocked[];
  narrative: string | undefined;
  narrativeLoading: boolean;
}) {
  if (locked.length === 0 && !narrative && !narrativeLoading) return null;
  return (
    <Card className="print-avoid-break">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Locked wins
          {locked.length > 0 && (
            <Badge variant="secondary">{locked.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <NarrativeBlock text={narrative} loading={narrativeLoading} />
        {locked.length > 0 && (
          <ul className="space-y-3">
            {locked.map((kw) => (
              <li
                key={kw.keyword}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{kw.keyword}</span>
                  {(kw.campaignName || kw.businessName) && (
                    <span className="text-xs text-muted-foreground truncate">
                      {kw.campaignName ?? kw.businessName}
                    </span>
                  )}
                </div>
                {kw.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {kw.platforms.map((p) => (
                      <span
                        key={p.platform}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px]"
                        title={p.reason}
                      >
                        <span className="text-muted-foreground">{p.label}</span>
                        <RankBadge position={p.position} />
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// -- Watch -----------------------------------------------------------------

export function WatchList({ watch }: { watch: SummaryWatch[] }) {
  if (watch.length === 0) return null;
  return (
    <Card className="print-avoid-break">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" /> Watching
          <Badge variant="secondary">{watch.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {watch.map((w) => (
            <li
              key={w.keyword}
              className="flex items-center justify-between py-2 gap-3"
            >
              <span className="text-sm font-medium truncate">{w.keyword}</span>
              <span className="flex items-center gap-3 shrink-0 text-sm">
                <RankBadge position={w.latestPosition} />
                <span className="text-xs text-muted-foreground">
                  stalled since {fmtDate(w.stallingSince)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// -- Declines --------------------------------------------------------------

export function DeclinesList({
  declines,
  narrative,
  narrativeLoading,
}: {
  declines: SummaryDecline[];
  narrative: string | undefined;
  narrativeLoading: boolean;
}) {
  if (declines.length === 0 && !narrative && !narrativeLoading) return null;
  return (
    <Card className="print-avoid-break">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Needs attention
          {declines.length > 0 && (
            <Badge variant="secondary">{declines.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <NarrativeBlock text={narrative} loading={narrativeLoading} />
        {declines.length > 0 && (
          <ul className="divide-y divide-border">
            {declines.map((d) => (
              <li key={d.keyword} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium truncate">
                    {d.keyword}
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-sm">
                    <span className="text-muted-foreground">
                      {fmtPos(d.from)}
                    </span>
                    <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                    <RankBadge position={d.to} />
                  </span>
                </div>
                {d.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.reason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// -- How AEO works ---------------------------------------------------------

export function HowAeoWorks({ steps }: { steps: HowAeoWorksStep[] }) {
  if (steps.length === 0) return null;
  return (
    <Card className="bg-muted/30 print-avoid-break">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" /> How AEO works
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

// -- Glossary --------------------------------------------------------------

export function GlossarySection({ glossary }: { glossary: Glossary | null }) {
  const [open, setOpen] = useState(false);
  const terms = glossary ? Object.entries(glossary.terms) : [];
  if (terms.length === 0) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="print-avoid-break">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Glossary
            </CardTitle>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <dl className="space-y-3">
              {terms.map(([key, t]) => (
                <div key={key}>
                  <dt className="text-sm font-medium">{t.term}</dt>
                  <dd className="text-sm text-muted-foreground leading-relaxed">
                    {t.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
