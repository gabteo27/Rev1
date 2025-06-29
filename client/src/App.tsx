import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense, useEffect, type PropsWithChildren } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Content from "./pages/content";
import MediaLibrary from "./pages/media-library";
import Playlists from "@/pages/playlists";
import Screens from "@/pages/screens";
import Alerts from "@/pages/alerts";
import Scheduling from "@/pages/scheduling";
import Widgets from "@/pages/widgets";
import Deployment from "@/pages/deployment";
import NotFound from "@/pages/not-found";
import AppSidebar from "@/components/layout/sidebar";
import Settings from "@/pages/settings";
import Analytics from "@/pages/analytics";
import ScreenPlayer from "@/pages/screen-player";
import { SidebarProvider } from "@/components/ui/sidebar";
import { wsManager } from "@/lib/websocket";

const PlaylistDetail = lazy(() => import("./pages/playlist-detail"));
// Added MediaLibrary import

const Loading = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-slate-600">Cargando...</p>
    </div>
  </div>
);

// Componente para el layout principal del panel de administración
const AdminLayout = ({ children }: PropsWithChildren) => (
  <SidebarProvider>
    <div className="flex h-screen bg-slate-50 dark:bg-background">
      <AppSidebar />
      <div className="lg:pl-sidebar flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={<Loading />}>
          {children}
        </Suspense>
      </div>
    </div>
  </SidebarProvider>
);

// Component interno que maneja la autenticación
const AppContent = () => {
  const { isAuthenticated, isLoading, error } = useAuth();

  useEffect(() => {
    // Initialize WebSocket connection with error handling
    const initializeWebSocket = async () => {
      try {
        await wsManager.connect();
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        // Continue without WebSocket - app should still work
      }
    };

    initializeWebSocket();

    return () => {
      wsManager.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      wsManager.disconnect();
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent the default browser behavior
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Show loading state
  if (isLoading) {
    return <Loading />;
  }

  // If there's an authentication error, redirect to login
  if (error && !isAuthenticated) {
    console.error('Authentication error:', error);
    // Redirect to login
    window.location.href = '/api/login';
    return <Loading />;
  }

  return (
    <Switch>
      <Route path="/screen-player" component={ScreenPlayer} />
      {isAuthenticated ? (
        <AdminLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/content" component={Content} />
            <Route path="/media-library" component={MediaLibrary} />
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
        </AdminLayout>
      ) : (
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/:rest*">
            <Redirect to="/" />
          </Route>
        </Switch>
      )}
    </Switch>
  );
};



function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="xcientv-ui-theme">
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;