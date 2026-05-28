import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Megaphone, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  listAeoPlans,
  createAeoPlan,
  listPortalBusinesses,
  type AeoPlan,
  type AeoPlanCreate,
  type PortalBusiness,
} from "@/lib/portal-api";
import { BUSINESSES_QUERY_KEY } from "@/pages/businesses";

const CAMPAIGNS_QUERY_KEY = ["portal", "aeo-plans"] as const;

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading, isError } = useQuery<AeoPlan[]>({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: listAeoPlans,
  });

  const { data: businesses, isLoading: businessesLoading } = useQuery<
    PortalBusiness[]
  >({
    queryKey: BUSINESSES_QUERY_KEY,
    queryFn: listPortalBusinesses,
  });

  const businessNameById = useMemo(() => {
    const map = new Map<number, string>();
    (businesses ?? []).forEach((b) => {
      map.set(b.id, b.name?.trim() ? b.name : `Business #${b.id}`);
    });
    return map;
  }, [businesses]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [planType, setPlanType] = useState("Growth");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [businessId, setBusinessId] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: (body: AeoPlanCreate) => createAeoPlan(body),
    onSuccess: () => {
      toast.success("Campaign created");
      setIsAddOpen(false);
      setName("");
      setPlanType("Growth");
      setMonthlyBudget("");
      setBusinessId("");
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create campaign"),
  });

  const hasBusinesses = !!businesses && businesses.length > 0;

  const handleCreate = () => {
    if (!businessId) {
      toast.error("Please select a business for this campaign");
      return;
    }
    const parsedBudget = monthlyBudget.trim()
      ? Number.parseFloat(monthlyBudget)
      : null;
    if (parsedBudget != null && Number.isNaN(parsedBudget)) {
      toast.error("Monthly budget must be a number");
      return;
    }
    const body: AeoPlanCreate = {
      name: name.trim() || null,
      planType: planType.trim() || "Custom",
      monthlyAeoBudget: parsedBudget,
      businessId: Number.parseInt(businessId, 10),
    };
    createMutation.mutate(body);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            AEO plans grouping keywords, sample questions, and budgets.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-campaign">
              <Plus className="w-4 h-4 mr-2" /> Add Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New AEO campaign</DialogTitle>
              <DialogDescription>
                Spin up a new plan. You can fine-tune sample questions and
                budget on the detail page.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-business">Business *</Label>
                {businessesLoading ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading businesses...
                  </div>
                ) : !hasBusinesses ? (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground space-y-2">
                    <p>No businesses yet — add one first.</p>
                    <Link href="/businesses">
                      <Button variant="link" className="px-0 h-auto">
                        Go to Businesses →
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Select value={businessId} onValueChange={setBusinessId}>
                    <SelectTrigger
                      id="campaign-business"
                      data-testid="select-campaign-business"
                    >
                      <SelectValue placeholder="Select a business" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses!.map((biz) => (
                        <SelectItem key={biz.id} value={String(biz.id)}>
                          {biz.name?.trim() ? biz.name : `Business #${biz.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="Spring 2026 push"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!hasBusinesses}
                  data-testid="input-campaign-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-plan-type">Plan type</Label>
                <Input
                  id="campaign-plan-type"
                  placeholder="Starter / Growth / Pro / Custom"
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  disabled={!hasBusinesses}
                  data-testid="input-campaign-plan-type"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-budget">Monthly AEO budget (USD)</Label>
                <Input
                  id="campaign-budget"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="500.00"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  disabled={!hasBusinesses}
                  data-testid="input-campaign-budget"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  createMutation.isPending ||
                  !planType.trim() ||
                  !hasBusinesses ||
                  !businessId
                }
                data-testid="button-save-campaign"
              >
                {createMutation.isPending ? "Creating..." : "Create campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Plan type</TableHead>
                <TableHead>Monthly budget</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-destructive">
                    Failed to load campaigns.
                  </TableCell>
                </TableRow>
              ) : !plans || plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Megaphone className="w-10 h-10 mb-3 opacity-20" />
                      <p>No campaigns yet.</p>
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => setIsAddOpen(true)}
                      >
                        Create your first campaign
                      </Button>
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
                    <TableCell className="font-medium">
                      <Link href={`/campaigns/${plan.id}`}>
                        <span className="text-primary hover:underline">
                          {plan.name?.trim() ? plan.name : `Campaign #${plan.id}`}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {plan.businessId != null ? (
                        <Link href={`/businesses/${plan.businessId}`}>
                          <span className="text-primary hover:underline">
                            {businessNameById.get(plan.businessId) ??
                              plan.businessName ??
                              `Business #${plan.businessId}`}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {plan.planType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {plan.monthlyAeoBudget != null
                        ? `$${plan.monthlyAeoBudget.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{plan.keywordCount ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {plan.createdAt
                        ? format(new Date(plan.createdAt), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/campaigns/${plan.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          data-testid={`button-open-campaign-${plan.id}`}
                          aria-label="Open campaign"
                        >
                          <ChevronRight className="w-4 h-4" />
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
