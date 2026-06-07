import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  listPortalReports,
  generatePortalReport,
  type PortalReport,
} from "@/lib/portal-api";

const REPORTS_KEY = ["portal", "reports"] as const;

function TrendChip({ initial, current }: { initial: number | null; current: number | null }) {
  if (initial == null || current == null)
    return <span className="text-xs text-muted-foreground">—</span>;
  if (current < initial)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
        <TrendingUp className="w-3 h-3" /> ↑{initial - current}
      </span>
    );
  if (current > initial)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
        <TrendingDown className="w-3 h-3" /> ↓{current - initial}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="w-3 h-3" /> Stable
    </span>
  );
}

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PortalReport | null>(null);

  const { data: reports, isLoading } = useQuery<PortalReport[]>({
    queryKey: REPORTS_KEY,
    queryFn: listPortalReports,
  });

  const generateMutation = useMutation({
    mutationFn: () => generatePortalReport(),
    onSuccess: (report) => {
      toast.success("Report generated");
      queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      setSelected(report);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to generate report"),
  });

  return (
    <div className="flex h-[calc(100vh-2px)] overflow-hidden">
      {/* Left — report list */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-border bg-card flex flex-col h-full shrink-0 ${
          selected ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">On-demand ranking snapshots</p>
          </div>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><Plus className="w-4 h-4 mr-1" /> Generate</>
            )}
          </Button>
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
              <p className="text-sm text-muted-foreground mb-4">No reports yet.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                Generate your first report
              </Button>
            </div>
          ) : (
            reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left p-4 hover:bg-muted/40 transition-colors flex items-center gap-3 ${
                  selected?.id === r.id ? "bg-primary/5 border-l-2 border-primary" : ""
                }`}
              >
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.generatedAt), "MMM d, yyyy · h:mm a")}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-green-600 font-medium">↑{r.summary.improved} improved</span>
                    <span className="text-xs text-red-500 font-medium">↓{r.summary.declined} declined</span>
                    {r.summary.locked > 0 && (
                      <span className="text-xs text-amber-600 font-medium">🔒 {r.summary.locked} locked</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right — report detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <FileText className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground text-sm">Select a report or generate a new one.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Mobile back */}
            <button
              className="md:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setSelected(null)}
            >
              ← Back to reports
            </button>

            <div>
              <h2 className="text-2xl font-bold">{selected.title}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Generated {format(new Date(selected.generatedAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Keywords", value: selected.summary.totalKeywords, color: "" },
                { label: "Improved", value: selected.summary.improved, color: "text-green-600" },
                { label: "Declined", value: selected.summary.declined, color: "text-red-500" },
                { label: "Top 10", value: selected.summary.top10, color: "text-primary" },
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Locked keywords highlight */}
            {selected.summary.locked > 0 && (
              <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Lock className="w-4 h-4" /> {selected.summary.locked} Keyword{selected.summary.locked > 1 ? "s" : ""} Reached Top 3
                  </CardTitle>
                  <CardDescription>
                    These keywords have been locked — they hold a top 3 ranking and are being monitored.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selected.summary.keywords
                      .filter((k) => k.isLocked)
                      .map((k) => (
                        <Badge key={k.id} className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-300">
                          🔒 {k.keyword} — #{k.currentRanking}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Full keyword table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Keywords</CardTitle>
                <CardDescription>Ranking snapshot at time of report generation</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="text-center">Initial</TableHead>
                      <TableHead className="text-center">Current</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.summary.keywords.map((kw) => (
                      <TableRow key={kw.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {kw.isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                            <span className="truncate max-w-[180px]">{kw.keyword}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {kw.campaignName ?? "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {kw.initialRanking != null ? `#${kw.initialRanking}` : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm font-semibold">
                          {kw.currentRanking != null ? `#${kw.currentRanking}` : "—"}
                        </TableCell>
                        <TableCell>
                          <TrendChip initial={kw.initialRanking} current={kw.currentRanking} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
