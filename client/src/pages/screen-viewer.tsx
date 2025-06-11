

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from "lucide-react";
import ContentPlayer from '@/components/player/ContentPlayer';

export default function ScreenViewerPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Get screen ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const screenId = urlParams.get('screenId');

  // Fetch screen data
  const { data: screen, isLoading, error } = useQuery({
    queryKey: [`/api/screens/${screenId}`],
    enabled: !!screenId,
    refetchInterval: 5000,
  });

  // Fetch screen's current playlist
  const { data: playlist } = useQuery({
    queryKey: [`/api/playlists/${screen?.playlistId}`],
    enabled: !!screen?.playlistId,
    refetchInterval: 5000,
  });

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!screenId) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl">ID de pantalla no especificado</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando pantalla...</p>
        </div>
      </div>
    );
  }

  if (error || !screen) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Error al cargar la pantalla</p>
          <p className="opacity-75">No se pudo conectar con la pantalla</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      {screen.playlistId && playlist ? (
        <div className="w-full h-full flex items-center justify-center">
          <ContentPlayer 
            screenId={screenId}
            playlistId={screen.playlistId}
            isPreview={true}
            className="w-full h-full max-w-full max-h-full object-contain"
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          <div className="text-center">
            <h3 className="text-2xl mb-4 opacity-75">Sin contenido asignado</h3>
            <p className="opacity-50">Esta pantalla no tiene una playlist asignada</p>
          </div>
        </div>
      )}
    </div>
  );
}
