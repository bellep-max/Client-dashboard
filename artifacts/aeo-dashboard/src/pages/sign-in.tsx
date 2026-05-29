import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGoogleClientId,
  waitForGoogleScript,
  type GoogleCredentialResponse,
} from "@/lib/google";

type Step = "email" | "code";

const ADMIN_ROLES = new Set(["admin", "owner"]);

function redirectAdminIfNeeded(role: string | undefined): boolean {
  if (!role || !ADMIN_ROLES.has(role)) return false;
  const adminUrl = import.meta.env.VITE_ADMIN_URL || null;
  if (adminUrl) {
    window.location.href = adminUrl;
  } else {
    // No admin URL configured — tell the user instead of stranding them on a
    // blank portal they aren't allowed to use.
    toast.error(
      "Admin accounts sign in from the admin dashboard, not the portal.",
    );
  }
  return true;
}

export default function SignInPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const googleClientId = getGoogleClientId();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not send a code. Please try again.");
        return;
      }
      setStep("code");
      setCode("");
      toast.success("We emailed you a 6-digit sign-in code.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (value: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Invalid code.");
        setCode("");
        return;
      }
      if (redirectAdminIfNeeded(data?.role)) return;
      await refetch();
      setLocation("/dashboard");
    } catch {
      // Clear the field so the user can retry — otherwise the OTP stays full
      // and the auto-submit effect won't re-fire.
      setCode("");
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit once all 6 digits are entered.
  useEffect(() => {
    if (step === "code" && code.length === 6 && !loading) {
      void handleVerifyCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current || step !== "email") return;
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
        if (redirectAdminIfNeeded(data?.role)) return;
        await refetch();
        setLocation("/dashboard");
      } catch {
        toast.error("Something went wrong with Google sign-in.");
      }
    };

    waitForGoogleScript()
      .then((gid) => {
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
        // Script blocked or offline — email code flow still works.
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId, refetch, setLocation, step]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center font-bold text-primary-foreground text-xl">
            AE
          </div>
          <span className="font-bold tracking-tight text-2xl">
            AEO Platform
          </span>
        </div>

        {step === "email" ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a sign-in code.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRequestCode}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    data-testid="input-email"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="button-send-code"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Continue
                </Button>
                {googleClientId ? (
                  <>
                    <div className="flex items-center w-full gap-3 my-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        or
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div
                      ref={googleBtnRef}
                      className="flex justify-center"
                      data-testid="google-signin"
                    />
                  </>
                ) : null}
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Enter your code</CardTitle>
              <CardDescription>
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col items-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={loading}
                data-testid="input-otp"
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              {loading ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying…
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Use a different email
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
