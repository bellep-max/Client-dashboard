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
import { InfoTip } from "@/components/InfoTip";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Megaphone } from "lucide-react";
import { format } from "date-fns";
import {
  getPortalBusiness,
  listAeoPlans,
  type PortalBusiness,
  type AeoPlan,
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

export default function BusinessDetailPage() {
  const [, params] = useRoute<{ id: string }>("/businesses/:id");
  const idNum = Number.parseInt(params?.id ?? "", 10);
  const isValidId = !Number.isNaN(idNum);

  const businessQueryKey = ["portal", "business", idNum] as const;
  const campaignsQueryKey = ["portal", "business", idNum, "campaigns"] as const;

  const {
    data: business,
    isLoading: businessLoading,
    isError: businessError,
  } = useQuery<PortalBusiness>({
    queryKey: businessQueryKey,
    queryFn: () => getPortalBusiness(idNum),
    enabled: isValidId,
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<AeoPlan[]>({
    queryKey: campaignsQueryKey,
    queryFn: () => listAeoPlans(),
    enabled: isValidId,
    select: (rows) => rows.filter((p) => p.businessId === idNum),
  });

  if (!isValidId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-destructive">Invalid business id.</p>
      </div>
    );
  }

  if (businessLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (businessError || !business) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Link href="/businesses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to businesses
          </Button>
        </Link>
        <p className="text-destructive">Could not load this business.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/businesses">
          <Button variant="ghost" size="icon" aria-label="Back to businesses">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
            {business.name?.trim() ? business.name : `Business #${business.id}`}
          </h1>
          <p className="text-muted-foreground text-sm">
            Created{" "}
            {business.createdAt
              ? format(new Date(business.createdAt), "MMM d, yyyy")
              : "—"}
          </p>
        </div>
      </div>

      {/* Business details — read-only, managed from admin panel */}
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>Managed from the admin panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Business Name" value={business.name} />
            <Field label="Status" value={business.status} />
            <Field label="GMB URL" value={business.gmbUrl} />
            <Field label="Website" value={business.websiteUrl} />
            <div className="md:col-span-2">
              <Field
                label="Published (GMB) Address"
                value={business.publishedAddress}
              />
            </div>
            <Field label="City" value={business.city} />
            <Field label="State" value={business.state} />
            <Field label="Country" value={business.country} />
            <Field label="Zip Code" value={business.zipCode} />
            <Field label="Place ID" value={business.placeId} />
            <Field label="Timezone" value={business.timezone} />
            {business.notes && (
              <div className="md:col-span-2">
                <Field label="Notes" value={business.notes} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Campaigns
            {campaigns && campaigns.length > 0 && (
              <Badge variant="secondary">{campaigns.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>AEO plans scoped to this business.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plan Type</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : !campaigns || campaigns.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-muted-foreground text-sm"
                  >
                    No campaigns are linked to this business yet.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((plan) => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer hover:bg-muted/40"
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
                      {(plan as any).createdBy?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/campaigns/${plan.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Open
                        </Button>
                      </Link>
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
