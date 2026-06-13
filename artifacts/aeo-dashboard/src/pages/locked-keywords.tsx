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
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, PartyPopper, Download } from "lucide-react";
import { format } from "date-fns";
import { listLockedKeywords, type LockedKeyword } from "@/lib/portal-api";
import { RankBadge, StabilityBar, platformLabel } from "@/components/insights";
import { toCsv, downloadCsv, isoDateStamp } from "@/lib/csv-export";

function wonDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : format(d, "MMM d, yyyy");
}

export default function LockedKeywordsPage() {
  const { data, isLoading, isError } = useQuery<LockedKeyword[]>({
    queryKey: ["portal", "insights", "locked-keywords"],
    queryFn: () => listLockedKeywords(),
    staleTime: 60_000,
  });

  const locked = data ?? [];

  const handleExport = () => {
    const csv = toCsv(
      locked.map((kw) => ({
        keyword: kw.keywordText,
        campaign: kw.campaignName ?? "",
        business: kw.businessName ?? "",
        wonPlatform: kw.wonPlatform ? platformLabel(kw.wonPlatform) : "",
        bestRank: kw.wonPosition ?? "",
        wonDate: wonDate(kw.wonAt),
        stabilityPercent: kw.stabilityPercent,
      })),
      [
        { key: "keyword", header: "Keyword" },
        { key: "campaign", header: "Campaign" },
        { key: "business", header: "Business" },
        { key: "wonPlatform", header: "Won On" },
        { key: "bestRank", header: "Best Rank" },
        { key: "wonDate", header: "Won Date" },
        { key: "stabilityPercent", header: "Stability %" },
      ],
    );
    downloadCsv(`won-keywords-${isoDateStamp()}.csv`, csv);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Won Keywords
          </h1>
          <p className="text-muted-foreground text-sm">
            Keywords that reached the top 3 and are now locked in.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={locked.length === 0}
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {locked.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <PartyPopper className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{locked.length}</span> keyword
            {locked.length === 1 ? " has" : "s have"} reached the top 3 — we keep
            monitoring them so they hold their spot.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" /> Locked keywords
            <Badge variant="secondary" className="ml-1">
              {locked.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            A keyword locks once it sustains a top-3 ranking. We then shift effort
            to the next keyword while watching this one.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Won on</TableHead>
                <TableHead>Best rank</TableHead>
                <TableHead>Won date</TableHead>
                <TableHead>Stability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-destructive text-sm"
                  >
                    Could not load won keywords. Please try again.
                  </TableCell>
                </TableRow>
              ) : locked.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Trophy className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No keywords have locked into the top 3 yet.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      As your keywords climb, the winners will appear here.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                locked.map((kw) => (
                  <TableRow key={kw.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link
                        href={`/keywords/${kw.id}`}
                        className="flex items-center gap-1.5 hover:underline"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{kw.keywordText}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {kw.aeoPlanId ? (
                        <Link
                          href={`/campaigns/${kw.aeoPlanId}`}
                          className="hover:underline"
                        >
                          {kw.campaignName ?? `Campaign #${kw.aeoPlanId}`}
                        </Link>
                      ) : (
                        (kw.campaignName ?? "—")
                      )}
                    </TableCell>
                    <TableCell>
                      {kw.wonPlatform ? (
                        <Badge variant="outline" className="text-xs">
                          {platformLabel(kw.wonPlatform)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <RankBadge position={kw.wonPosition} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {wonDate(kw.wonAt)}
                    </TableCell>
                    <TableCell>
                      <StabilityBar percent={kw.stabilityPercent} />
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
