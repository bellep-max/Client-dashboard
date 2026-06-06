import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, Building2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import {
  listPortalBusinesses,
  type PortalBusiness,
} from "@/lib/portal-api";

export const BUSINESSES_QUERY_KEY = ["portal", "businesses"] as const;

export default function BusinessesPage() {
  const {
    data: businesses,
    isLoading,
    isError,
  } = useQuery<PortalBusiness[]>({
    queryKey: BUSINESSES_QUERY_KEY,
    queryFn: listPortalBusinesses,
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
        <p className="text-muted-foreground mt-1">
          Locations and brands managed from the admin panel.
        </p>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>GMB URL</TableHead>
                <TableHead>City / State</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead>Campaigns</TableHead>
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
                    Failed to load businesses.
                  </TableCell>
                </TableRow>
              ) : !businesses || businesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Building2 className="w-10 h-10 mb-3 opacity-20" />
                      <p>No businesses found. Businesses are added from the admin panel.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                businesses.map((biz) => (
                  <TableRow
                    key={biz.id}
                    className="cursor-pointer hover:bg-muted/40"
                    data-testid={`business-row-${biz.id}`}
                  >
                    <TableCell className="font-medium">
                      <Link href={`/businesses/${biz.id}`}>
                        <span className="text-primary hover:underline">
                          {biz.name?.trim() ? biz.name : `Business #${biz.id}`}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      {biz.gmbUrl ? (
                        <a
                          href={biz.gmbUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate block text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {biz.gmbUrl}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {[biz.city, biz.state].filter(Boolean).join(", ") || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{biz.keywordCount ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{biz.campaignCount ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {biz.createdAt
                        ? format(new Date(biz.createdAt), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/businesses/${biz.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          data-testid={`button-open-business-${biz.id}`}
                          aria-label="Open business"
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
