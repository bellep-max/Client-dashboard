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
import { ArrowLeft, Loader2, Save, Trash2, Key } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  getAeoPlan,
  updateAeoPlan,
  deleteAeoPlan,
  listKeywordsAdminShape,
  type AeoPlan,
  type AeoPlanUpdate,
  type PortalKeyword,
} from "@/lib/portal-api";

type EditableFields = {
  name: string;
  planType: string;
  monthlyAeoBudget: string;
  currentAnswerPresence: string;
  searchBoostTarget: string;
  schemaImplementor: string;
  searchAddress: string;
  sampleQuestions: string[]; // length 10
};

const EMPTY_QUESTIONS: string[] = Array.from({ length: 10 }, () => "");

function fromPlan(plan: AeoPlan): EditableFields {
  return {
    name: plan.name ?? "",
    planType: plan.planType ?? "",
    monthlyAeoBudget:
      plan.monthlyAeoBudget != null ? String(plan.monthlyAeoBudget) : "",
    currentAnswerPresence: plan.currentAnswerPresence ?? "",
    searchBoostTarget:
      plan.searchBoostTarget != null ? String(plan.searchBoostTarget) : "",
    schemaImplementor: plan.schemaImplementor ?? "",
    searchAddress: plan.searchAddress ?? "",
    sampleQuestions: [
      plan.sampleQuestion1 ?? "",
      plan.sampleQuestion2 ?? "",
      plan.sampleQuestion3 ?? "",
      plan.sampleQuestion4 ?? "",
      plan.sampleQuestion5 ?? "",
      plan.sampleQuestion6 ?? "",
      plan.sampleQuestion7 ?? "",
      plan.sampleQuestion8 ?? "",
      plan.sampleQuestion9 ?? "",
      plan.sampleQuestion10 ?? "",
    ],
  };
}

function toUpdatePayload(fields: EditableFields): AeoPlanUpdate {
  const payload: AeoPlanUpdate = {
    name: fields.name.trim() || null,
    planType: fields.planType.trim() || "Custom",
    monthlyAeoBudget: fields.monthlyAeoBudget.trim()
      ? Number.parseFloat(fields.monthlyAeoBudget)
      : null,
    currentAnswerPresence: fields.currentAnswerPresence.trim() || null,
    searchBoostTarget: fields.searchBoostTarget.trim()
      ? Number.parseInt(fields.searchBoostTarget, 10)
      : null,
    schemaImplementor: fields.schemaImplementor.trim() || null,
    searchAddress: fields.searchAddress.trim() || null,
  };
  const qKeys: Array<keyof AeoPlanUpdate> = [
    "sampleQuestion1",
    "sampleQuestion2",
    "sampleQuestion3",
    "sampleQuestion4",
    "sampleQuestion5",
    "sampleQuestion6",
    "sampleQuestion7",
    "sampleQuestion8",
    "sampleQuestion9",
    "sampleQuestion10",
  ];
  qKeys.forEach((key, i) => {
    (payload as Record<string, unknown>)[key] =
      fields.sampleQuestions[i].trim() || null;
  });
  return payload;
}

export default function CampaignDetailPage() {
  const [, params] = useRoute<{ id: string }>("/campaigns/:id");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
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

  const { data: keywords, isLoading: keywordsLoading } = useQuery<PortalKeyword[]>({
    queryKey: keywordsQueryKey,
    queryFn: () => listKeywordsAdminShape({ aeoPlanId: idNum }),
    enabled: isValidId,
  });

  const [fields, setFields] = useState<EditableFields>({
    name: "",
    planType: "",
    monthlyAeoBudget: "",
    currentAnswerPresence: "",
    searchBoostTarget: "",
    schemaImplementor: "",
    searchAddress: "",
    sampleQuestions: EMPTY_QUESTIONS,
  });

  useEffect(() => {
    if (plan) setFields(fromPlan(plan));
  }, [plan]);

  const updateMutation = useMutation({
    mutationFn: (body: AeoPlanUpdate) => updateAeoPlan(idNum, body),
    onSuccess: () => {
      toast.success("Campaign saved");
      queryClient.invalidateQueries({ queryKey: planQueryKey });
      queryClient.invalidateQueries({ queryKey: ["portal", "aeo-plans"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAeoPlan(idNum),
    onSuccess: () => {
      toast.success("Campaign deleted");
      queryClient.invalidateQueries({ queryKey: ["portal", "aeo-plans"] });
      setLocation("/campaigns");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete"),
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

  const handleSave = () => {
    updateMutation.mutate(toUpdatePayload(fields));
  };

  const setQ = (idx: number, value: string) => {
    setFields((prev) => {
      const next = [...prev.sampleQuestions];
      next[idx] = value;
      return { ...prev, sampleQuestions: next };
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
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
              Created {plan.createdAt ? format(new Date(plan.createdAt), "MMM d, yyyy") : "-"}
              {plan.updatedAt
                ? ` · Updated ${format(new Date(plan.updatedAt), "MMM d, yyyy")}`
                : ""}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              data-testid="button-delete-campaign"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the AEO plan. Keywords linked to it
                will be unassigned. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
                data-testid="button-confirm-delete-campaign"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign details</CardTitle>
          <CardDescription>Edit the AEO plan configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Business</Label>
              <div className="text-sm">
                {plan.businessId != null ? (
                  <Link href={`/businesses/${plan.businessId}`}>
                    <span
                      className="text-primary hover:underline"
                      data-testid="link-campaign-business"
                    >
                      {plan.businessName?.trim()
                        ? plan.businessName
                        : `Business #${plan.businessId}`}
                    </span>
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    Not linked to a business
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-name">Name</Label>
              <Input
                id="field-name"
                value={fields.name}
                onChange={(e) => setFields({ ...fields, name: e.target.value })}
                data-testid="input-detail-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-plan-type">Plan type</Label>
              <Input
                id="field-plan-type"
                value={fields.planType}
                onChange={(e) =>
                  setFields({ ...fields, planType: e.target.value })
                }
                data-testid="input-detail-plan-type"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-budget">Monthly AEO budget (USD)</Label>
              <Input
                id="field-budget"
                type="number"
                step="0.01"
                min="0"
                value={fields.monthlyAeoBudget}
                onChange={(e) =>
                  setFields({ ...fields, monthlyAeoBudget: e.target.value })
                }
                data-testid="input-detail-budget"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-target">3-month search boost target</Label>
              <Input
                id="field-target"
                type="number"
                min="0"
                value={fields.searchBoostTarget}
                onChange={(e) =>
                  setFields({ ...fields, searchBoostTarget: e.target.value })
                }
                data-testid="input-detail-target"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-answer-presence">
                Current answer presence
              </Label>
              <Input
                id="field-answer-presence"
                placeholder="e.g. 0%, 25%, present"
                value={fields.currentAnswerPresence}
                onChange={(e) =>
                  setFields({
                    ...fields,
                    currentAnswerPresence: e.target.value,
                  })
                }
                data-testid="input-detail-answer-presence"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-schema">Schema implementor</Label>
              <Input
                id="field-schema"
                placeholder="us / client_dev / agency..."
                value={fields.schemaImplementor}
                onChange={(e) =>
                  setFields({ ...fields, schemaImplementor: e.target.value })
                }
                data-testid="input-detail-schema"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="field-address">Search address</Label>
              <Input
                id="field-address"
                placeholder="Address used for geo-scoped searches"
                value={fields.searchAddress}
                onChange={(e) =>
                  setFields({ ...fields, searchAddress: e.target.value })
                }
                data-testid="input-detail-address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample questions</CardTitle>
          <CardDescription>
            Up to 10 representative queries you want to rank for. Leave blank to
            skip.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.sampleQuestions.map((q, i) => (
            <div key={i} className="space-y-1.5">
              <Label htmlFor={`q-${i}`} className="text-xs text-muted-foreground">
                Question {i + 1}
              </Label>
              <Textarea
                id={`q-${i}`}
                rows={2}
                value={q}
                onChange={(e) => setQ(i, e.target.value)}
                data-testid={`input-sample-question-${i + 1}`}
              />
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-campaign"
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
            <Key className="w-5 h-5" /> Linked keywords
          </CardTitle>
          <CardDescription>
            Keywords scoped to this campaign. Click a row to inspect it.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
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
                    No keywords are linked to this campaign yet.
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
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {kw.status ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {kw.keywordType ?? "-"}
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
