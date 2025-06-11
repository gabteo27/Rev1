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
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>ID de pantalla no especificado</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/screens')}>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando pantalla...</p>
        </div>
      </div>
    );
  }

  if (error || !screen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>No se pudo cargar la información de la pantalla</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
            <Button onClick={() => navigate('/screens')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Pantallas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'min-h-screen bg-gray-50'}`}>
      {!isFullscreen && (
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-6 bg-white rounded-lg shadow-sm border px-6 py-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/screens')} className="hover:bg-gray-100">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>

                <div className="flex items-center gap-3 px-3 border-l border-gray-200">
                  <Monitor className="w-5 h-5 text-blue-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      {screen.name}
                    </h1>
                    <p className="text-sm text-gray-500">
                      {screen.location || 'Ubicación no especificada'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-3 border-l border-gray-200">
                  <Badge variant={screen.isOnline ? "default" : "destructive"} className="text-xs">
                    {screen.isOnline ? 'En línea' : 'Desconectada'}
                  </Badge>
                  {playlist && (
                    <Badge variant="outline" className="text-xs">
                      {playlist.name}
                    </Badge>
                  )}
                </div>

                <div className="border-l border-gray-200 pl-3">
                  <Button variant="outline" size="sm" onClick={toggleFullscreen} className="hover:bg-gray-100">
                    <FullscreenIcon className="w-4 h-4 mr-2" />
                    Pantalla Completa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`${isFullscreen ? 'w-full h-full' : 'p-6'}`}>
        <div className={`${isFullscreen ? 'w-full h-full' : 'max-w-6xl mx-auto'}`}>
          {screen.playlistId && playlist ? (
            <div className={`${isFullscreen ? 'w-full h-full' : 'bg-white rounded-lg shadow-sm border overflow-hidden'}`}>
              <ContentPlayer 
                screenId={screenId}
                playlistId={screen.playlistId}
                isPreview={false}
                className={isFullscreen ? "w-full h-full" : "w-full aspect-video"}
              />
            </div>
          ) : (
            <div className={`${isFullscreen ? 'w-full h-full' : 'w-full aspect-video bg-white rounded-lg shadow-sm border'} flex items-center justify-center`}>
              <div className="text-center">
                <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl mb-2 text-gray-700">Sin contenido asignado</h3>
                <p className="text-gray-500">Esta pantalla no tiene una playlist asignada</p>
              </div>
            </div>
          )}
        </div>

        {!isFullscreen && screen.playlistId && playlist && (
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información de Reproducción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Playlist actual:</span>
                  <span className="font-medium">{playlist.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Duración total:</span>
                  <span>{Math.round((playlist.totalDuration || 0) / 60)} minutos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Elementos:</span>
                  <span>{playlist.items?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {isFullscreen && (
        <div className="absolute top-4 right-4 z-20">
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            Salir de Pantalla Completa
          </Button>
        </div>
      )}
    </div>
  );
}