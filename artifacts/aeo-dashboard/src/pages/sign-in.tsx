import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getGoogleClientId, waitForGoogleScript, type GoogleCredentialResponse } from "@/lib/google";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const googleClientId = getGoogleClientId();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Sign in failed");
        return;
      }
      // Admin or owner accounts that sign in via the portal get bounced to the
      // separate admin CloudFront distribution (configured via VITE_ADMIN_URL).
      if (data?.role === "admin" || data?.role === "owner") {
        const adminUrl = import.meta.env.VITE_ADMIN_URL || null;
        if (adminUrl) {
          window.location.href = adminUrl;
        } else {
          console.warn("Admin role detected on portal but VITE_ADMIN_URL not set");
        }
        return;
      }
      await refetch();
      setLocation("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return;
    let cancelled = false;

    const handleCredential = async (response: GoogleCredentialResponse) => {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Google sign-in failed");
          return;
        }
        if (data?.role === "admin" || data?.role === "owner") {
          const adminUrl = import.meta.env.VITE_ADMIN_URL || null;
          if (adminUrl) {
            window.location.href = adminUrl;
          } else {
            console.warn("Admin role detected on portal but VITE_ADMIN_URL not set");
          }
          return;
        }
        await refetch();
        // 201 indicates a newly created account — route through onboarding.
        setLocation(res.status === 201 ? "/onboarding" : "/dashboard");
      } catch {
        toast.error("Something went wrong with Google sign-in.");
      }
    };

    waitForGoogleScript()
      .then(gid => {
        if (cancelled || !googleBtnRef.current) return;
        gid.initialize({
          client_id: googleClientId,
          callback: handleCredential,
        });
        gid.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: 320,
        });
      })
      .catch(() => {
        // Script blocked or offline — keep the form usable without Google.
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId, refetch, setLocation]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center font-bold text-primary-foreground text-xl">
            AE
          </div>
          <span className="font-bold tracking-tight text-2xl">AEO Platform</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading} data-testid="button-sign-in">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
              {googleClientId ? (
                <>
                  <div className="flex items-center w-full gap-3 my-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div ref={googleBtnRef} className="flex justify-center" data-testid="google-signin" />
                </>
              ) : null}
              <p className="text-sm text-center text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/sign-up" className="text-primary underline underline-offset-4">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
