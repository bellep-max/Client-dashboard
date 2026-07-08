/**
 * Scope + date controls for the Summary Report. Scope is picked with two
 * dependent selects — a business ("All businesses" = whole account) and a
 * campaign ("All campaigns") whose options are filtered to the selected
 * business. Picking a business resets the campaign; picking a campaign infers
 * its business. The period is picked from a month-grid calendar whose selectable
 * days are the dates that actually have a report for the current scope
 * (/summary/available-dates). Purely presentational — parent owns the state.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DateCalendar } from "@/components/summary/DateCalendar";
import type {
  AeoPlan,
  PortalBusiness,
  SummaryAvailableDate,
  SummaryScope,
} from "@/lib/portal-api";

export interface ScopeState {
  scope: SummaryScope;
  businessId: number | null;
  aeoPlanId: number | null;
}

/** Radix Select forbids empty-string item values, so an explicit sentinel
 *  stands in for the "All …" (no selection) option. */
const ALL_VALUE = "all";

const campaignLabel = (c: AeoPlan): string =>
  c.name ?? c.businessName ?? `Campaign #${c.id}`;

export function SummaryControls({
  value,
  onScopeChange,
  businesses,
  campaigns,
  dates,
  date,
  onDateChange,
}: {
  value: ScopeState;
  onScopeChange: (next: ScopeState) => void;
  businesses: PortalBusiness[];
  campaigns: AeoPlan[];
  dates: SummaryAvailableDate[];
  date: string | null;
  onDateChange: (date: string | null) => void;
}) {
  const businessOptions = [...businesses].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const campaignOptions = campaigns
    .filter(
      (c) => value.businessId == null || c.businessId === value.businessId,
    )
    .sort((a, b) => campaignLabel(a).localeCompare(campaignLabel(b)));

  const handleBusiness = (v: string): void => {
    if (v === ALL_VALUE) {
      onScopeChange({ scope: "client", businessId: null, aeoPlanId: null });
      return;
    }
    // Changing business always resets the campaign.
    onScopeChange({
      scope: "business",
      businessId: Number(v),
      aeoPlanId: null,
    });
  };

  const handleCampaign = (v: string): void => {
    if (v === ALL_VALUE) {
      onScopeChange({
        scope: value.businessId != null ? "business" : "client",
        businessId: value.businessId,
        aeoPlanId: null,
      });
      return;
    }
    const id = Number(v);
    const plan = campaigns.find((c) => c.id === id);
    onScopeChange({
      scope: "campaign",
      // A campaign implies its business — infer it if not already set.
      businessId: value.businessId ?? plan?.businessId ?? null,
      aeoPlanId: id,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 no-print">
      <div className="flex-1 min-w-[12rem] space-y-1">
        <Label className="text-xs text-muted-foreground">Business</Label>
        <Select
          value={
            value.businessId != null ? String(value.businessId) : ALL_VALUE
          }
          onValueChange={handleBusiness}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All businesses</SelectItem>
            {businessOptions.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[12rem] space-y-1">
        <Label className="text-xs text-muted-foreground">Campaign</Label>
        <Select
          value={value.aeoPlanId != null ? String(value.aeoPlanId) : ALL_VALUE}
          onValueChange={handleCampaign}
          disabled={campaignOptions.length === 0}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All campaigns</SelectItem>
            {campaignOptions.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {campaignLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[12rem] space-y-1">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <DateCalendar dates={dates} value={date} onChange={onDateChange} />
      </div>
    </div>
  );
}
