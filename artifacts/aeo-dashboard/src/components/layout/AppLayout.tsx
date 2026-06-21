import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  Sun,
  Moon,
  LogOut,
  Building2,
  User,
  Megaphone,
  Trophy,
  Activity,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getRotationStatus, type RotationStatus } from "@/lib/portal-api";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/** Top-right account menu — mirrors the admin portal: name + email, Settings,
 *  dark-mode toggle, and sign out, all under one avatar dropdown. */
function AccountMenu() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
          data-testid="button-account-menu"
        >
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">
            {user?.name || "User"}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium truncate">
            {user?.name || "User"}
          </span>
          <span className="text-xs font-normal text-muted-foreground truncate">
            {user?.email || ""}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => setLocation("/settings")}
          data-testid="menu-settings"
        >
          <Settings className="w-4 h-4 mr-2" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            toggleTheme();
          }}
          data-testid="menu-theme-toggle"
        >
          {isDark ? (
            <Sun className="w-4 h-4 mr-2" />
          ) : (
            <Moon className="w-4 h-4 mr-2" />
          )}
          {isDark ? "Light Mode" : "Dark Mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={signOut}
          className="text-destructive focus:text-destructive"
          data-testid="button-sign-out"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const { data: rotation } = useQuery<RotationStatus>({
    queryKey: ["portal", "insights", "rotation-status"],
    queryFn: () => getRotationStatus(),
    staleTime: 60_000,
  });
  const lockedCount = rotation?.summary.locked ?? 0;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: 0 },
    { href: "/businesses", label: "Businesses", icon: Building2, badge: 0 },
    { href: "/campaigns", label: "Campaigns", icon: Megaphone, badge: 0 },
    { href: "/optimization", label: "Optimization", icon: Activity, badge: 0 },
    {
      href: "/locked-keywords",
      label: "Won Keywords",
      icon: Trophy,
      badge: lockedCount > 0 ? lockedCount : 0,
    },
    { href: "/reports", label: "Reports", icon: BarChart3, badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            AE
          </div>
          <div className="flex-1 overflow-hidden">
            <span className="font-semibold tracking-tight block truncate">
              AEO Platform
            </span>
            <span className="text-xs text-muted-foreground truncate block">
              Customer Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/dashboard" &&
                location.startsWith(`${item.href}/`));
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
                  <span className="font-medium text-sm flex-1">
                    {item.label}
                  </span>
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
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-end px-4 shrink-0">
          <AccountMenu />
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
