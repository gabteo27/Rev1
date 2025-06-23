import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, RefreshCw, AlertTriangle } from "lucide-react";
import ContentPlayer from '@/components/player/ContentPlayer';
import { apiRequest } from '@/lib/queryClient'; // ✅ Asegúrate de importar apiRequest

export default function ScreenPlayerPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const screenId = urlParams.get('screenId');
  const playlistIdParam = urlParams.get('playlistId');
  const isPreview = urlParams.get('preview') === 'true';

  const { data: screen, isLoading: screenLoading, error: screenError } = useQuery({
    queryKey: ['/api/screens', screenId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/screens/${screenId}`);
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Screen ${screenId} not found`);
            return null;
          }
          throw new Error(`Screen error: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.warn('Screen loading failed:', error);
        return null;
      }
    },
    enabled: !!screenId,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use playlist from URL params if provided, otherwise use screen's playlist
  const effectivePlaylistId = playlistIdParam || screen?.playlistId;

  // If no screen ID provided
  if (!screenId) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl mb-2">ID de pantalla requerido</h2>
          <p className="text-sm opacity-75">No se proporcionó un ID de pantalla válido</p>
        </div>
      </div>
    );
  }

  // If screen loaded but no playlist assigned
  if (screen && !effectivePlaylistId) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <Tv className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl mb-2">Sin playlist asignada</h2>
          <p className="text-sm opacity-75 mb-2">Pantalla: {screen.name}</p>
          <p className="text-xs opacity-50">Asigna una playlist desde el panel de administración</p>
        </div>
      </div>
    );
  }

  // Render the content player
  return (
    <div className="fixed inset-0 w-full h-full bg-black">
      <ContentPlayer 
        playlistId={effectivePlaylistId} 
        isPreview={isPreview}
      />
    </div>
  );
}