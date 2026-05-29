import React from "react";
import { useTheme } from "@/hooks/use-theme";
import {
  Switch,
  Route,
  useLocation,
  Router as WouterRouter,
  Redirect,
} from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import KeywordsPage from "@/pages/keywords";
import KeywordDetailPage from "@/pages/keyword-detail";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import OnboardingPage from "@/pages/onboarding";
import SignInPage from "@/pages/sign-in";
import CampaignsPage from "@/pages/campaigns";
import CampaignDetailPage from "@/pages/campaign-detail";
import BusinessesPage from "@/pages/businesses";
import BusinessDetailPage from "@/pages/business-detail";
import RankingsBiWeeklyPage from "@/pages/rankings-bi-weekly";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!user) return <Redirect to="/sign-in" />;
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function HomeRedirect() {
  const { user, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function OnboardingRoute() {
  const { user, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!user) return <Redirect to="/sign-in" />;
  return <OnboardingPage />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up">
        <Redirect to="/sign-in" />
      </Route>
      <Route path="/onboarding" component={OnboardingRoute} />
      <Route
        path="/dashboard"
        component={() => <ProtectedRoute component={DashboardPage} />}
      />
      <Route
        path="/keywords"
        component={() => <ProtectedRoute component={KeywordsPage} />}
      />
      <Route
        path="/keywords/:id"
        component={() => <ProtectedRoute component={KeywordDetailPage} />}
      />
      <Route
        path="/businesses"
        component={() => <ProtectedRoute component={BusinessesPage} />}
      />
      <Route
        path="/businesses/:id"
        component={() => <ProtectedRoute component={BusinessDetailPage} />}
      />
      <Route
        path="/campaigns"
        component={() => <ProtectedRoute component={CampaignsPage} />}
      />
      <Route
        path="/campaigns/:id"
        component={() => <ProtectedRoute component={CampaignDetailPage} />}
      />
      <Route
        path="/reports"
        component={() => <ProtectedRoute component={ReportsPage} />}
      />
      <Route
        path="/rankings/bi-weekly"
        component={() => <ProtectedRoute component={RankingsBiWeeklyPage} />}
      />
      <Route
        path="/settings"
        component={() => <ProtectedRoute component={SettingsPage} />}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useTheme();

  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </QueryClientProvider>
      </WouterRouter>
      <Toaster />
      <SonnerToaster position="top-right" richColors closeButton theme="dark" />
    </TooltipProvider>
  );
}

export default App;
