import React, { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetMyBusiness, 
  useCreateBusiness, 
  useUpdateBusiness,
  useAddGbpProfile,
  useAddWebsite,
  useGenerateKeywords,
  useAddKeyword
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft, Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

const businessSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  subscriberName: z.string().min(2, "Subscriber name is required"),
  industry: z.string().optional(),
  description: z.string().optional(),
});

const gbpSchema = z.object({
  businessName: z.string().min(2, "GBP business name is required"),
  address: z.string().optional(),
  category: z.string().optional(),
  isVerified: z.boolean().default(false),
});

const websiteSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  linkType: z.enum(["backlink", "blog", "newsletter", "news", "social", "directory", "other"]),
  title: z.string().optional(),
});

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isNewBusiness = new URLSearchParams(search).get("new") === "1";

  const { data: business, isLoading: isBusinessLoading } = useGetMyBusiness();
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness();
  const addGbpProfile = useAddGbpProfile();
  const addWebsite = useAddWebsite();
  const generateKeywords = useGenerateKeywords();
  const addKeyword = useAddKeyword();

  const [generatedKeywords, setGeneratedKeywords] = useState<{keyword: string, efficiencyScore: number, selected: boolean}[]>([]);
  const [showGbpWarning, setShowGbpWarning] = useState(false);
  const [pendingGbpData, setPendingGbpData] = useState<any>(null);

  const formBusiness = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      businessName: "",
      ownerName: "",
      subscriberName: "",
      industry: "",
      description: "",
    }
  });

  const formGbp = useForm<z.infer<typeof gbpSchema>>({
    resolver: zodResolver(gbpSchema),
    defaultValues: {
      businessName: "",
      address: "",
      category: "",
      isVerified: false,
    }
  });

  const formWebsite = useForm<z.infer<typeof websiteSchema>>({
    resolver: zodResolver(websiteSchema),
    defaultValues: {
      url: "",
      linkType: "backlink",
      title: "",
    }
  });

  useEffect(() => {
    if (isNewBusiness) return;
    if (!isBusinessLoading && business && business.onboardingComplete) {
      setLocation("/dashboard");
    } else if (business && step === 1) {
      setStep(2);
    }
  }, [business, isBusinessLoading, setLocation, step, isNewBusiness]);

  const onBusinessSubmit = async (data: z.infer<typeof businessSchema>) => {
    try {
      if (!business || isNewBusiness) {
        await createBusiness.mutateAsync({ data });
      } else {
        await updateBusiness.mutateAsync({ data });
      }
      toast.success("Business profile saved");
      setStep(2);
    } catch (e) {
      toast.error("Failed to save business profile");
    }
  };

  const onGbpSubmit = async (data: z.infer<typeof gbpSchema>) => {
    if (!data.isVerified) {
      setPendingGbpData(data);
      setShowGbpWarning(true);
      return;
    }
    await processGbpAdd(data);
  };

  const processGbpAdd = async (data: any) => {
    try {
      await addGbpProfile.mutateAsync({ data });
      toast.success("Google Business Profile added");
      setStep(3);
    } catch (e) {
      toast.error("Failed to add GBP profile");
    }
  };

  const onWebsiteSubmit = async (data: z.infer<typeof websiteSchema>) => {
    try {
      await addWebsite.mutateAsync({ data });
      toast.success("Website added successfully");
      generateKeywords.mutate(undefined, {
        onSuccess: (res) => {
          setGeneratedKeywords(res.map((k: any) => ({ ...k, selected: true })));
          setStep(4);
        },
        onError: () => {
          toast.error("Failed to auto-generate keywords");
          setStep(4);
        }
      });
    } catch (e) {
      toast.error("Failed to add website");
    }
  };

  const skipToKeywords = () => {
    generateKeywords.mutate(undefined, {
      onSuccess: (res) => {
        setGeneratedKeywords(res.map((k: any) => ({ ...k, selected: true })));
        setStep(4);
      },
      onError: () => {
        toast.error("Failed to auto-generate keywords");
        setStep(4);
      }
    });
  };

  const completeOnboarding = async () => {
    try {
      const selectedKws = generatedKeywords.filter(k => k.selected);
      for (const kw of selectedKws) {
        if (kw.efficiencyScore < 6) {
          toast.warning(`Keyword "${kw.keyword}" may have low impact`);
        }
        await addKeyword.mutateAsync({
          data: { keyword: kw.keyword, isAiGenerated: true, notes: "Added during onboarding" }
        });
      }
      
      await updateBusiness.mutateAsync({
        data: { onboardingComplete: true }
      });
      
      toast.success("Onboarding complete!");
      setLocation("/dashboard");
    } catch (e) {
      toast.error("Failed to complete onboarding");
    }
  };

  if (isBusinessLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center font-bold text-primary-foreground text-xl">
            AE
          </div>
          <span className="font-bold tracking-tight text-2xl">AEO Platform</span>
        </div>

        {isNewBusiness && (
          <div className="text-center mb-4">
            <Badge variant="outline" className="text-primary border-primary">Adding a new business</Badge>
          </div>
        )}

        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-border -z-10 transform -translate-y-1/2"></div>
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-medium border-2 transition-colors ${
              s === step ? "bg-primary border-primary text-primary-foreground" : 
              s < step ? "bg-primary/20 border-primary text-primary" : "bg-card border-border text-muted-foreground"
            }`}>
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>Tell us about your business to get started.</CardDescription>
            </CardHeader>
            <Form {...formBusiness}>
              <form onSubmit={formBusiness.handleSubmit(onBusinessSubmit)}>
                <CardContent className="space-y-4">
                  <FormField control={formBusiness.control} name="businessName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-business-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={formBusiness.control} name="ownerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Name</FormLabel>
                        <FormControl><Input {...field} data-testid="input-owner-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={formBusiness.control} name="subscriberName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormControl><Input {...field} data-testid="input-subscriber-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={formBusiness.control} name="industry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl><Input {...field} data-testid="input-industry" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={formBusiness.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Description</FormLabel>
                      <FormControl><Textarea {...field} rows={3} data-testid="input-description" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
                <CardFooter className="flex justify-between">
                  {isNewBusiness && (
                    <Button variant="ghost" type="button" onClick={() => setLocation("/settings")}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={createBusiness.isPending || updateBusiness.isPending} className={isNewBusiness ? "" : "ml-auto"} data-testid="button-next-step1">
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Google Business Profile</CardTitle>
              <CardDescription>Connect your Google Business Profile to track local authority.</CardDescription>
            </CardHeader>
            <Form {...formGbp}>
              <form onSubmit={formGbp.handleSubmit(onGbpSubmit)}>
                <CardContent className="space-y-4">
                  <FormField control={formGbp.control} name="businessName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GBP Name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-gbp-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={formGbp.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Category</FormLabel>
                      <FormControl><Input {...field} data-testid="input-gbp-category" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={formGbp.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input {...field} data-testid="input-gbp-address" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={formGbp.control} name="isVerified" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-gbp-verified" />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>This profile is verified on Google</FormLabel>
                      </div>
                    </FormItem>
                  )} />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" type="button" onClick={() => setStep(1)} data-testid="button-back-step2">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setStep(3)} data-testid="button-skip-step2">Skip</Button>
                    <Button type="submit" disabled={addGbpProfile.isPending} data-testid="button-next-step2">
                      Add & Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Form>

            <AlertDialog open={showGbpWarning} onOpenChange={setShowGbpWarning}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unverified Profile</AlertDialogTitle>
                  <AlertDialogDescription>
                    This GBP appears unverified. Are you sure you want to add it? Unverified profiles have much lower impact on Answer Engine Optimization.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-gbp-warning">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setShowGbpWarning(false); processGbpAdd(pendingGbpData); }} data-testid="button-confirm-gbp-warning">
                    Yes, add it anyway
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Digital Footprint</CardTitle>
              <CardDescription>Add your main website or primary backlinks.</CardDescription>
            </CardHeader>
            <Form {...formWebsite}>
              <form onSubmit={formWebsite.handleSubmit(onWebsiteSubmit)}>
                <CardContent className="space-y-4">
                  <FormField control={formWebsite.control} name="url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl><Input placeholder="https://example.com" {...field} data-testid="input-website-url" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={formWebsite.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Title / Name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-website-title" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={formWebsite.control} name="linkType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-website-type">
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="backlink">Primary Website / Backlink</SelectItem>
                          <SelectItem value="blog">Blog</SelectItem>
                          <SelectItem value="social">Social Media</SelectItem>
                          <SelectItem value="directory">Directory</SelectItem>
                          <SelectItem value="news">News Article</SelectItem>
                          <SelectItem value="newsletter">Newsletter</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" type="button" onClick={() => setStep(2)} data-testid="button-back-step3">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={skipToKeywords} data-testid="button-skip-step3">Skip</Button>
                    <Button type="submit" disabled={addWebsite.isPending || generateKeywords.isPending} data-testid="button-next-step3">
                      Add & Generate Keywords <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Form>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>AI Generated Keywords</CardTitle>
              <CardDescription>Based on your profile, we suggest tracking these initial queries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generateKeywords.isPending ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground text-sm">Analyzing business context and generating queries...</p>
                </div>
              ) : generatedKeywords.length > 0 ? (
                <div className="space-y-3">
                  {generatedKeywords.map((kw, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${kw.selected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={kw.selected} 
                          onCheckedChange={(checked) => {
                            const newKws = [...generatedKeywords];
                            newKws[idx].selected = checked === true;
                            setGeneratedKeywords(newKws);
                          }}
                          data-testid={`checkbox-kw-${idx}`}
                        />
                        <div>
                          <div className="font-medium text-sm">{kw.keyword}</div>
                          <div className="text-xs text-muted-foreground">Efficiency: {kw.efficiencyScore}/10</div>
                        </div>
                      </div>
                      <Badge variant={kw.efficiencyScore >= 7 ? "default" : kw.efficiencyScore < 6 ? "destructive" : "secondary"}>
                        {kw.efficiencyScore >= 7 ? 'High Impact' : kw.efficiencyScore < 6 ? 'Low Impact' : 'Medium'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No keywords generated. You can add them manually later.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" type="button" onClick={() => setStep(3)} data-testid="button-back-step4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={completeOnboarding} 
                disabled={updateBusiness.isPending || addKeyword.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-complete-onboarding"
              >
                {updateBusiness.isPending ? "Saving..." : "Complete Setup"} <Check className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
