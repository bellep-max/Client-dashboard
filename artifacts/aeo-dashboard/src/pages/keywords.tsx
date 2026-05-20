import React, { useState } from "react";
import { 
  useListKeywords, 
  useAddKeyword, 
  useUpdateKeyword, 
  useDeleteKeyword,
  useGetKeywordSuggestions,
  useListKeywordLinks,
  useAddKeywordLink,
  useDeleteKeywordLink,
  useAnalyzeKeywordLink,
  getGetKeywordSuggestionsQueryKey,
  getListKeywordsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Loader2, Sparkles, AlertCircle, X, Search, Link2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

function Check(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="20 6 9 17 4 12"></polyline></svg>;
}

export default function KeywordsPage() {
  const queryClient = useQueryClient();
  const { data: keywords, isLoading } = useListKeywords();
  const addKeyword = useAddKeyword();
  const updateKeyword = useUpdateKeyword();
  const deleteKeyword = useDeleteKeyword();
  
  const [newKeywordStr, setNewKeywordStr] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editString, setEditString] = useState("");
  const [expandedLinks, setExpandedLinks] = useState<Set<number>>(new Set());

  const handleAdd = () => {
    const trimmed = newKeywordStr.trim();
    if (!trimmed) return;
    if (/\s/.test(trimmed)) { toast.error("Keywords must be a single word — no spaces allowed"); return; }
    addKeyword.mutate({ data: { keyword: trimmed, isAiGenerated: false } }, {
      onSuccess: () => {
        toast.success("Keyword added");
        setNewKeywordStr("");
        setIsAddOpen(false);
        queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() });
      },
      onError: () => toast.error("Failed to add keyword")
    });
  };

  const handleDelete = (id: number) => {
    deleteKeyword.mutate({ id }, {
      onSuccess: () => {
        toast.success("Keyword removed");
        queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() });
      },
      onError: () => toast.error("Failed to remove keyword")
    });
  };

  const handleSaveEdit = (id: number) => {
    updateKeyword.mutate({ id, data: { keyword: editString } }, {
      onSuccess: () => {
        toast.success("Keyword updated");
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() });
      },
      onError: () => toast.error("Failed to update keyword")
    });
  };

  const toggleLinks = (kwId: number) => {
    setExpandedLinks(prev => {
      const next = new Set(prev);
      if (next.has(kwId)) next.delete(kwId);
      else next.add(kwId);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keyword Tracking</h1>
          <p className="text-muted-foreground mt-1">Manage target queries for Answer Engine Optimization</p>
        </div>
        <div className="flex gap-3">
          <SuggestionsSidebar />
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-keyword"><Plus className="w-4 h-4 mr-2" /> Add Keyword</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Keyword</DialogTitle>
                <DialogDescription>Track a specific question or phrase relevant to your business.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input 
                  placeholder="e.g. What is the best way to manage employee schedules" 
                  value={newKeywordStr}
                  onChange={e => setNewKeywordStr(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  autoFocus
                  data-testid="input-new-keyword"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={addKeyword.isPending || !newKeywordStr.trim()} data-testid="button-save-new-keyword">
                  {addKeyword.isPending ? "Adding..." : "Add to Tracker"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Target Query</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Efficiency</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : keywords?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Search className="w-10 h-10 mb-3 opacity-20" />
                      <p>No keywords tracked yet.</p>
                      <Button variant="link" onClick={() => setIsAddOpen(true)} className="mt-2">Add your first keyword</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                keywords?.map((kw) => (
                  <React.Fragment key={kw.id}>
                    <TableRow className={expandedLinks.has(kw.id) ? "bg-muted/30" : ""}>
                      <TableCell className="w-8 px-2">
                        <button
                          onClick={() => toggleLinks(kw.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Toggle links"
                          data-testid={`button-toggle-links-${kw.id}`}
                        >
                          {expandedLinks.has(kw.id) 
                            ? <ChevronDown className="w-4 h-4" /> 
                            : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium max-w-md">
                        {editingId === kw.id ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              value={editString} 
                              onChange={e => setEditString(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={e => e.key === 'Enter' && handleSaveEdit(kw.id)}
                              data-testid={`input-edit-keyword-${kw.id}`}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleSaveEdit(kw.id)}><Check className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <span className="truncate block" title={kw.keyword}>{kw.keyword}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{kw.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {kw.efficiencyScore != null ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${kw.efficiencyScore < 6 ? 'text-amber-500' : 'text-primary'}`}>
                              {kw.efficiencyScore}
                            </span>
                            <span className="text-xs text-muted-foreground">/10</span>
                            {kw.efficiencyScore < 6 && <AlertCircle className="w-3 h-3 text-amber-500" />}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{kw.currentPosition ?? '-'}</span>
                      </TableCell>
                      <TableCell>
                        {kw.isAiGenerated ? (
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20"><Sparkles className="w-3 h-3 mr-1" /> AI</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Manual</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId !== kw.id && (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setEditingId(kw.id); setEditString(kw.keyword); }} data-testid={`button-edit-keyword-${kw.id}`}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(kw.id)} data-testid={`button-delete-keyword-${kw.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedLinks.has(kw.id) && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0 bg-muted/20">
                          <KeywordLinksPanel keywordId={kw.id} keywordText={kw.keyword} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function KeywordLinksPanel({ keywordId, keywordText }: { keywordId: number; keywordText: string }) {
  const queryClient = useQueryClient();
  const { data: links, isLoading } = useListKeywordLinks(keywordId);
  const addLink = useAddKeywordLink();
  const deleteLink = useDeleteKeywordLink();
  const analyzeLink = useAnalyzeKeywordLink();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLinkType, setNewLinkType] = useState<"backlink" | "blog" | "newsletter" | "news" | "social" | "directory" | "citation" | "other">("backlink");

  const linksQueryKey = ["/api/businesses/me/keywords", keywordId, "links"];

  const handleAddLink = () => {
    if (!newUrl.trim()) return;
    addLink.mutate(
      { id: keywordId, data: { url: newUrl, description: newDescription || undefined, linkType: newLinkType } },
      {
        onSuccess: () => {
          toast.success("Link added and analyzed");
          setNewUrl("");
          setNewDescription("");
          setNewLinkType("backlink");
          setIsAddOpen(false);
          queryClient.invalidateQueries({ queryKey: linksQueryKey });
        },
        onError: () => toast.error("Failed to add link")
      }
    );
  };

  const handleDeleteLink = (linkId: number) => {
    deleteLink.mutate({ id: linkId }, {
      onSuccess: () => {
        toast.success("Link removed");
        queryClient.invalidateQueries({ queryKey: linksQueryKey });
      },
      onError: () => toast.error("Failed to remove link")
    });
  };

  const handleReanalyze = (linkId: number) => {
    analyzeLink.mutate({ id: linkId }, {
      onSuccess: () => {
        toast.success("Analysis refreshed");
        queryClient.invalidateQueries({ queryKey: linksQueryKey });
      },
      onError: () => toast.error("Failed to re-analyze link")
    });
  };

  return (
    <div className="px-10 py-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Link2 className="w-4 h-4" />
          <span>Links for &ldquo;{keywordText}&rdquo;</span>
          {links?.length ? <Badge variant="secondary" className="text-xs">{links.length}</Badge> : null}
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} data-testid={`button-add-link-${keywordId}`}>
          <Plus className="w-3 h-3 mr-1" /> Add Link
        </Button>
      </div>

      {isAddOpen && (
        <div className="border rounded-lg p-4 space-y-3 bg-card">
          <div className="space-y-2">
            <Label className="text-xs font-medium">URL</Label>
            <Input
              placeholder="https://example.com/article"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              data-testid={`input-link-url-${keywordId}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Link Type</Label>
              <Select value={newLinkType} onValueChange={v => setNewLinkType(v as typeof newLinkType)}>
                <SelectTrigger className="h-8 text-sm" data-testid={`select-link-type-${keywordId}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlink">Backlink</SelectItem>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="news">News Article</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="directory">Directory</SelectItem>
                  <SelectItem value="citation">Citation</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Description (optional)</Label>
              <Input
                placeholder="Brief description..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddLink} disabled={addLink.isPending || !newUrl.trim()} data-testid={`button-save-link-${keywordId}`}>
              {addLink.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</> : "Add & Analyze"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : links?.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No links added yet. Add a link to get AI longevity analysis.</p>
      ) : (
        <div className="space-y-2">
          {links?.map(link => {
            const scoreBar = (val: number | null | undefined) => {
              const v = val ?? null;
              const color = v == null ? "bg-muted" : v >= 70 ? "bg-green-500" : v >= 50 ? "bg-amber-500" : "bg-destructive";
              const textColor = v == null ? "text-muted-foreground" : v >= 70 ? "text-green-500" : v >= 50 ? "text-amber-500" : "text-destructive";
              return { color, textColor, v };
            };
            const eff = scoreBar(link.aiEfficiencyPercent);
            const acc = scoreBar(link.aiAccuracyPercent);
            const vis = scoreBar(link.aiVisibilityPercent);
            return (
            <div key={link.id} className="border rounded-lg p-3 bg-card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate max-w-xs">
                      {link.url}
                    </a>
                    <Badge variant="outline" className="capitalize text-xs shrink-0">{link.linkType}</Badge>
                    {link.aiLifespanDays != null && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        ~{link.aiLifespanDays >= 365
                          ? `${Math.round(link.aiLifespanDays / 365)}yr`
                          : `${link.aiLifespanDays}d`} lifespan
                      </span>
                    )}
                  </div>
                  {link.description && (
                    <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
                  )}
                  {link.aiCustomerInsight && (
                    <div className="mt-2 flex items-start gap-2 px-2 py-1.5 rounded bg-primary/5 border border-primary/10">
                      <span className="text-xs font-medium text-primary shrink-0 mt-0.5">Customer insight</span>
                      <p className="text-xs text-muted-foreground">{link.aiCustomerInsight}</p>
                    </div>
                  )}
                  {(eff.v != null || acc.v != null || vis.v != null) && (
                    <div className="mt-2 space-y-1.5">
                      {[
                        { label: "AEO Efficiency", bar: eff },
                        { label: "Content Accuracy", bar: acc },
                        { label: "AI Visibility", bar: vis },
                      ].map(({ label, bar }) => bar.v != null && (
                        <div key={label} className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className={`text-xs font-bold ${bar.textColor}`}>{bar.v}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${bar.color}`} style={{ width: `${bar.v}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {link.aiAnalysis && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{link.aiAnalysis}</p>
                  )}
                  {link.analyzedAt && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Analyzed {format(new Date(link.analyzedAt), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => handleReanalyze(link.id)}
                    disabled={analyzeLink.isPending}
                    title="Re-analyze"
                    data-testid={`button-reanalyze-link-${link.id}`}
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteLink(link.id)}
                    disabled={deleteLink.isPending}
                    data-testid={`button-delete-link-${link.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}

function SuggestionsSidebar() {
  const queryClient = useQueryClient();
  const { data: suggestions, isLoading, refetch, isRefetching } = useGetKeywordSuggestions({ query: { enabled: false, queryKey: getGetKeywordSuggestionsQueryKey() } });
  const addKeyword = useAddKeyword();

  const handleAddSuggestion = (kw: any) => {
    if (kw.efficiencyScore < 6) {
      toast.warning(`Warning: "${kw.keyword}" has a low efficiency score.`);
    }
    addKeyword.mutate({ data: { keyword: kw.keyword, isAiGenerated: true, notes: kw.reason } }, {
      onSuccess: () => {
        toast.success("Added to tracking");
        queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() });
      }
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" onClick={() => refetch()} data-testid="button-get-suggestions">
          <Sparkles className="w-4 h-4 mr-2" /> Get Suggestions
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l-border bg-card">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary" /> AI Recommendations</SheetTitle>
          <SheetDescription>Topic-based and intent-based queries for AI answer engine optimization.</SheetDescription>
        </SheetHeader>

        {(isLoading || isRefetching) ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing search patterns...</p>
          </div>
        ) : suggestions?.length ? (
          <div className="space-y-4">
            {suggestions.map((sug, i) => (
              <Card key={i} className="bg-background border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-medium text-sm leading-tight">{sug.keyword}</h4>
                    <Badge variant={sug.efficiencyScore >= 7 ? "default" : sug.efficiencyScore < 6 ? "outline" : "secondary"} className={sug.efficiencyScore < 6 ? "text-amber-500 border-amber-500/50" : ""}>
                      {sug.efficiencyScore}/10
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{sug.reason}</p>
                  <Button 
                    size="sm" 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => handleAddSuggestion(sug)}
                    disabled={addKeyword.isPending}
                    data-testid={`button-add-suggestion-${i}`}
                  >
                    Track Query
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No suggestions available right now.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
