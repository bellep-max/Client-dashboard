import React from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import {
  getAeoPlan,
  listKeywordsAdminShape,
  type AeoPlan,
  type PortalKeyword,
} from "@/lib/portal-api";

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

export default function CampaignDetailPage() {
  const [, params] = useRoute<{ id: string }>("/campaigns/:id");
  const idNum = Number.parseInt(params?.id ?? "", 10);
  const isValidId = !Number.isNaN(idNum);

  const planQueryKey = ["portal", "aeo-plan", idNum] as const;
  const keywordsQueryKey = ["portal", "aeo-plan", idNum, "keywords"] as const;

  const {
    data: plan,
    isLoading: planLoading,
    isError: planError,
  } = useQuery<AeoPlan>({
    queryKey: planQueryKey,
    queryFn: () => getAeoPlan(idNum),
    enabled: isValidId,
  });

  const { data: keywords, isLoading: keywordsLoading } = useQuery<
    PortalKeyword[]
  >({
    queryKey: keywordsQueryKey,
    queryFn: () => listKeywordsAdminShape({ aeoPlanId: idNum }),
    enabled: isValidId,
  });

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

      {/* Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" /> Keywords
          </CardTitle>
          <CardDescription>Keywords scoped to this campaign.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywordsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : !keywords || keywords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-6 text-muted-foreground text-sm"
                  >
                    No keywords are linked to this campaign yet. Keywords are
                    added by your admin.
                  </TableCell>
                </TableRow>
              ) : (
                keywords.map((kw) => {
                  const isLocked = kw.isLocked;

                  return (
                    <TableRow key={kw.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {isLocked && (
                            <span title="Locked — top ranking achieved">
                              <Lock className="w-3 h-3 text-amber-500" />
                            </span>
                          )}
                          <span>{kw.keywordText}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {kw.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {kw.lastRunAt
                          ? format(new Date(kw.lastRunAt), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
