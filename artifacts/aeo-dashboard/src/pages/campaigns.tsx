import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { InfoTip } from "@/components/InfoTip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Megaphone, ExternalLink } from "lucide-react";
import { listAeoPlans, type AeoPlan } from "@/lib/portal-api";

export const CAMPAIGNS_QUERY_KEY = ["portal", "aeo-plans"] as const;

export default function CampaignsPage() {
  const {
    data: plans,
    isLoading,
    isError,
  } = useQuery<AeoPlan[]>({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: listAeoPlans,
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Campaigns{plans ? ` (${plans.length})` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            AEO plans are managed from the admin panel.
          </p>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plan Type</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-destructive"
                  >
                    Failed to load campaigns.
                  </TableCell>
                </TableRow>
              ) : !plans || plans.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-48 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center">
                      <Megaphone className="w-10 h-10 mb-3 opacity-20" />
                      <p>No campaigns yet.</p>
                      <p className="text-sm mt-1">
                        Campaigns are added from the admin panel.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer hover:bg-muted/40"
                    data-testid={`campaign-row-${plan.id}`}
                  >
                    <TableCell>
                      <Link href={`/campaigns/${plan.id}`}>
                        <span className="font-medium text-primary hover:underline">
                          {plan.name?.trim()
                            ? plan.name
                            : `Campaign #${plan.id}`}
                        </span>
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        <span>
                          <span className="font-medium text-foreground">
                            {plan.activeCount ?? plan.keywordCount ?? 0}
                          </span>{" "}
                          active
                          <InfoTip label="What are active keywords">
                            Keywords we&rsquo;re actively working to move up the
                            rankings right now.
                          </InfoTip>
                        </span>
                        <span>
                          <span className="font-medium text-foreground">
                            {plan.watchCount ?? 0}
                          </span>{" "}
                          under watch
                          <InfoTip label="What are under-watch keywords">
                            Keywords that were ranking but have slipped out of
                            the top lately — we&rsquo;re watching these closely
                            and adjusting.
                          </InfoTip>
                        </span>
                        <span>
                          <span className="font-medium text-foreground">
                            {plan.lockedCount ?? 0}
                          </span>{" "}
                          locked
                          <InfoTip label="What are locked keywords">
                            Keywords that reached the top and are
                            &ldquo;won&rdquo; — we hold their spot and shift
                            effort to other keywords.
                          </InfoTip>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {plan.planType ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      —
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {plan.createdBy?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/campaigns/${plan.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          data-testid={`button-open-campaign-${plan.id}`}
                          aria-label={`Open campaign ${plan.name?.trim() || plan.id}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
