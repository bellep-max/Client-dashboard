import { useListKeywords } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
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
import {
  Loader2,
  Sparkles,
  AlertCircle,
  Search,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";

export default function KeywordsPage() {
  const { data: keywords, isLoading } = useListKeywords();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keyword Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Target queries tracked for your Answer Engine Optimization. Keywords
          are managed by your account team.
        </p>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Target Query</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Efficiency</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : keywords?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-48 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center">
                      <Search className="w-10 h-10 mb-3 opacity-20" />
                      <p>No keywords tracked yet.</p>
                      <p className="text-xs mt-1">
                        Your account team adds keywords for you.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                keywords?.map((kw) => (
                  <TableRow key={kw.id}>
                    <TableCell className="font-medium max-w-md">
                      <span className="truncate block" title={kw.keyword}>
                        {kw.keyword}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {kw.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {kw.efficiencyScore != null ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${kw.efficiencyScore < 6 ? "text-amber-500" : "text-primary"}`}
                          >
                            {kw.efficiencyScore}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            /10
                          </span>
                          {kw.efficiencyScore < 6 && (
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {kw.currentPosition ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {kw.isAiGenerated ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          <Sparkles className="w-3 h-3 mr-1" /> AI
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Manual
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/keywords/${kw.id}`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          data-testid={`button-open-keyword-${kw.id}`}
                          aria-label="Open keyword detail"
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
