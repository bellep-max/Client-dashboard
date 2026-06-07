import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Key,
  BarChart3,
  Settings,
  Sun,
  Moon,
  LogOut,
  Building2,
  User,
  Megaphone,
  CalendarClock,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { listKeywordsAdminShape, type PortalKeyword } from "@/lib/portal-api";

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
  const { user, signOut } = useAuth();

  const { data: keywords } = useQuery<PortalKeyword[]>({
    queryKey: ["portal", "keywords"],
    queryFn: () => listKeywordsAdminShape(),
    staleTime: 60_000,
  });
  const lockedCount = (keywords ?? []).filter((k) => k.isLocked).length;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: lockedCount > 0 ? lockedCount : 0 },
    { href: "/businesses", label: "Businesses", icon: Building2, badge: 0 },
    { href: "/campaigns", label: "Campaigns", icon: Megaphone, badge: 0 },
    { href: "/reports", label: "Reports", icon: BarChart3, badge: 0 },
    { href: "/rankings/bi-weekly", label: "Bi-Weekly", icon: CalendarClock, badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            AE
          </div>
          <div className="flex-1 overflow-hidden">
            <span className="font-semibold tracking-tight block truncate">AEO Platform</span>
            <span className="text-xs text-muted-foreground truncate block">Customer Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/dashboard" && location.startsWith(`${item.href}/`));
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
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {item.badge}
                    </span>
                  )}
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

          <ThemeToggle />

          <div className="mt-2 flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.name || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email || ""}</span>
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
