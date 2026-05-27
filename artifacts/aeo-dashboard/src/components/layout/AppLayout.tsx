import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Key, BarChart3, Settings, Sun, Moon, Plus, LogOut, Building2, Check, User } from "lucide-react";
import { useGetMyBusiness, useListBusinesses, useSwitchBusiness } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 px-3 py-2 rounded-md w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      data-testid="button-theme-toggle"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span className="font-medium text-sm">{isDark ? "Light Mode" : "Dark Mode"}</span>
    </button>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: business } = useGetMyBusiness();
  const { data: businesses } = useListBusinesses();
  const switchBusiness = useSwitchBusiness();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/keywords", label: "Keywords", icon: Key },
    { href: "/reports", label: "Reports", icon: BarChart3 },
  ];

  const handleSwitchBusiness = (businessId: number) => {
    if (businessId === business?.id) return;
    switchBusiness.mutate(
      { data: { businessId } },
      { onSuccess: () => queryClient.invalidateQueries() }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            AE
          </div>
          <div className="flex-1 overflow-hidden">
            <span className="font-semibold tracking-tight block truncate">AEO Platform</span>
            {business && (
              <span className="text-xs text-muted-foreground truncate block">{business.businessName}</span>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}

          {businesses && businesses.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border">
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Businesses
              </p>
              {businesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => handleSwitchBusiness(biz.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-left ${
                    biz.isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={`nav-business-${biz.id}`}
                  disabled={switchBusiness.isPending}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm truncate flex-1">{biz.businessName}</span>
                  {biz.isActive && <Check className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          <div className="pt-2 mt-2 border-t border-border">
            <Link href="/onboarding?new=1">
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid="nav-add-business"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium text-sm">Add Business</span>
              </div>
            </Link>
          </div>
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

          <ThemeToggle />

          <div className="mt-2 flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.name || business?.ownerName || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email || business?.businessName || ""}</span>
            </div>
            <button
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Sign out"
              data-testid="button-sign-out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
