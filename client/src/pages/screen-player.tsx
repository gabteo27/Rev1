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

  const { data: screen, isLoading, error } = useQuery({
    queryKey: [`/api/screens/${screenId}`],
    enabled: !!screenId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Use playlist from URL params if provided, otherwise use screen's playlist
  const effectivePlaylistId = playlistIdParam || screen?.playlistId;

  if (isLoading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
          <p>Cargando contenido...</p>
        </div>
      </div>
    );
  }

  if (error || (!screen && !playlistIdParam)) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-2">Error al cargar la pantalla</p>
          <p className="text-sm opacity-75">{error?.message || 'Pantalla no encontrada'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!effectivePlaylistId) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-2">Sin contenido asignado</p>
          <p className="text-sm opacity-75">Esta pantalla no tiene una playlist asignada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black">
      <ContentPlayer 
        screenId={screen?.id || parseInt(screenId || '0')}
        playlistId={effectivePlaylistId}
        isPreview={isPreview}
        className="w-full h-full"
      />
    </div>
  );
}