
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

  // Auto fullscreen on load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(console.error);
        setIsFullscreen(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl">ID de pantalla no especificado</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando pantalla...</p>
        </div>
      </div>
    );
  }

  if (error || !screen) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Error al cargar la pantalla</p>
          <p className="opacity-75">No se pudo conectar con la pantalla</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      {screen.playlistId && playlist ? (
        <ContentPlayer 
          screenId={screenId}
          playlistId={screen.playlistId}
          isPreview={true}
          className="w-full h-full"
        />
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
