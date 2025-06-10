import { Switch, Route } from "wouter";
// 1. Importa 'lazy' y 'Suspense' de React
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
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

// La importación lazy se mantiene igual
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

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <div className="flex h-screen bg-slate-50">
          <Sidebar />
          <div className="lg:pl-72 flex flex-col flex-1">
            {/* 2. Envuelve el Switch que contiene la ruta lazy en Suspense */}
            <Suspense fallback={<Loading />}>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/content" component={Content} />
                <Route path="/playlists" component={Playlists} />
                <Route path="/playlist/:id" component={PlaylistDetail} />
                <Route path="/screens" component={Screens} />
                <Route path="/alerts" component={Alerts} />
                <Route path="/scheduling" component={Scheduling} />
                <Route path="/widgets" component={Widgets} />
                <Route path="/deployment" component={Deployment} />
                <Route path="/settings" component={Settings} />
                <Route path="/analytics" component={Analytics} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </div>
        </div>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="xcientv-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;