/**
 * Scope + date controls for the Summary Report. Scope picks the audience of the
 * report (whole client, one business, or one campaign); the date dropdown is
 * built from /summary/available-dates ("All" = all-time, a date = the period
 * ending then). Purely presentational — parent owns the state.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type {
  AeoPlan,
  PortalBusiness,
  SummaryAvailableDate,
  SummaryScope,
} from "@/lib/portal-api";
import { format } from "date-fns";

const ALL_DATES = "__all__";

function prettyDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : format(d, "MMM d, yyyy");
}

export function SummaryControls({
  scope,
  onScopeChange,
  businesses,
  businessId,
  onBusinessChange,
  campaigns,
  aeoPlanId,
  onCampaignChange,
  dates,
  date,
  onDateChange,
}: {
  scope: SummaryScope;
  onScopeChange: (scope: SummaryScope) => void;
  businesses: PortalBusiness[];
  businessId: number | null;
  onBusinessChange: (id: number | null) => void;
  campaigns: AeoPlan[];
  aeoPlanId: number | null;
  onCampaignChange: (id: number | null) => void;
  dates: SummaryAvailableDate[];
  date: string | null;
  onDateChange: (date: string | null) => void;
}) {
  const showBusiness = scope === "business";
  const showCampaign = scope === "campaign";

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 no-print">
      <div className="flex-1 min-w-[10rem] space-y-1">
        <Label className="text-xs text-muted-foreground">View</Label>
        <Select
          value={scope}
          onValueChange={(v) => onScopeChange(v as SummaryScope)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">Whole account</SelectItem>
            {businesses.length > 0 && (
              <SelectItem value="business">By business</SelectItem>
            )}
            {campaigns.length > 0 && (
              <SelectItem value="campaign">By campaign</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {showBusiness && (
        <div className="flex-1 min-w-[12rem] space-y-1">
          <Label className="text-xs text-muted-foreground">Business</Label>
          <Select
            value={businessId != null ? String(businessId) : ""}
            onValueChange={(v) => onBusinessChange(v ? Number(v) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showCampaign && (
        <div className="flex-1 min-w-[12rem] space-y-1">
          <Label className="text-xs text-muted-foreground">Campaign</Label>
          <Select
            value={aeoPlanId != null ? String(aeoPlanId) : ""}
            onValueChange={(v) => onCampaignChange(v ? Number(v) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name ?? c.businessName ?? `Campaign #${c.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 min-w-[12rem] space-y-1">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select
          value={date ?? ALL_DATES}
          onValueChange={(v) => onDateChange(v === ALL_DATES ? null : v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DATES}>All time</SelectItem>
            {dates.map((d) => (
              <SelectItem key={d.date} value={d.date}>
                {prettyDate(d.date)}
                {d.count ? ` (${d.count})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
