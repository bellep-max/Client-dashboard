import React, { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Building2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  listPortalBusinesses,
  createPortalBusiness,
  type PortalBusiness,
  type PortalBusinessCreate,
} from "@/lib/portal-api";

export const BUSINESSES_QUERY_KEY = ["portal", "businesses"] as const;

export default function BusinessesPage() {
  const queryClient = useQueryClient();
  const {
    data: businesses,
    isLoading,
    isError,
  } = useQuery<PortalBusiness[]>({
    queryKey: BUSINESSES_QUERY_KEY,
    queryFn: listPortalBusinesses,
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [gmbUrl, setGmbUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");

  const resetForm = () => {
    setName("");
    setGmbUrl("");
    setWebsiteUrl("");
    setCity("");
    setState("");
    setCountry("");
  };

  const createMutation = useMutation({
    mutationFn: (body: PortalBusinessCreate) => createPortalBusiness(body),
    onSuccess: () => {
      toast.success("Business created");
      setIsAddOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: BUSINESSES_QUERY_KEY });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create business"),
  });

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Business name is required");
      return;
    }
    const body: PortalBusinessCreate = {
      name: trimmedName,
      gmbUrl: gmbUrl.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      country: country.trim() || null,
    };
    createMutation.mutate(body);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground mt-1">
            Locations and brands you track keywords and campaigns for.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-business">
              <Plus className="w-4 h-4 mr-2" /> Add Business
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New business</DialogTitle>
              <DialogDescription>
                Add a business so you can attach keywords and campaigns to it.
                You can fine-tune the address, GMB, and other details on the
                detail page.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">Name *</Label>
                <Input
                  id="business-name"
                  placeholder="Acme Coffee Roasters"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  data-testid="input-business-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-gmb">GMB URL</Label>
                <Input
                  id="business-gmb"
                  placeholder="https://maps.app.goo.gl/..."
                  value={gmbUrl}
                  onChange={(e) => setGmbUrl(e.target.value)}
                  data-testid="input-business-gmb"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-website">Website URL</Label>
                <Input
                  id="business-website"
                  placeholder="https://acme.example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  data-testid="input-business-website"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="business-city">City</Label>
                  <Input
                    id="business-city"
                    placeholder="Portland"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    data-testid="input-business-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-state">State</Label>
                  <Input
                    id="business-state"
                    placeholder="OR"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    data-testid="input-business-state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-country">Country</Label>
                  <Input
                    id="business-country"
                    placeholder="USA"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    data-testid="input-business-country"
                  />
                </div>
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
                disabled={createMutation.isPending || !name.trim()}
                data-testid="button-save-business"
              >
                {createMutation.isPending ? "Creating..." : "Create business"}
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
                      <p>
                        No businesses yet. Add your first one to start tracking
                        keywords and campaigns.
                      </p>
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => setIsAddOpen(true)}
                      >
                        Add your first business
                      </Button>
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
