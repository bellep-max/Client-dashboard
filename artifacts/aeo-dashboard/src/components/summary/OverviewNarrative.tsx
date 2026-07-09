/**
 * The lead "Summary Overview" write-up that sits at the very top of the report.
 * A client-facing narrative: each block is a heading plus one or more body
 * paragraphs (body split on "\n\n"). Pure — the parent owns fetching.
 * Renders nothing when there are no blocks and nothing is loading.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import type { OverviewBlock } from "@/lib/portal-api";

function toParagraphs(body: string): string[] {
  return body
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function OverviewNarrative({
  blocks,
  loading,
}: {
  blocks: OverviewBlock[];
  loading: boolean;
}) {
  if (blocks.length === 0 && !loading) return null;
  return (
    <Card className="bg-primary/5 border-primary/20 print-avoid-break">
      <CardContent className="pt-4 pb-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Summary Overview</span>
          {loading && (
            <span className="no-print flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> writing…
            </span>
          )}
        </div>
        {blocks.map((block) => (
          <div key={block.heading} className="space-y-1.5">
            <h3 className="text-sm font-semibold">{block.heading}</h3>
            {toParagraphs(block.body).map((paragraph, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
