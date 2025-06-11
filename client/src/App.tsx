import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense, type PropsWithChildren } from "react";
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
import ScreenPlayer from "@/pages/screen-player";
import { SidebarProvider } from "@/components/ui/sidebar";

const PlaylistDetail = lazy(() => import("./pages/playlist-detail"));

const Loading = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-slate-600">Cargando...</p>
    </div>
  </div>
);

// ✅ Componente para el layout principal del panel de administración
const AdminLayout = ({ children }: PropsWithChildren) => (
  <div className="flex h-screen bg-slate-50 dark:bg-background">
    <Sidebar />
    <div className="lg:pl-sidebar flex-1 flex flex-col overflow-hidden">
      <Suspense fallback={<Loading />}>
        {children}
      </Suspense>
    </div>
  </div>
);

// ✅ Componente que renderiza las rutas protegidas si el usuario está autenticado
const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  // Si el usuario está autenticado, muestra el layout del admin con sus rutas internas
  if (isAuthenticated) {
    return (
      <AdminLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
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
          {/* La ruta de /screen-player ya no está aquí */}
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    );
  }

  // Si no está autenticado, muestra las rutas públicas
  return (
    <Switch>
      <Route path="/" component={Landing} />
      {/* Si intentan acceder a otra ruta sin estar logueado, los mandamos al landing */}
      <Route path="/:rest*">
        <Redirect to="/" />
      </Route>
    </Switch>
  );
};


// ✅ El componente App principal ahora tiene una estructura de enrutamiento de alto nivel
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="xcientv-ui-theme">
        <TooltipProvider>
          <SidebarProvider>
            <Toaster />
            <Switch>
              {/* Ruta especial para el reproductor, siempre disponible y sin layout */}
              <Route path="/screen-player" component={ScreenPlayer} />

              {/* Todas las demás rutas son manejadas por AppRoutes */}
              <Route path="/:rest*">
                <AppRoutes />
              </Route>
            </Switch>
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;