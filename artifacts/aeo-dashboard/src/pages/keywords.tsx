import React, { useState } from "react";
import { 
  useListKeywords, 
  useAddKeyword, 
  useUpdateKeyword, 
  useDeleteKeyword,
  useGetKeywordSuggestions,
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
import { Plus, Trash2, Edit2, Loader2, Sparkles, AlertCircle, X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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

  const handleAdd = () => {
    if (!newKeywordStr.trim()) return;
    addKeyword.mutate({ data: { keyword: newKeywordStr, isAiGenerated: false } }, {
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
                  placeholder="e.g. Best coffee shop in downtown SF" 
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
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : keywords?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Search className="w-10 h-10 mb-3 opacity-20" />
                      <p>No keywords tracked yet.</p>
                      <Button variant="link" onClick={() => setIsAddOpen(true)} className="mt-2">Add your first keyword</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                keywords?.map((kw) => (
                  <TableRow key={kw.id}>
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function SuggestionsSidebar() {
  const queryClient = useQueryClient();
  const { data: suggestions, isLoading, refetch, isRefetching } = useGetKeywordSuggestions({ query: { enabled: false, queryKey: getGetKeywordSuggestionsQueryKey() } });
  const addKeyword = useAddKeyword();

  const handleFetchSuggestions = () => {
    refetch();
  };

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
        <Button variant="secondary" onClick={handleFetchSuggestions} data-testid="button-get-suggestions">
          <Sparkles className="w-4 h-4 mr-2" /> Get Suggestions
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l-border bg-card">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary" /> AI Recommendations</SheetTitle>
          <SheetDescription>Based on your business profile, industry trends, and user intent.</SheetDescription>
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

// Simple icon missing from lucide-react import
function Check(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><polyline points="20 6 9 17 4 12"></polyline></svg>;
}