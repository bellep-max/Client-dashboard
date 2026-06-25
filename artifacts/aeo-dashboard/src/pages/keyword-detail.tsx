import React, { useMemo } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import {
  getKeywordAdminShape,
  listRankingReports,
  type PortalKeyword,
  type RankingReport,
} from "@/lib/portal-api";

interface ChartPoint {
  key: string;
  date: string;
  chatgpt?: number;
  gemini?: number;
  perplexity?: number;
}

/* One line per AI platform, consistent colors + order across the app. */
const PLATFORM_LINES: {
  key: "chatgpt" | "gemini" | "perplexity";
  label: string;
  color: string;
}[] = [
  { key: "chatgpt", label: "ChatGPT", color: "#10b981" },
  { key: "gemini", label: "Gemini", color: "#3b82f6" },
  { key: "perplexity", label: "Perplexity", color: "#a855f7" },
];

export default function KeywordDetailPage() {
  const [, params] = useRoute<{ id: string }>("/keywords/:id");
  const idNum = Number.parseInt(params?.id ?? "", 10);
  const isValidId = !Number.isNaN(idNum);
  const [, setLocation] = useLocation();

  // Return to wherever the keyword was opened from (the campaign keywords list
  // in most cases). The old standalone "/keywords" tracking page is gone, so
  // fall back to the dashboard when there's no history to pop.
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else setLocation("/dashboard");
  };

  const {
    data: keyword,
    isLoading: kwLoading,
    isError: kwError,
  } = useQuery<PortalKeyword>({
    queryKey: ["portal", "keyword", idNum],
    queryFn: () => getKeywordAdminShape(idNum),
    enabled: isValidId,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery<
    RankingReport[]
  >({
    queryKey: ["portal", "keyword", idNum, "ranking-reports"],
    queryFn: () => listRankingReports({ keywordId: idNum }),
    enabled: isValidId,
  });

  /* One point per audit date, with a separate series per platform so the chart
     draws three lines (ChatGPT / Gemini / Perplexity) instead of one zig-zag. */
  const chartData = useMemo(() => {
    if (!reports) return [] as ChartPoint[];
    const byDate = new Map<string, ChartPoint>();
    for (const r of reports) {
      if (r.rankingPosition == null) continue;
      const raw = r.date ?? r.createdAt;
      if (!raw) continue;
      const key = raw.slice(0, 10);
      let pt = byDate.get(key);
      if (!pt) {
        pt = { key, date: format(new Date(raw), "MMM d") };
        byDate.set(key, pt);
      }
      const plat = (r.platform ?? "").toLowerCase();
      if (plat === "chatgpt" || plat === "gemini" || plat === "perplexity") {
        pt[plat] = r.rankingPosition;
      }
    }
    return [...byDate.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [reports]);

  /* Client-friendly headline numbers derived from the ranking reports: where the
     keyword ranks now (best position on the most recent audit day) and the best
     it has ever reached. */
  const stats = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of reports ?? []) {
      if (r.rankingPosition == null || r.rankingPosition < 1) continue;
      const day = (r.date ?? r.createdAt ?? "").slice(0, 10);
      if (!day) continue;
      const cur = byDay.get(day);
      if (cur == null || r.rankingPosition < cur)
        byDay.set(day, r.rankingPosition);
    }
    const days = [...byDay.keys()].sort();
    if (days.length === 0) return { currentPosition: null, bestPosition: null };
    return {
      currentPosition: byDay.get(days[days.length - 1]) ?? null,
      bestPosition: Math.min(...byDay.values()),
    };
  }, [reports]);

  if (!isValidId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-destructive">Invalid keyword id.</p>
      </div>
    );
  }

  if (kwLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (kwError || !keyword) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <p className="text-destructive">Could not load this keyword.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
            {keyword.keywordText}
          </h1>
          <div className="text-muted-foreground text-sm flex flex-wrap items-center gap-x-1">
            {keyword.campaignName ? (
              <>
                <span>Campaign:</span>
                {keyword.aeoPlanId ? (
                  <Link href={`/campaigns/${keyword.aeoPlanId}`}>
                    <span className="text-primary hover:underline">
                      {keyword.campaignName}
                    </span>
                  </Link>
                ) : (
                  <span>{keyword.campaignName}</span>
                )}
                <span>·</span>
              </>
            ) : null}
            <span>Status:</span>
            <Badge variant="outline" className="capitalize">
              {keyword.status ?? "-"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
              Current position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {stats.currentPosition != null ? (
                `#${stats.currentPosition}`
              ) : (
                <span className="text-base font-normal text-muted-foreground">
                  Not ranked yet
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Where you rank now in AI answers (#1 is best)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
              Best position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {stats.bestPosition != null ? (
                `#${stats.bestPosition}`
              ) : (
                <span className="text-base font-normal text-muted-foreground">
                  —
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              The highest spot you've reached so far
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
              Times checked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{reports?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              How many times we've measured this keyword
            </p>
          </CardContent>
        </Card>
      </div>

      {keyword.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {keyword.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Ranking history
          </CardTitle>
          <CardDescription>
            Ranking trend for this keyword. Lower position = better.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reportsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : chartData.length >= 2 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    reversed
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    domain={[1, "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.375rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                  {PLATFORM_LINES.map((p) => (
                    <Line
                      key={p.key}
                      type="monotone"
                      dataKey={p.key}
                      name={p.label}
                      stroke={p.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Not enough ranking history yet to chart. The trend will appear
              here once more audits complete.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
