import React, { useState } from "react";
import { useListReports, useGetReport } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, FileText, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const { data: reports, isLoading } = useListReports();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  return (
    <div className="flex h-[calc(100vh-2px)] overflow-hidden">
      {/* Left List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-border bg-card flex flex-col h-full shrink-0 ${selectedReportId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Bi-weekly AEO insights</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : reports?.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No reports generated yet.
            </div>
          ) : (
            reports?.map(report => (
              <div 
                key={report.id}
                onClick={() => setSelectedReportId(report.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedReportId === report.id ? 'bg-primary/10 border-primary/30' : 'bg-background border-border hover:border-primary/50'}`}
                data-testid={`report-item-${report.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm">
                    {format(new Date(report.periodStart), 'MMM d')} - {format(new Date(report.periodEnd), 'MMM d, yyyy')}
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">{report.visibilityScore ?? '-'}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center text-green-500"><TrendingUp className="w-3 h-3 mr-1"/> {report.keywordsImproved}</span>
                  <span className="flex items-center text-destructive"><TrendingDown className="w-3 h-3 mr-1"/> {report.keywordsDeclined}</span>
                  <span className="flex items-center"><KeyIcon className="w-3 h-3 mr-1"/> {report.keywordsTracked}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Detail View */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden bg-background ${!selectedReportId ? 'hidden md:flex' : 'flex'}`}>
        {selectedReportId ? (
          <ReportDetail id={selectedReportId} onBack={() => setSelectedReportId(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="w-16 h-16 mb-4 opacity-10" />
            <p>Select a report from the list to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportDetail({ id, onBack }: { id: number, onBack: () => void }) {
  const { data: report, isLoading } = useGetReport(id);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!report) return null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border bg-card shrink-0 flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ChevronLeftIcon className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Performance Report</h2>
          <p className="text-muted-foreground text-sm">
            {format(new Date(report.periodStart), 'MMMM d')} to {format(new Date(report.periodEnd), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-background">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Visibility Score</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-primary">{report.visibilityScore ?? '-'}</div></CardContent>
          </Card>
          <Card className="bg-background">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Tracked Queries</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{report.keywordsTracked}</div></CardContent>
          </Card>
          <Card className="bg-background border-green-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Improved</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-500">{report.keywordsImproved}</div></CardContent>
          </Card>
          <Card className="bg-background border-destructive/20">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Declined</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-destructive">{report.keywordsDeclined}</div></CardContent>
          </Card>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center text-lg"><SparklesIcon className="w-5 h-5 mr-2 text-primary" /> AI Summary & Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="leading-relaxed whitespace-pre-wrap">{report.aiSummary || "No AI summary generated for this period."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Keyword Movements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.topKeywords?.map((kw, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell className="font-mono">{kw.position ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {kw.change ? (
                        kw.change > 0 ? (
                          <span className="text-green-500 inline-flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> +{kw.change}</span>
                        ) : (
                          <span className="text-destructive inline-flex items-center"><TrendingDown className="w-3 h-3 mr-1" /> {kw.change}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground inline-flex items-center"><Minus className="w-3 h-3 mr-1" /> 0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!report.topKeywords?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No keyword data recorded for this period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KeyIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>;
}

function ChevronLeftIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="m15 18-6-6 6-6"/></svg>;
}

function SparklesIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>;
}