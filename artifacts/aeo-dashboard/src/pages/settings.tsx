import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetMyBusiness,
  useListBusinesses,
  useSwitchBusiness,
  useUpdateBusiness,
  useListGbpProfiles,
  useListWebsites,
  useDeleteGbpProfile,
  useDeleteWebsite,
  getGetMyBusinessQueryKey,
  getListBusinessesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2, Building, Globe, Plus, Check, KeyRound } from "lucide-react";

const businessSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  subscriberName: z.string().min(2, "Subscriber name is required"),
  industry: z.string().optional(),
  description: z.string().optional(),
});

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: business, isLoading: isBusinessLoading } = useGetMyBusiness();
  const { data: allBusinesses, isLoading: isAllBusinessesLoading } = useListBusinesses();
  const { data: gbps, isLoading: isGbpLoading } = useListGbpProfiles();
  const { data: websites, isLoading: isWebsitesLoading } = useListWebsites();
  
  const updateBusiness = useUpdateBusiness();
  const switchBusiness = useSwitchBusiness();
  const deleteGbp = useDeleteGbpProfile();
  const deleteWebsite = useDeleteWebsite();

  const form = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      businessName: "",
      ownerName: "",
      subscriberName: "",
      industry: "",
      description: "",
    }
  });

  useEffect(() => {
    if (business) {
      form.reset({
        businessName: business.businessName,
        ownerName: business.ownerName,
        subscriberName: business.subscriberName,
        industry: business.industry || "",
        description: business.description || "",
      });
    }
  }, [business, form]);

  const onSubmit = (data: z.infer<typeof businessSchema>) => {
    updateBusiness.mutate({ data }, {
      onSuccess: () => {
        toast.success("Settings saved successfully");
        queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
      },
      onError: () => toast.error("Failed to save settings")
    });
  };

  const handleSwitch = (businessId: number) => {
    switchBusiness.mutate({ data: { businessId } }, {
      onSuccess: () => {
        toast.success("Switched active business");
        queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey() });
      },
      onError: () => toast.error("Failed to switch business")
    });
  };

  const handleRemoveGbp = (id: number) => {
    deleteGbp.mutate({ id }, {
      onSuccess: () => {
        toast.success("Profile removed");
        queryClient.invalidateQueries({ queryKey: ["/api/businesses/me/gbp"] });
      }
    });
  };

  const handleRemoveWebsite = (id: number) => {
    deleteWebsite.mutate({ id }, {
      onSuccess: () => {
        toast.success("Website removed");
        queryClient.invalidateQueries({ queryKey: ["/api/businesses/me/websites"] });
      }
    });
  };

  if (isBusinessLoading) {
    return <div className="flex h-full items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business profile and connected assets.</p>
      </div>

      <div className="grid gap-8">

        {/* Businesses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" /> Businesses</CardTitle>
                <CardDescription>Manage all your business profiles. Switch which one is currently active.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocation("/onboarding?new=1")} data-testid="button-add-business">
                <Plus className="w-4 h-4 mr-2" /> Add Business
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isAllBusinessesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-3">
                {allBusinesses?.map(biz => (
                  <div key={biz.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${biz.isActive ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-center gap-3">
                      {biz.isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                      <div>
                        <div className="font-medium text-sm">{biz.businessName}</div>
                        <div className="text-xs text-muted-foreground">{biz.industry || "No industry set"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {biz.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSwitch(biz.id)}
                          disabled={switchBusiness.isPending}
                          data-testid={`button-switch-business-${biz.id}`}
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {!allBusinesses?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">No businesses set up yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Profile Edit */}
        {business && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Active Business</CardTitle>
              <CardDescription>Update the profile for <span className="font-medium text-foreground">{business.businessName}</span>.</CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="businessName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-settings-business" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="ownerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Name</FormLabel>
                        <FormControl><Input {...field} data-testid="input-settings-owner" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="subscriberName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscriber Name</FormLabel>
                        <FormControl><Input {...field} data-testid="input-settings-subscriber" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl><Input {...field} data-testid="input-settings-industry" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Description</FormLabel>
                      <FormControl><Textarea {...field} rows={4} data-testid="input-settings-description" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={updateBusiness.isPending} data-testid="button-save-settings">
                    {updateBusiness.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        )}

        {/* Connected Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> Connected Assets</CardTitle>
            <CardDescription>Manage your Google Business Profiles and digital footprint links.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Google Business Profiles</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isGbpLoading ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : gbps?.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">No profiles connected</TableCell></TableRow>
                    ) : (
                      gbps?.map(gbp => (
                        <TableRow key={gbp.id}>
                          <TableCell className="font-medium">{gbp.businessName}</TableCell>
                          <TableCell><Badge variant={gbp.isVerified ? "default" : "destructive"}>{gbp.isVerified ? "Verified" : "Unverified"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveGbp(gbp.id)} data-testid={`button-remove-gbp-${gbp.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Websites & Links</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isWebsitesLoading ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : websites?.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">No websites connected</TableCell></TableRow>
                    ) : (
                      websites?.map(site => (
                        <TableRow key={site.id}>
                          <TableCell className="font-medium truncate max-w-[200px]">{site.url}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{site.linkType}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveWebsite(site.id)} data-testid={`button-remove-website-${site.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <ChangePasswordCard />

      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" /> Change Password
        </CardTitle>
        <CardDescription>Update the password you use to sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md" data-testid="form-change-password">
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-medium">Current Password</label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              data-testid="input-current-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              data-testid="input-new-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              data-testid="input-confirm-password"
            />
          </div>
          <Button type="submit" disabled={submitting} data-testid="button-change-password">
            {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</>) : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
