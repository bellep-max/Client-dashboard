import React from "react";
import { useGetDashboardSummary, useGenerateReport, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Key, TrendingUp, ShieldCheck, AlertCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DashboardPage() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const queryClient = useQueryClient();
  const generateReport = useGenerateReport();

  const handleGenerateReport = () => {
    generateReport.mutate(undefined, {
      onSuccess: () => {
        toast.success("Report generated successfully");
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: () => {
        toast.error("Failed to generate report");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
                <Skeleton className="h-3 w-[120px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] lg:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button onClick={handleGenerateReport} disabled={generateReport.isPending} data-testid="button-generate-report">
          {generateReport.isPending ? "Generating..." : "Generate Report"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visibility Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.visibilityScore ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on keyword positions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Keywords</CardTitle>
            <Key className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeKeywords}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {summary.totalKeywords} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageEfficiencyScore?.toFixed(1) ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Score out of 10
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GBP Status</CardTitle>
            {summary.gbpVerified ? (
              <ShieldCheck className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.gbpVerified ? "Verified" : "Action Needed"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.totalWebsites} connected websites
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Keywords</CardTitle>
            <CardDescription>Your best performing keywords in AI search</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Efficiency</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.topKeywords?.map((kw) => (
                  <TableRow key={kw.id}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell>{kw.currentPosition ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={kw.efficiencyScore && kw.efficiencyScore >= 7 ? "default" : kw.efficiencyScore && kw.efficiencyScore < 5 ? "destructive" : "secondary"}>
                        {kw.efficiencyScore ?? "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {kw.currentPosition && kw.previousPosition ? (
                        kw.currentPosition < kw.previousPosition ? (
                          <span className="text-green-500 flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> Up</span>
                        ) : kw.currentPosition > kw.previousPosition ? (
                          <span className="text-destructive flex items-center"><TrendingUp className="w-3 h-3 mr-1 rotate-180" /> Down</span>
                        ) : (
                          <span className="text-muted-foreground">Stable</span>
                        )
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {!summary.topKeywords?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No keywords tracked yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Report</CardTitle>
            <CardDescription>
              {summary.lastReportDate ? format(new Date(summary.lastReportDate), 'MMM d, yyyy') : "No reports yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.lastReportDate ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <TrendingUp className="text-primary w-5 h-5" />
                  <span className="font-medium text-sm">
                    Trend: <span className="capitalize">{summary.recentKeywordTrend}</span>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  Check the reports page for detailed AI-generated insights on your visibility performance and recommendations.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                <p className="text-sm text-muted-foreground">Generate your first report to see insights.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
