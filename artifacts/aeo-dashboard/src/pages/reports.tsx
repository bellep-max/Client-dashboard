import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Eye,
  Target,
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

function fmtScore(value: number | null): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}

function fmtAvg(value: number | null): string {
  return value == null ? "—" : value.toFixed(1);
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
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Bi-weekly performance periods
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
                No reports yet. Periods appear here as your keywords are
                audited.
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
                      ↑{r.keywordsImproved} improved
                    </span>
                    <span className="text-xs text-red-500 font-medium">
                      ↓{r.keywordsDeclined} declined
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
              Select a report period to view its summary.
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
                Bi-weekly performance period
              </p>
            </div>

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Visibility",
                  value: fmtScore(selected.visibilityScore),
                  icon: <Eye className="w-4 h-4 text-primary" />,
                  color: "",
                },
                {
                  label: "Avg position",
                  value: fmtAvg(selected.averagePosition),
                  icon: <Target className="w-4 h-4 text-primary" />,
                  color: "",
                },
                {
                  label: "Improved",
                  value: selected.keywordsImproved,
                  icon: <TrendingUp className="w-4 h-4 text-green-600" />,
                  color: "text-green-600",
                },
                {
                  label: "Declined",
                  value: selected.keywordsDeclined,
                  icon: <TrendingDown className="w-4 h-4 text-red-500" />,
                  color: "text-red-500",
                },
              ].map(({ label, value, icon, color }) => (
                <Card key={label}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      {icon}
                    </div>
                    <p className={`text-2xl font-bold mt-0.5 ${color}`}>
                      {value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Period summary</CardTitle>
                <CardDescription>
                  Aggregates across all keywords tracked in this period.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Keywords tracked
                  </span>
                  <span className="font-medium">
                    {selected.keywordsTracked}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Improved</span>
                  <span className="font-medium text-green-600">
                    {selected.keywordsImproved}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Declined</span>
                  <span className="font-medium text-red-500">
                    {selected.keywordsDeclined}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Visibility score
                  </span>
                  <span className="font-medium">
                    {fmtScore(selected.visibilityScore)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Average position
                  </span>
                  <span className="font-medium">
                    {fmtAvg(selected.averagePosition)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
