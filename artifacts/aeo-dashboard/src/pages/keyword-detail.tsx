import React, { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Link2, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import {
  getKeywordAdminShape,
  listRankingReports,
  type PortalKeyword,
  type RankingReport,
} from "@/lib/portal-api";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export default function KeywordDetailPage() {
  const [, params] = useRoute<{ id: string }>("/keywords/:id");
  const idNum = Number.parseInt(params?.id ?? "", 10);
  const isValidId = !Number.isNaN(idNum);

  const {
    data: keyword,
    isLoading: kwLoading,
    isError: kwError,
  } = useQuery<PortalKeyword>({
    queryKey: ["portal", "keyword", idNum],
    queryFn: () => getKeywordAdminShape(idNum),
    enabled: isValidId,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery<RankingReport[]>({
    queryKey: ["portal", "keyword", idNum, "ranking-reports"],
    queryFn: () => listRankingReports({ keywordId: idNum }),
    enabled: isValidId,
  });

  const sortedReports = useMemo(() => {
    if (!reports) return [] as RankingReport[];
    return [...reports].sort((a, b) => {
      const ad = a.date ?? a.createdAt;
      const bd = b.date ?? b.createdAt;
      return new Date(bd).getTime() - new Date(ad).getTime();
    });
  }, [reports]);

  const chartData = useMemo(() => {
    if (!reports) return [] as Array<{ date: string; position: number }>;
    return [...reports]
      .filter((r) => r.rankingPosition != null && (r.date || r.createdAt))
      .sort((a, b) => {
        const ad = a.date ?? a.createdAt;
        const bd = b.date ?? b.createdAt;
        return new Date(ad).getTime() - new Date(bd).getTime();
      })
      .map((r) => ({
        date: format(new Date(r.date ?? r.createdAt), "MMM d"),
        position: r.rankingPosition as number,
        platform: r.platform ?? "",
      }));
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
        <Link href="/keywords">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to keywords
          </Button>
        </Link>
        <p className="text-destructive">Could not load this keyword.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/keywords">
          <Button variant="ghost" size="icon" aria-label="Back to keywords">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
            {keyword.keywordText}
          </h1>
          <p className="text-muted-foreground text-sm">
            {keyword.campaignName ? (
              <>
                Campaign:{" "}
                {keyword.aeoPlanId ? (
                  <Link href={`/campaigns/${keyword.aeoPlanId}`}>
                    <span className="text-primary hover:underline">
                      {keyword.campaignName}
                    </span>
                  </Link>
                ) : (
                  keyword.campaignName
                )}{" "}
                ·{" "}
              </>
            ) : null}
            Status:{" "}
            <Badge variant="outline" className="capitalize ml-1">
              {keyword.status ?? "-"}
            </Badge>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
              Keyword type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold capitalize">
              {keyword.keywordType ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
              Last run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {formatDate(keyword.lastRunAt)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
              Total runs recorded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {reports?.length ?? 0}
            </div>
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
            <Link2 className="w-5 h-5" /> Links
          </CardTitle>
          <CardDescription>
            Backlinks and citations associated with this keyword.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keyword.links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links recorded.</p>
          ) : (
            <ul className="space-y-2">
              {keyword.links.map((l) => (
                <li
                  key={l.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-md border bg-card"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline break-all"
                    >
                      {l.url}
                    </a>
                    {l.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {l.description}
                      </p>
                    )}
                  </div>
                  {l.linkType && (
                    <Badge variant="outline" className="capitalize shrink-0">
                      {l.linkType}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Ranking history
          </CardTitle>
          <CardDescription>
            Every recorded audit for this keyword. Lower position = better.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {chartData.length >= 2 && (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                  <Line
                    type="monotone"
                    dataKey="position"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {reportsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : sortedReports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No ranking history yet. Once a bi-weekly audit completes this
              table will populate.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                  <TableHead>Maps</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedReports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {formatDate(r.date ?? r.createdAt)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {r.platform ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.rankingPosition ?? "-"}
                    </TableCell>
                    <TableCell>
                      {r.mapsPresence == null ? (
                        <span className="text-muted-foreground text-xs">-</span>
                      ) : r.mapsPresence ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-600 hover:bg-green-500/20">
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === "success" ? "default" : "outline"}
                        className="capitalize"
                      >
                        {r.status ?? "-"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
