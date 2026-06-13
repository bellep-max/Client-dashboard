import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Building2,
  Megaphone,
  Key,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  ArrowRight,
  PartyPopper,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Link } from "wouter";
import {
  listPortalBusinesses,
  listAeoPlans,
  listKeywordsAdminShape,
  getRotationStatus,
  type PortalBusiness,
  type AeoPlan,
  type PortalKeyword,
  type RotationStatus,
} from "@/lib/portal-api";
import { platformLabel } from "@/components/insights";
import { BUSINESSES_QUERY_KEY } from "@/pages/businesses";
import { CAMPAIGNS_QUERY_KEY } from "@/pages/campaigns";

const KEYWORDS_QUERY_KEY = ["portal", "keywords"] as const;

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconClass = "text-primary",
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function TrendBadge({
  initial,
  current,
}: {
  initial: number | null;
  current: number | null;
}) {
  if (initial == null || current == null)
    return <span className="text-xs text-muted-foreground">No data</span>;

  if (current < initial) {
    const delta = initial - current;
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
        <TrendingUp className="w-3.5 h-3.5" /> ↑{delta} vs initial
      </span>
    );
  }
  if (current > initial) {
    const delta = current - initial;
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-500">
        <TrendingDown className="w-3.5 h-3.5" /> ↓{delta} vs initial
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="w-3 h-3" /> Stable
    </span>
  );
}

export default function DashboardPage() {
  const { data: businesses, isLoading: bizLoading } = useQuery<
    PortalBusiness[]
  >({
    queryKey: BUSINESSES_QUERY_KEY,
    queryFn: listPortalBusinesses,
  });

  const { data: campaigns, isLoading: campLoading } = useQuery<AeoPlan[]>({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: listAeoPlans,
  });

  const { data: keywords, isLoading: kwLoading } = useQuery<PortalKeyword[]>({
    queryKey: KEYWORDS_QUERY_KEY,
    queryFn: () => listKeywordsAdminShape(),
  });

  const { data: rotation } = useQuery<RotationStatus>({
    queryKey: ["portal", "insights", "rotation-status"],
    queryFn: () => getRotationStatus(),
    staleTime: 60_000,
  });

  const platformEntries = useMemo(
    () =>
      Object.entries(rotation?.platformAggregate ?? {}).filter(
        ([, v]) => v.tracked > 0,
      ),
    [rotation],
  );
  const atRiskCount = rotation?.summary.atRisk ?? 0;

  const improved = useMemo(
    () =>
      (keywords ?? []).filter(
        (k) =>
          k.currentRanking != null &&
          k.initialRanking != null &&
          k.currentRanking < k.initialRanking,
      ).length,
    [keywords],
  );

  // Locked/won = keywords with status='locked'. The admin-shape keywords list
  // doesn't carry that reliably, so derive it from the rotation-status feed.
  const lockedKeywords = useMemo(
    () => (rotation?.keywords ?? []).filter((k) => k.status === "locked"),
    [rotation],
  );
  const lockedCount = lockedKeywords.length;
  const lockedIds = useMemo(
    () => new Set(lockedKeywords.map((k) => k.id)),
    [lockedKeywords],
  );

  const topKeywords = useMemo(() => {
    if (!keywords) return [];
    return [...keywords]
      .filter((k) => k.currentRanking != null)
      .sort((a, b) => (a.currentRanking ?? 999) - (b.currentRanking ?? 999))
      .slice(0, 8);
  }, [keywords]);

  const loading = bizLoading || campLoading || kwLoading;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your AEO visibility at a glance.
          </p>
        </div>
      </div>

      {/* Locked keyword celebration banner */}
      {lockedCount > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-5 py-4 flex items-start gap-4">
          <PartyPopper className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {lockedCount} keyword{lockedCount > 1 ? "s" : ""} reached top 3!
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              {lockedKeywords.map((k) => k.keywordText).join(" · ")}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              These keywords are now locked and being monitored to maintain
              their top position.
            </p>
          </div>
          <Link href="/campaigns">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-400 shrink-0"
            >
              View <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* At-risk alert */}
      {atRiskCount > 0 && (
        <Link href="/optimization">
          <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-5 py-4 flex items-start gap-4 hover:bg-red-100/60 dark:hover:bg-red-950/50 transition-colors cursor-pointer">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-800 dark:text-red-300">
                {atRiskCount} keyword{atRiskCount > 1 ? "s need" : " needs"}{" "}
                attention
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                These have stalled outside the top 3. See what we're doing about
                it.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-1" />
          </div>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Businesses"
              value={businesses?.length ?? 0}
              sub="Active accounts"
              icon={Building2}
            />
            <StatCard
              title="Campaigns"
              value={campaigns?.length ?? 0}
              sub="AEO plans running"
              icon={Megaphone}
            />
            <StatCard
              title="Keywords Improved"
              value={improved}
              sub={`vs. initial ranking`}
              icon={TrendingUp}
              iconClass="text-green-600"
            />
            <StatCard
              title="Keywords Locked"
              value={lockedCount}
              sub="Reached top 3"
              icon={Lock}
              iconClass="text-amber-500"
            />
          </>
        )}
      </div>

      {/* Visibility by AI platform */}
      {platformEntries.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" /> Visibility by AI Platform
              </CardTitle>
              <CardDescription>
                Average rank and top-3 coverage across the engines we track
              </CardDescription>
            </div>
            <Link href="/optimization">
              <Button variant="ghost" size="sm">
                Details <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
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

      {/* Businesses overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" /> My Businesses
            </CardTitle>
            <CardDescription>
              {businesses && businesses.length > 0
                ? `${businesses.length} business${businesses.length === 1 ? "" : "es"} in your portfolio`
                : "Locations and brands you track"}
            </CardDescription>
          </div>
          <Link href="/businesses">
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {bizLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !businesses || businesses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No businesses yet. Businesses are added from the admin panel.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {businesses.slice(0, 6).map((biz) => (
                <Link key={biz.id} href={`/businesses/${biz.id}`}>
                  <div className="border rounded-lg p-3 hover:bg-muted/40 hover:border-primary/40 transition-colors cursor-pointer">
                    <div className="font-medium text-sm truncate">
                      {biz.name?.trim() ? biz.name : `Business #${biz.id}`}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {(biz as any).notes || "No category set"}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {(biz as any).campaignCount ?? 0} campaign
                        {(biz as any).campaignCount !== 1 ? "s" : ""}
                      </Badge>
                      <Badge
                        variant={
                          (biz as any).status === "active"
                            ? "default"
                            : "outline"
                        }
                        className="text-xs capitalize"
                      >
                        {(biz as any).status ?? "—"}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top keywords with ranking trend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" /> Keyword Rankings
            </CardTitle>
            <CardDescription>
              Current rank vs. initial — lower is better
            </CardDescription>
          </div>
          <Link href="/campaigns">
            <Button variant="ghost" size="sm">
              View campaigns <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
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
              {kwLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Skeleton className="h-4 w-48 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : topKeywords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground text-sm"
                  >
                    No keyword data yet.
                  </TableCell>
                </TableRow>
              ) : (
                topKeywords.map((kw) => (
                  <TableRow key={kw.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {lockedIds.has(kw.id) && (
                          <span title="Locked — reached top 3">
                            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                          </span>
                        )}
                        <span className="truncate max-w-[200px]">
                          {kw.keywordText}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {kw.campaignName ?? "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {kw.initialRanking != null
                        ? `#${kw.initialRanking}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold">
                      {kw.currentRanking != null
                        ? `#${kw.currentRanking}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <TrendBadge
                        initial={kw.initialRanking}
                        current={kw.currentRanking}
                      />
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
