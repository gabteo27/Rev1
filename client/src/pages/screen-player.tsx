import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, ArrowLeft, FullscreenIcon, RefreshCw } from "lucide-react";
import ContentPlayer from '@/components/player/ContentPlayer';

export default function ScreenPlayerPage() {
  const [, navigate] = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get screen ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const screenId = urlParams.get('screenId');

  // Fetch screen data
  const { data: screen, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/screens/${screenId}`],
    enabled: !!screenId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch screen's current playlist
  const { data: playlist } = useQuery({
    queryKey: [`/api/playlists/${screen?.playlistId}`],
    enabled: !!screen?.playlistId,
    refetchInterval: 5000,
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Card className="w-96 bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Error</CardTitle>
            <CardDescription className="text-gray-300">ID de pantalla no especificado</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/screens')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Pantallas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando pantalla...</p>
        </div>
      </div>
    );
  }

  if (error || !screen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Card className="w-96 bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Error</CardTitle>
            <CardDescription className="text-gray-300">No se pudo cargar la información de la pantalla</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
            <Button onClick={() => navigate('/screens')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Pantallas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      {!isFullscreen && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-6 bg-black/60 rounded-lg border border-gray-700 px-6 py-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/screens')} className="text-white hover:bg-gray-800">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>

                <div className="flex items-center gap-3 px-3 border-l border-gray-600">
                  <Monitor className="w-5 h-5 text-blue-400" />
                  <div>
                    <h1 className="text-lg font-semibold text-white">
                      {screen.name}
                    </h1>
                    <p className="text-sm text-gray-400">
                      {screen.location || 'Ubicación no especificada'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-3 border-l border-gray-600">
                  <Badge variant={screen.isOnline ? "default" : "destructive"} className="text-xs">
                    {screen.isOnline ? 'En línea' : 'Desconectada'}
                  </Badge>
                  {playlist && (
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {playlist.name}
                    </Badge>
                  )}
                </div>

                <div className="border-l border-gray-600 pl-3">
                  <Button variant="outline" size="sm" onClick={toggleFullscreen} className="border-gray-600 text-gray-300 hover:bg-gray-800">
                    <FullscreenIcon className="w-4 h-4 mr-2" />
                    Pantalla Completa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full h-full">
        {screen.playlistId && playlist ? (
          <div className="w-full h-full">
            <ContentPlayer 
              screenId={screenId}
              playlistId={screen.playlistId}
              isPreview={false}
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white">
              <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl mb-2">Sin contenido asignado</h3>
              <p className="text-gray-400">Esta pantalla no tiene una playlist asignada</p>
            </div>
          </div>
        )}
      </div>

      {isFullscreen && (
        <div className="absolute top-4 right-4 z-20">
          <Button variant="outline" size="sm" onClick={toggleFullscreen} className="bg-black/60 border-gray-600 text-white hover:bg-black/80">
            Salir de Pantalla Completa
          </Button>
        </div>
      )}
    </div>
  );
}