import React, { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Key,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  getPortalBusiness,
  updatePortalBusiness,
  deletePortalBusiness,
  listAeoPlans,
  listKeywordsAdminShape,
  type PortalBusiness,
  type PortalBusinessUpdate,
  type AeoPlan,
  type PortalKeyword,
} from "@/lib/portal-api";
import { BUSINESSES_QUERY_KEY } from "@/pages/businesses";

type EditableFields = {
  name: string;
  gmbUrl: string;
  websiteUrl: string;
  publishedAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  placeId: string;
  timezone: string;
  status: string;
  notes: string;
};

function fromBusiness(biz: PortalBusiness): EditableFields {
  return {
    name: biz.name ?? "",
    gmbUrl: biz.gmbUrl ?? "",
    websiteUrl: biz.websiteUrl ?? "",
    publishedAddress: biz.publishedAddress ?? "",
    city: biz.city ?? "",
    state: biz.state ?? "",
    country: biz.country ?? "",
    zipCode: biz.zipCode ?? "",
    placeId: biz.placeId ?? "",
    timezone: biz.timezone ?? "",
    status: biz.status ?? "",
    notes: biz.notes ?? "",
  };
}

function toUpdatePayload(fields: EditableFields): PortalBusinessUpdate {
  return {
    name: fields.name.trim(),
    gmbUrl: fields.gmbUrl.trim() || null,
    websiteUrl: fields.websiteUrl.trim() || null,
    publishedAddress: fields.publishedAddress.trim() || null,
    city: fields.city.trim() || null,
    state: fields.state.trim() || null,
    country: fields.country.trim() || null,
    zipCode: fields.zipCode.trim() || null,
    placeId: fields.placeId.trim() || null,
    timezone: fields.timezone.trim() || null,
    status: fields.status.trim() || null,
    notes: fields.notes.trim() || null,
  };
}

export default function BusinessDetailPage() {
  const [, params] = useRoute<{ id: string }>("/businesses/:id");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const idNum = Number.parseInt(params?.id ?? "", 10);
  const isValidId = !Number.isNaN(idNum);

  const businessQueryKey = ["portal", "business", idNum] as const;
  const campaignsQueryKey = ["portal", "business", idNum, "campaigns"] as const;
  const keywordsQueryKey = ["portal", "business", idNum, "keywords"] as const;

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

  const { data: keywords, isLoading: keywordsLoading } = useQuery<PortalKeyword[]>({
    queryKey: keywordsQueryKey,
    queryFn: () => listKeywordsAdminShape({ businessId: idNum }),
    enabled: isValidId,
  });

  const [fields, setFields] = useState<EditableFields>({
    name: "",
    gmbUrl: "",
    websiteUrl: "",
    publishedAddress: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    placeId: "",
    timezone: "",
    status: "",
    notes: "",
  });

  useEffect(() => {
    if (business) setFields(fromBusiness(business));
  }, [business]);

  const updateMutation = useMutation({
    mutationFn: (body: PortalBusinessUpdate) => updatePortalBusiness(idNum, body),
    onSuccess: () => {
      toast.success("Business saved");
      queryClient.invalidateQueries({ queryKey: businessQueryKey });
      queryClient.invalidateQueries({ queryKey: BUSINESSES_QUERY_KEY });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePortalBusiness(idNum),
    onSuccess: () => {
      toast.success("Business deleted");
      queryClient.invalidateQueries({ queryKey: BUSINESSES_QUERY_KEY });
      setLocation("/businesses");
    },
    onError: (err: Error) => {
      // Surface 409 (has children) with a guiding message but stay on page.
      const msg = err.message || "";
      if (/409|has\s+(keywords|campaigns|children)/i.test(msg)) {
        toast.error(
          "Cannot delete: this business still has keywords or campaigns linked to it. Remove or reassign them first.",
        );
        return;
      }
      toast.error(msg || "Failed to delete");
    },
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

  const handleSave = () => {
    if (!fields.name.trim()) {
      toast.error("Business name is required");
      return;
    }
    updateMutation.mutate(toUpdatePayload(fields));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
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
                : "-"}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              data-testid="button-delete-business"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this business?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the business profile. If there are keywords or
                campaigns linked to it, the delete will be refused until you
                reassign or remove them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
                data-testid="button-confirm-delete-business"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>Edit business profile and location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="biz-name">Name *</Label>
              <Input
                id="biz-name"
                value={fields.name}
                onChange={(e) => setFields({ ...fields, name: e.target.value })}
                data-testid="input-biz-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-status">Status</Label>
              <Input
                id="biz-status"
                placeholder="active / paused / archived"
                value={fields.status}
                onChange={(e) =>
                  setFields({ ...fields, status: e.target.value })
                }
                data-testid="input-biz-status"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-gmb">GMB URL</Label>
              <Input
                id="biz-gmb"
                value={fields.gmbUrl}
                onChange={(e) =>
                  setFields({ ...fields, gmbUrl: e.target.value })
                }
                data-testid="input-biz-gmb"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-website">Website URL</Label>
              <Input
                id="biz-website"
                value={fields.websiteUrl}
                onChange={(e) =>
                  setFields({ ...fields, websiteUrl: e.target.value })
                }
                data-testid="input-biz-website"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="biz-address">Published address</Label>
              <Input
                id="biz-address"
                value={fields.publishedAddress}
                onChange={(e) =>
                  setFields({ ...fields, publishedAddress: e.target.value })
                }
                data-testid="input-biz-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-city">City</Label>
              <Input
                id="biz-city"
                value={fields.city}
                onChange={(e) => setFields({ ...fields, city: e.target.value })}
                data-testid="input-biz-city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-state">State</Label>
              <Input
                id="biz-state"
                value={fields.state}
                onChange={(e) =>
                  setFields({ ...fields, state: e.target.value })
                }
                data-testid="input-biz-state"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-country">Country</Label>
              <Input
                id="biz-country"
                value={fields.country}
                onChange={(e) =>
                  setFields({ ...fields, country: e.target.value })
                }
                data-testid="input-biz-country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-zip">Zip code</Label>
              <Input
                id="biz-zip"
                value={fields.zipCode}
                onChange={(e) =>
                  setFields({ ...fields, zipCode: e.target.value })
                }
                data-testid="input-biz-zip"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-place-id">Place ID</Label>
              <Input
                id="biz-place-id"
                value={fields.placeId}
                onChange={(e) =>
                  setFields({ ...fields, placeId: e.target.value })
                }
                data-testid="input-biz-place-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-timezone">Timezone</Label>
              <Input
                id="biz-timezone"
                placeholder="America/Los_Angeles"
                value={fields.timezone}
                onChange={(e) =>
                  setFields({ ...fields, timezone: e.target.value })
                }
                data-testid="input-biz-timezone"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="biz-notes">Notes</Label>
              <Textarea
                id="biz-notes"
                rows={3}
                value={fields.notes}
                onChange={(e) =>
                  setFields({ ...fields, notes: e.target.value })
                }
                data-testid="input-biz-notes"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-business"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Campaigns
          </CardTitle>
          <CardDescription>
            AEO plans scoped to this business.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plan type</TableHead>
                <TableHead>Monthly budget</TableHead>
                <TableHead>Keywords</TableHead>
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
                    <TableCell className="font-medium">
                      <Link href={`/campaigns/${plan.id}`}>
                        <span className="text-primary hover:underline">
                          {plan.name?.trim() ? plan.name : `Campaign #${plan.id}`}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {plan.planType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {plan.monthlyAeoBudget != null
                        ? `$${plan.monthlyAeoBudget.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {plan.keywordCount ?? 0}
                      </Badge>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" /> Keywords
          </CardTitle>
          <CardDescription>
            Keywords scoped to this business.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywordsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : !keywords || keywords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-muted-foreground text-sm"
                  >
                    No keywords are linked to this business yet.
                  </TableCell>
                </TableRow>
              ) : (
                keywords.map((kw) => (
                  <TableRow
                    key={kw.id}
                    className="cursor-pointer hover:bg-muted/40"
                  >
                    <TableCell className="font-medium">
                      <Link href={`/keywords/${kw.id}`}>
                        <span className="text-primary hover:underline">
                          {kw.keywordText}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {kw.campaignName ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {kw.status ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {kw.lastRunAt
                        ? format(new Date(kw.lastRunAt), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/keywords/${kw.id}`}>
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
