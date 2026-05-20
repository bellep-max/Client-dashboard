import React from "react";
import { Link } from "wouter";
import { SignUp, Show } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Bot, LineChart, ShieldCheck, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border py-4 px-6 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">
            AE
          </div>
          <span className="font-bold tracking-tight text-lg">AEO Platform</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            data-testid="button-theme-toggle"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Main: Split Layout */}
      <main className="flex-1 grid lg:grid-cols-2 min-h-0">

        {/* Left: Marketing */}
        <div className="flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20 w-fit">
            <Bot className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">Answer Engine Optimization</span>
          </div>

          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Command your<br />
            visibility in{" "}
            <span className="text-primary">AI search</span>.
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed">
            When customers ask ChatGPT, Gemini, or Perplexity about businesses like yours, make sure you are the answer.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">AI Keyword Intelligence</p>
                <p className="text-muted-foreground text-sm">Discover exactly what people ask AI about your industry.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <LineChart className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Bi-Weekly Reports</p>
                <p className="text-muted-foreground text-sm">Track your efficiency score and visibility trends over time.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Profile Authority</p>
                <p className="text-muted-foreground text-sm">Connect GBP and backlinks to feed AI models verified facts.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sign Up Form */}
        <div className="flex items-center justify-center px-6 py-12 lg:py-0 bg-card border-l border-border">
          <div className="w-full max-w-md">
            <Show when="signed-out">
              <SignUp
                routing="hash"
                signInUrl={`${basePath}/sign-in`}
                forceRedirectUrl={`${basePath}/dashboard`}
              />
            </Show>
            <Show when="signed-in">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You are already signed in.</p>
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            </Show>
          </div>
        </div>
      </main>
    </div>
  );
}
