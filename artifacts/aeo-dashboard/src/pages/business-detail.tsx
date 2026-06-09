import React, { useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Loader2, Megaphone, Plus, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  getPortalBusiness,
  listAeoPlans,
  createAeoPlan,
  type PortalBusiness,
  type AeoPlan,
} from "@/lib/portal-api";
import { CAMPAIGNS_QUERY_KEY } from "@/pages/campaigns";

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

const PLANS = [
  {
    id: "Starter",
    label: "Starter",
    price: "$499/mo",
    features: ["1 campaign", "Up to 5 keywords", "Performance reports"],
  },
  {
    id: "Growth",
    label: "Growth",
    price: "$999/mo",
    features: ["1 campaign", "Up to 10 keywords", "Performance reports", "Priority support"],
  },
  {
    id: "Pro",
    label: "Pro",
    price: "$1,999/mo",
    features: ["1 campaign", "Up to 20 keywords", "Weekly reports", "Dedicated account manager"],
  },
];

export default function BusinessDetailPage() {
  const [, params] = useRoute<{ id: string }>("/businesses/:id");
  const idNum = Number.parseInt(params?.id ?? "", 10);
  const isValidId = !Number.isNaN(idNum);
  const queryClient = useQueryClient();

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState("Growth");
  const [campaignName, setCampaignName] = useState("");
  const [searchAddress, setSearchAddress] = useState("");

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

  const createMutation = useMutation({
    mutationFn: () =>
      createAeoPlan({
        businessId: idNum,
        planType: selectedPlan,
        name: campaignName.trim() || null,
        searchAddress: searchAddress.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Campaign created! Your admin will add keywords shortly.");
      setPurchaseOpen(false);
      setStep(1);
      setCampaignName("");
      setSearchAddress("");
      setSelectedPlan("Growth");
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: campaignsQueryKey });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create campaign"),
  });

  function openPurchase() {
    setStep(1);
    setSelectedPlan("Growth");
    setCampaignName("");
    setSearchAddress("");
    setPurchaseOpen(true);
  }

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
              <Field label="Published (GMB) Address" value={business.publishedAddress} />
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

      {/* Purchase dialog */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="max-w-2xl">
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>Choose a Plan</DialogTitle>
                <DialogDescription>
                  Each campaign targets one search address. You can add multiple campaigns to one business.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`border rounded-xl p-4 text-left transition-all ${
                      selectedPlan === plan.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{plan.label}</span>
                      {selectedPlan === plan.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="text-lg font-bold text-primary mb-3">{plan.price}</div>
                    <ul className="space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-green-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPurchaseOpen(false)}>Cancel</Button>
                <Button onClick={() => setStep(2)}>
                  Continue with {selectedPlan} →
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Configure Campaign</DialogTitle>
                <DialogDescription>
                  Set the search address — this is where your AEO campaign will target rankings. It cannot be changed without resetting the initial report.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-lg border bg-muted/30 px-4 py-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Selected plan</span>
                  <Badge variant="outline" className="capitalize">{selectedPlan}</Badge>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="campaign-name"
                    placeholder="e.g. Brooklyn — Spring 2026"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search-address">
                    Search Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="search-address"
                    placeholder="e.g. Brooklyn, NY 11201"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the geographic location used for AI ranking searches. Changing it later resets your initial report.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !searchAddress.trim()}
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    "Confirm & Purchase"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" /> Campaigns
              {campaigns && campaigns.length > 0 && (
                <Badge variant="secondary">{campaigns.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>AEO plans scoped to this business.</CardDescription>
          </div>
          <Button size="sm" onClick={openPurchase}>
            <Plus className="w-4 h-4 mr-1" /> Add Campaign
          </Button>
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
                  <TableRow key={plan.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell>
                      <Link href={`/campaigns/${plan.id}`}>
                        <span className="font-medium text-primary hover:underline">
                          {plan.name?.trim() ? plan.name : `Campaign #${plan.id}`}
                        </span>
                      </Link>
                      {plan.keywordCount != null && plan.keywordCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {plan.keywordCount} active keyword{plan.keywordCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {plan.planType ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">—</TableCell>
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
