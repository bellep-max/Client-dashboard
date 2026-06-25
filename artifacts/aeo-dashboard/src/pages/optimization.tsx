import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Loader2,
  Trophy,
  AlertTriangle,
  Target,
  Archive,
} from "lucide-react";
import { format } from "date-fns";
import {
  getRotationStatus,
  type RotationStatus,
  type RotationKeyword,
} from "@/lib/portal-api";
import {
  Sparkline,
  TrendBadge,
  RankBadge,
  StabilityBar,
  AtRiskBadge,
  PlatformChips,
  platformLabel,
} from "@/components/insights";

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-500"
      : tone === "warning"
        ? "text-amber-600"
        : "text-primary";
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`shrink-0 ${toneClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function timelineDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : format(d, "MMM d, yyyy");
}

export default function OptimizationPage() {
  const { data, isLoading, isError } = useQuery<RotationStatus>({
    queryKey: ["portal", "insights", "rotation-status"],
    queryFn: () => getRotationStatus(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-destructive">Could not load optimization status.</p>
      </div>
    );
  }

  const { summary, platformAggregate, keywords, timeline } = data;

  const active = keywords.filter(
    (k) => k.isActive && k.status !== "locked" && !k.archivedAt,
  );
  const atRisk = keywords.filter((k) => k.atRisk);

  const byClosest = (a: RotationKeyword, b: RotationKeyword) => {
    const ap = a.latestPosition ?? Number.POSITIVE_INFINITY;
    const bp = b.latestPosition ?? Number.POSITIVE_INFINITY;
    return ap - bp;
  };

  // Featured: the active keyword nearest to breaking into the top 3.
  const focus = active
    .filter(
      (k) => k.latestPosition != null && k.latestPosition > 3 && !k.atRisk,
    )
    .sort((a, b) => {
      if (a.trend === "improving" && b.trend !== "improving") return -1;
      if (b.trend === "improving" && a.trend !== "improving") return 1;
      return byClosest(a, b);
    })[0];

  const activeSorted = [...active].sort(byClosest);
  const platformEntries = Object.entries(platformAggregate).filter(
    ([, v]) => v.tracked > 0,
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Optimization
          </h1>
          <p className="text-muted-foreground text-sm">
            What we're actively working on to lift your rankings.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Keywords tracked"
          value={summary.total}
          icon={Target}
        />
        <StatCard
          label="Actively optimizing"
          value={summary.active}
          icon={Activity}
        />
        <StatCard
          label="Won (top 3)"
          value={summary.locked}
          icon={Trophy}
          tone="success"
        />
        <StatCard
          label="Needs attention"
          value={summary.atRisk}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      {/* Featured focus */}
      {focus && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Target className="w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Closest to winning
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/keywords/${focus.id}`}
                className="font-medium hover:underline"
              >
                {focus.keywordText}
              </Link>
              <p className="text-xs text-muted-foreground">
                Currently <RankBadge position={focus.latestPosition} /> —{" "}
                <TrendBadge trend={focus.trend} />
              </p>
            </div>
            <Sparkline data={focus.sparkline} className="h-8 w-28" />
          </CardContent>
        </Card>
      )}

      {/* Platform breakdown */}
      {platformEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Visibility by AI platform
            </CardTitle>
            <CardDescription>
              Average rank and top-3 coverage across the engines we track.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {platformEntries.map(([key, v]) => (
                <div key={key} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{platformLabel(key)}</p>
                  <p className="text-2xl font-bold tabular-nums mt-1">
                    {v.avgPosition != null ? `#${v.avgPosition}` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">avg rank</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="text-emerald-500 font-medium">
                      {v.top3}
                    </span>{" "}
                    of {v.tracked} in top 3
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* At risk */}
      {atRisk.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Needs
              attention
              <Badge variant="secondary">{atRisk.length}</Badge>
            </CardTitle>
            <CardDescription>
              These keywords have stalled outside the top 3 for several runs.
              We're prioritizing fresh angles for them.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Stalled since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRisk.map((k) => (
                  <TableRow key={k.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link
                        href={`/keywords/${k.id}`}
                        className="hover:underline"
                      >
                        {k.keywordText}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <RankBadge position={k.latestPosition} />
                    </TableCell>
                    <TableCell>
                      <TrendBadge trend={k.trend} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {k.stallingSince ? timelineDate(k.stallingSince) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Active optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4" /> Actively optimizing
            <Badge variant="secondary">{activeSorted.length}</Badge>
          </CardTitle>
          <CardDescription>
            Keywords we're working to push into the top 3, sorted by how close
            they are.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>History</TableHead>
                <TableHead>Stability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeSorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No keywords are in active rotation right now.
                  </TableCell>
                </TableRow>
              ) : (
                activeSorted.map((k) => (
                  <TableRow key={k.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link
                        href={`/keywords/${k.id}`}
                        className="hover:underline"
                      >
                        {k.keywordText}
                      </Link>
                      {k.atRisk && (
                        <span className="ml-2 align-middle">
                          <AtRiskBadge />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PlatformChips platforms={k.platforms} />
                    </TableCell>
                    <TableCell>
                      <TrendBadge trend={k.trend} />
                    </TableCell>
                    <TableCell>
                      <Sparkline data={k.sparkline} />
                    </TableCell>
                    <TableCell>
                      <StabilityBar percent={k.stabilityPercent} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent milestones</CardTitle>
          <CardDescription>
            Wins and rotations as they happen on your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No milestones recorded yet.
            </p>
          ) : (
            <ol className="relative border-l border-border ml-2 space-y-4">
              {timeline.map((ev, i) => (
                <li key={`${ev.keywordId}-${ev.type}-${i}`} className="ml-4">
                  <span
                    className={`absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full ${
                      ev.type === "locked"
                        ? "bg-amber-500"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    {ev.type === "locked" ? (
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <Link
                      href={`/keywords/${ev.keywordId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {ev.keywordText}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {timelineDate(ev.date)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ev.type === "locked"
                      ? `Locked at ${ev.platform ? platformLabel(ev.platform) : "top"} #${ev.position ?? "—"}`
                      : ev.replacement
                        ? `Rotated out — testing "${ev.replacement}" instead`
                        : "Rotated out of active testing"}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
