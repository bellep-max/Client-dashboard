import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import {
  ArrowLeft,
  Loader2,
  Key,
  Lock,
  Trophy,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import {
  getAeoPlan,
  getRotationStatus,
  listKeywordVariants,
  type AeoPlan,
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

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">
        {value?.trim() || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

/** Read-only AI variant alternates, lazy-loaded when a keyword row expands. */
function VariantsPanel({ keywordId }: { keywordId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["portal", "variants", keywordId],
    queryFn: () => listKeywordVariants(keywordId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="py-3 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading alternates…
      </div>
    );
  }

  const variants = data?.variants ?? [];
  if (variants.length === 0) {
    return (
      <p className="py-3 text-sm text-muted-foreground">
        No alternate phrasings are being tested for this keyword right now.
      </p>
    );
  }

  return (
    <div className="py-3 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" /> Alternate phrasings we're testing
      </p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <Badge key={v.id} variant="secondary" className="font-normal">
            {v.variantText}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function KeywordInsightRow({ kw }: { kw: RotationKeyword }) {
  const [open, setOpen] = useState(false);
  const isLocked = kw.status === "locked";

  return (
    <>
      <TableRow className="hover:bg-muted/40">
        <TableCell className="w-8 align-top">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={open ? "Hide alternates" : "Show alternates"}
          >
            {open ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </TableCell>
        <TableCell className="font-medium">
          <Link
            href={`/keywords/${kw.id}`}
            className="flex items-center gap-1.5 hover:underline"
          >
            {isLocked && (
              <span title="Locked — top ranking achieved">
                <Lock className="w-3 h-3 text-amber-500" />
              </span>
            )}
            <span>{kw.keywordText}</span>
          </Link>
          {kw.atRisk && (
            <span className="mt-1 inline-block">
              <AtRiskBadge />
            </span>
          )}
        </TableCell>
        <TableCell>
          <RankBadge position={kw.latestPosition} />
        </TableCell>
        <TableCell>
          <PlatformChips platforms={kw.platforms} />
        </TableCell>
        <TableCell>
          <TrendBadge trend={kw.trend} />
        </TableCell>
        <TableCell>
          <Sparkline data={kw.sparkline} />
        </TableCell>
        <TableCell>
          <StabilityBar percent={kw.stabilityPercent} />
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={7} className="px-6">
            <VariantsPanel keywordId={kw.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function CampaignDetailPage() {
  const [, params] = useRoute<{ id: string }>("/campaigns/:id");
  const idNum = Number.parseInt(params?.id ?? "", 10);
  const isValidId = !Number.isNaN(idNum);

  const planQueryKey = ["portal", "aeo-plan", idNum] as const;
  const insightsQueryKey = ["portal", "aeo-plan", idNum, "insights"] as const;

  const {
    data: plan,
    isLoading: planLoading,
    isError: planError,
  } = useQuery<AeoPlan>({
    queryKey: planQueryKey,
    queryFn: () => getAeoPlan(idNum),
    enabled: isValidId,
  });

  const { data: insights, isLoading: insightsLoading } = useQuery<RotationStatus>(
    {
      queryKey: insightsQueryKey,
      queryFn: () => getRotationStatus({ aeoPlanId: idNum }),
      enabled: isValidId,
    },
  );

  if (!isValidId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-destructive">Invalid campaign id.</p>
      </div>
    );
  }

  if (planLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to campaigns
          </Button>
        </Link>
        <p className="text-destructive">Could not load this campaign.</p>
      </div>
    );
  }

  const keywords = insights?.keywords ?? [];
  const locked = keywords.filter((k) => k.status === "locked");
  const platformEntries = Object.entries(insights?.platformAggregate ?? {}).filter(
    ([, v]) => v.tracked > 0,
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon" aria-label="Back to campaigns">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
            {plan.name?.trim() ? plan.name : `Campaign #${plan.id}`}
          </h1>
          <p className="text-muted-foreground text-sm">
            Created{" "}
            {plan.createdAt
              ? format(new Date(plan.createdAt), "MMM d, yyyy")
              : "—"}
          </p>
        </div>
      </div>

      {/* Campaign details — read-only */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign details</CardTitle>
          <CardDescription>Managed from the admin panel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Field label="Campaign Name" value={plan.name} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Search Address
                </p>
                <Lock
                  className="w-3 h-3 text-muted-foreground"
                  aria-label="Locked"
                />
              </div>
              <p className="text-sm">
                {plan.searchAddress?.trim() || (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Changing the search address resets the initial report. Contact
                your admin to update.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Plan Type
              </p>
              {plan.planType ? (
                <Badge variant="outline" className="capitalize">
                  {plan.planType}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <Field label="Created By" value={plan.createdBy} />
          </div>

          {/* Subscription */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Subscription</p>
              <p className="text-xs text-muted-foreground">
                Manual entry — fill in if you have it.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Subscription ID" value={plan.subscriptionId} />
              <Field label="Card (Last 4)" value={plan.cardLast4} />
              <Field
                label="Start Date"
                value={
                  plan.subscriptionStartDate
                    ? format(
                        new Date(plan.subscriptionStartDate),
                        "MMM d, yyyy",
                      )
                    : null
                }
              />
              <Field
                label="Next Billing Date"
                value={
                  plan.nextBillingDate
                    ? format(new Date(plan.nextBillingDate), "MMM d, yyyy")
                    : null
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform breakdown strip */}
      {platformEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rankings by AI platform</CardTitle>
            <CardDescription>
              Where this campaign stands across the engines we track.
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
                    <span className="text-emerald-500 font-medium">{v.top3}</span>{" "}
                    of {v.tracked} in top 3
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Won keywords for this campaign */}
      {locked.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-4 h-4 text-amber-500" /> Won keywords
              <Badge variant="secondary">{locked.length}</Badge>
            </CardTitle>
            <CardDescription>
              Keywords in this campaign that locked into the top 3.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Won on</TableHead>
                  <TableHead>Best rank</TableHead>
                  <TableHead>Stability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locked.map((kw) => (
                  <TableRow key={kw.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link
                        href={`/keywords/${kw.id}`}
                        className="flex items-center gap-1.5 hover:underline"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {kw.keywordText}
                      </Link>
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
                    <TableCell>
                      <StabilityBar percent={kw.stabilityPercent} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Keywords with insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" /> Keywords
          </CardTitle>
          <CardDescription>
            Keywords scoped to this campaign. Expand a row to see the alternate
            phrasings we're testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Keyword</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>History</TableHead>
                <TableHead>Stability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insightsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-20 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : keywords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-6 text-muted-foreground text-sm"
                  >
                    No keywords are linked to this campaign yet. Keywords are
                    added by your admin.
                  </TableCell>
                </TableRow>
              ) : (
                keywords.map((kw) => <KeywordInsightRow key={kw.id} kw={kw} />)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
