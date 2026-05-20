import React from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { LayoutDashboard, Key, BarChart3, Bot, Settings, Sun, Moon, Plus } from "lucide-react";
import { useGetMyBusiness } from "@workspace/api-client-react";
import { useTheme } from "@/hooks/use-theme";

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

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/keywords", label: "Keywords", icon: Key },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/agent", label: "AI Agent", icon: Bot },
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
            {business && (
              <span className="text-xs text-muted-foreground truncate block">{business.businessName}</span>
            )}
          </div>
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
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}

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
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-md" } }} />
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-medium truncate">{business?.ownerName || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{business?.businessName || "No business yet"}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
