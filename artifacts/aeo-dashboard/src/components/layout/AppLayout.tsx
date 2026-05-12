import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { UserButton, useUser } from "@clerk/react";
import { LayoutDashboard, Key, BarChart3, Bot, Settings } from "lucide-react";
import { useGetMyBusiness } from "@workspace/api-client-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: business, isLoading } = useGetMyBusiness();

  useEffect(() => {
    if (!isLoading && business && !business.onboardingComplete && location !== "/onboarding") {
      setLocation("/onboarding");
    } else if (!isLoading && !business && location !== "/onboarding") {
      // Need onboarding
      setLocation("/onboarding");
    }
  }, [business, isLoading, location, setLocation]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/keywords", label: "Keywords", icon: Key },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/agent", label: "AI Agent", icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
            AE
          </div>
          <span className="font-semibold tracking-tight">AEO Platform</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <Link href="/settings">
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                location === "/settings"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              data-testid="nav-settings"
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium text-sm">Settings</span>
            </div>
          </Link>
          <div className="mt-4 flex items-center gap-3 px-3 py-2">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-md" } }} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-medium truncate">{business?.ownerName || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{business?.businessName || "No Business"}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
