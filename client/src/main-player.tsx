
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import PlayerPage from "./pages/player";
import "./index.css";

// Renderiza únicamente la página del reproductor con todos los providers necesarios
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="xcientv-ui-theme">
      <TooltipProvider>
        <Toaster />
        <PlayerPage />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
