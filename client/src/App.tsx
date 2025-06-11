
import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Content from "@/pages/content";
import Playlists from "@/pages/playlists";
import Screens from "@/pages/screens";
import Alerts from "@/pages/alerts";
import Scheduling from "@/pages/scheduling";
import Widgets from "@/pages/widgets";
import Deployment from "@/pages/deployment";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Settings from "@/pages/settings";
import Analytics from "@/pages/analytics";
import { SidebarProvider } from "@/components/ui/sidebar";

const PlaylistDetail = lazy(() => import("./pages/playlist-detail"));

// Componente de fallback para Suspense
function Loading() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Cargando...</p>
      </div>
    </div>
  );
}

// Componente que maneja el contenido autenticado
function AuthenticatedApp() {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/content" component={Content} />
            <Route path="/playlists" component={Playlists} />
            <Route path="/playlists/:id">
              {(params) => (
                <Suspense fallback={<Loading />}>
                  <PlaylistDetail id={params.id} />
                </Suspense>
              )}
            </Route>
            <Route path="/screens" component={Screens} />
            <Route path="/alerts" component={Alerts} />
            <Route path="/scheduling" component={Scheduling} />
            <Route path="/widgets" component={Widgets} />
            <Route path="/deployment" component={Deployment} />
            <Route path="/settings" component={Settings} />
            <Route path="/analytics" component={Analytics} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </SidebarProvider>
  );
}

// Componente principal de la aplicación
function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="xcientv-theme">
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
