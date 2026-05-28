import React from "react";
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
import { Loader2, CalendarClock, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { getBiWeeklyReport, type BiWeeklyReport } from "@/lib/portal-api";

const QUERY_KEY = ["portal", "bi-weekly-report"] as const;

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export default function RankingsBiWeeklyPage() {
  const { data, isLoading, isError } = useQuery<BiWeeklyReport>({
    queryKey: QUERY_KEY,
    queryFn: getBiWeeklyReport,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" /> Could not load report
            </CardTitle>
            <CardDescription>
              The bi-weekly report endpoint failed. Try again in a minute.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isEmpty =
    !data ||
    (!data.currentBatch &&
      !data.oldFile &&
      !data.rankingTrend &&
      !data.initialRanking &&
      (!data.allBatches || data.allBatches.length === 0));

  if (isEmpty) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CalendarClock className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>No ranking history yet</CardTitle>
                <CardDescription>
                  Once a bi-weekly audit runs for your keywords, the snapshot
                  will appear here.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const current = data.currentBatch;
  const oldFile = data.oldFile;
  const trend = data.rankingTrend;
  const initial = data.initialRanking;
  const batches = data.allBatches ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bi-weekly rankings</h1>
        <p className="text-muted-foreground mt-1">
          Audit snapshot comparing the current batch against prior runs.
        </p>
      </div>

      {current && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" /> Current batch ·{" "}
              {formatDate(current.batchDate)}
            </CardTitle>
            <CardDescription>
              Next due {formatDate(current.nextDueDate)} · {current.auditType}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryStat label="Unique combos" value={current.uniqueCombos} />
              <SummaryStat
                label="New combos"
                value={current.newCombos}
                tone={current.newCombos > 0 ? "primary" : undefined}
              />
              <SummaryStat
                label="Total sessions"
                value={current.totalSessions}
              />
              <SummaryStat
                label="Unique businesses"
                value={current.uniqueBusinesses}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {trend && (
        <Card>
          <CardHeader>
            <CardTitle>Ranking trend</CardTitle>
            <CardDescription>
              Movement across {trend.eligibleCombos.toLocaleString()} eligible
              (keyword, platform) combos with two or more prior runs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Movement</TableHead>
                  <TableHead className="text-right">Combos</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TrendRow
                  label="Improved"
                  count={trend.improved}
                  total={trend.eligibleCombos}
                  tone="up"
                />
                <TrendRow
                  label="Declined"
                  count={trend.declined}
                  total={trend.eligibleCombos}
                  tone="down"
                />
                <TrendRow
                  label="No change"
                  count={trend.noChange}
                  total={trend.eligibleCombos}
                  tone="flat"
                />
                <TrendRow
                  label="Not ranked"
                  count={trend.notRanked}
                  total={trend.eligibleCombos}
                  tone="muted"
                />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {initial && (
        <Card>
          <CardHeader>
            <CardTitle>Initial ranking distribution</CardTitle>
            <CardDescription>
              Where {initial.totalNewCombos.toLocaleString()} brand-new combos
              landed on first audit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bucket</TableHead>
                  <TableHead className="text-right">Combos</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <BucketRow
                  label="Top 3"
                  bucket={initial.buckets.top3}
                  tone="up"
                />
                <BucketRow label="4-10" bucket={initial.buckets.top4to10} />
                <BucketRow label="11-30" bucket={initial.buckets.top11to30} />
                <BucketRow
                  label="31+"
                  bucket={initial.buckets.beyond30}
                  tone="muted"
                />
                <BucketRow
                  label="Not ranked"
                  bucket={initial.buckets.notRanked}
                  tone="down"
                />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {oldFile && (
        <Card>
          <CardHeader>
            <CardTitle>Older audits</CardTitle>
            <CardDescription>
              Snapshot of combos last seen before the current batch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryStat
                label="Total prior combos"
                value={oldFile.totalOldCombos}
              />
              <SummaryStat
                label="On schedule"
                value={oldFile.onSchedule}
                tone="primary"
              />
              <SummaryStat
                label="Still behind"
                value={oldFile.stillBehindTotal}
                tone={oldFile.stillBehindTotal > 0 ? "warn" : undefined}
              />
              <SummaryStat
                label="With errors"
                value={oldFile.withErrors}
                tone={oldFile.withErrors > 0 ? "danger" : undefined}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Earliest run {formatDate(oldFile.earliestDate)} · latest prior run{" "}
              {formatDate(oldFile.latestOldDate)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All batches</CardTitle>
          <CardDescription>
            History of every bi-weekly audit run for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch date</TableHead>
                <TableHead className="text-right">Combos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground py-6"
                  >
                    No batches recorded.
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((b) => (
                  <TableRow key={b.date}>
                    <TableCell className="font-medium">
                      {formatDate(b.date)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {b.combos.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "primary" | "warn" | "danger";
}) {
  const valueClass =
    tone === "primary"
      ? "text-primary"
      : tone === "warn"
        ? "text-amber-500"
        : tone === "danger"
          ? "text-destructive"
          : "";
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function TrendRow({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: "up" | "down" | "flat" | "muted";
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const icon =
    tone === "up" ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : tone === "down" ? (
      <TrendingDown className="w-4 h-4 text-destructive" />
    ) : tone === "flat" ? (
      <Minus className="w-4 h-4 text-muted-foreground" />
    ) : (
      <Minus className="w-4 h-4 text-muted-foreground/60" />
    );
  return (
    <TableRow>
      <TableCell className="font-medium">
        <span className="inline-flex items-center gap-2">
          {icon} {label}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono">
        {count.toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {pct.toFixed(1)}%
      </TableCell>
    </TableRow>
  );
}

function BucketRow({
  label,
  bucket,
  tone,
}: {
  label: string;
  bucket: { count: number; pct: number };
  tone?: "up" | "down" | "muted";
}) {
  const toneClass =
    tone === "up"
      ? "text-green-500"
      : tone === "down"
        ? "text-destructive"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";
  return (
    <TableRow>
      <TableCell className={`font-medium ${toneClass}`}>
        <Badge
          variant="outline"
          className={tone === "up" ? "border-green-500/40 text-green-500" : ""}
        >
          {label}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono">
        {bucket.count.toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {bucket.pct.toFixed(1)}%
      </TableCell>
    </TableRow>
  );
}
