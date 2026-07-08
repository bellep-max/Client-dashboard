/**
 * Summary Report — the customer-facing bi-weekly performance summary. Parallel
 * to the admin panel's Summary Report so the two stay structurally identical.
 *
 * Scope (whole account / business / campaign) + period drive four plain-`fetch`
 * portal endpoints (clientId is inferred from the session):
 *   /api/glossary, /api/summary/available-dates, /api/summary, /api/summary/narrative
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import {
  getGlossary,
  getSummaryAvailableDates,
  getSummaryReport,
  getSummaryNarrative,
  listAeoPlans,
  listPortalBusinesses,
  type AeoPlan,
  type PortalBusiness,
  type SummaryScope,
  type SummaryScopeParams,
} from "@/lib/portal-api";
import { BUSINESSES_QUERY_KEY } from "@/pages/businesses";
import { CAMPAIGNS_QUERY_KEY } from "@/pages/campaigns";
import {
  SummaryControls,
  type ScopeState,
} from "@/components/summary/SummaryControls";
import {
  OverallNarrative,
  MetricsCards,
  PlatformAggregates,
  MoversList,
  LockedList,
  WatchList,
  DeclinesList,
  HowAeoWorks,
  GlossarySection,
} from "@/components/summary/SummarySections";

/** Only send scope-specific ids when the matching scope is active, so the
 *  backend never receives a stale businessId while viewing a campaign. */
function toScopeParams(
  scope: SummaryScope,
  businessId: number | null,
  aeoPlanId: number | null,
  date: string | null,
): SummaryScopeParams {
  return {
    scope,
    businessId: scope === "business" ? businessId : null,
    aeoPlanId: scope === "campaign" ? aeoPlanId : null,
    date,
  };
}

/** A scope selection is "ready" to query once it has the id it needs. */
function isScopeReady(
  scope: SummaryScope,
  businessId: number | null,
  aeoPlanId: number | null,
): boolean {
  if (scope === "business") return businessId != null;
  if (scope === "campaign") return aeoPlanId != null;
  return true;
}

function periodTitle(date: string | null): string {
  if (!date) return "All-time summary";
  const d = new Date(`${date}T00:00:00`);
  const label = Number.isNaN(d.getTime()) ? date : format(d, "MMM d, yyyy");
  return `Period ending ${label}`;
}

export default function ReportsPage() {
  const [scopeState, setScopeState] = useState<ScopeState>({
    scope: "client",
    businessId: null,
    aeoPlanId: null,
  });
  const { scope, businessId, aeoPlanId } = scopeState;
  const [date, setDate] = useState<string | null>(null);

  const { data: businesses } = useQuery<PortalBusiness[]>({
    queryKey: BUSINESSES_QUERY_KEY,
    queryFn: listPortalBusinesses,
    staleTime: 60_000,
  });
  const { data: campaigns } = useQuery<AeoPlan[]>({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: listAeoPlans,
    staleTime: 60_000,
  });

  const scopeReady = isScopeReady(scope, businessId, aeoPlanId);
  const scopeParams = useMemo(
    () => toScopeParams(scope, businessId, aeoPlanId, date),
    [scope, businessId, aeoPlanId, date],
  );
  const datesParams = useMemo(
    () => toScopeParams(scope, businessId, aeoPlanId, null),
    [scope, businessId, aeoPlanId],
  );

  const { data: glossary } = useQuery({
    queryKey: ["portal", "summary", "glossary"],
    queryFn: getGlossary,
    staleTime: Infinity,
  });

  const { data: availableDates } = useQuery({
    queryKey: ["portal", "summary", "dates", datesParams],
    queryFn: () => getSummaryAvailableDates(datesParams),
    enabled: scopeReady,
    staleTime: 60_000,
  });

  // Default to the latest available run, and — when the scope changes — fall
  // back to the latest if the currently-picked date has no data for the new
  // scope. Dates arrive newest-first from the endpoint.
  useEffect(() => {
    const list = availableDates?.dates;
    if (!list || list.length === 0) return;
    const stillAvailable = date != null && list.some((d) => d.date === date);
    if (!stillAvailable) setDate(list[0].date);
  }, [availableDates, date]);

  const {
    data: report,
    isLoading: reportLoading,
    isError: reportError,
  } = useQuery({
    queryKey: ["portal", "summary", "report", scopeParams],
    queryFn: () => getSummaryReport(scopeParams),
    enabled: scopeReady,
    staleTime: 60_000,
  });

  const { data: narrative, isFetching: narrativeLoading } = useQuery({
    queryKey: ["portal", "summary", "narrative", scopeParams],
    queryFn: () => getSummaryNarrative(scopeParams),
    enabled: scopeReady,
    staleTime: 60_000,
  });

  const sections = narrative?.sections;
  const dates = availableDates?.dates ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 report-print-area">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Summary Report
            </h1>
            <p className="text-muted-foreground text-sm">
              How your business is showing up across ChatGPT, Gemini, and
              Perplexity.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      <SummaryControls
        value={scopeState}
        onScopeChange={setScopeState}
        businesses={businesses ?? []}
        campaigns={campaigns ?? []}
        dates={dates}
        date={date}
        onDateChange={setDate}
      />

      {!scopeReady ? (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {scope === "business"
              ? "Pick a business to see its summary."
              : "Pick a campaign to see its summary."}
          </p>
        </div>
      ) : reportLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reportError || !report ? (
        <p className="text-destructive text-sm py-8">
          Could not load your summary. Please try again.
        </p>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">
              {periodTitle(report.date)}
            </h2>
          </div>

          <MetricsCards metrics={report.metrics} />

          <OverallNarrative
            overall={sections?.overall}
            trend={sections?.trend}
            loading={narrativeLoading}
          />

          <PlatformAggregates
            platforms={report.platforms}
            narrative={sections?.platforms}
            narrativeLoading={narrativeLoading}
          />

          <MoversList
            movers={report.movers}
            narrative={sections?.movers}
            narrativeLoading={narrativeLoading}
          />

          <LockedList
            locked={report.locked}
            narrative={sections?.locked}
            narrativeLoading={narrativeLoading}
          />

          <WatchList watch={report.watch} />

          <DeclinesList
            declines={report.declines}
            narrative={sections?.declines}
            narrativeLoading={narrativeLoading}
          />

          <HowAeoWorks steps={narrative?.howAeoWorks ?? []} />

          <GlossarySection glossary={glossary ?? null} />
        </div>
      )}
    </div>
  );
}
