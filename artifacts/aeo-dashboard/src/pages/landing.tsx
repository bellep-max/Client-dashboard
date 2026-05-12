import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, LineChart, Target, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border py-4 px-6 flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground">
            AE
          </div>
          <span className="font-bold tracking-tight text-lg">AEO Platform</span>
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="py-24 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Answer Engine Optimization for Local Business</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6">
            Command your visibility in <span className="text-primary">AI search</span>.
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mb-10">
            When customers ask AI agents about businesses like yours, ensure you are the answer. AEO Platform gives you the data, strategy, and tools to win the AI search revolution.
          </p>

          <Link href="/sign-up">
            <Button size="lg" className="h-14 px-8 text-lg font-medium group">
              Start Optimizing
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-card border-y border-border">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-border bg-background">
              <Bot className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">AI-Driven Keywords</h3>
              <p className="text-muted-foreground">Discover the exact questions and long-tail phrases users are asking AI assistants about your industry.</p>
            </div>
            
            <div className="p-6 rounded-xl border border-border bg-background">
              <LineChart className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Visibility Tracking</h3>
              <p className="text-muted-foreground">Monitor your efficiency score and track how often you appear in AI-generated answers over time.</p>
            </div>
            
            <div className="p-6 rounded-xl border border-border bg-background">
              <ShieldCheck className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Profile Authority</h3>
              <p className="text-muted-foreground">Connect your Google Business Profile and backlinks to feed AI models the verifiable facts they crave.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 text-center text-muted-foreground border-t border-border">
        <p>&copy; {new Date().getFullYear()} AEO Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
