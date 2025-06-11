
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
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'min-h-screen'}`}>
      {!isFullscreen && (
        <div className="sticky top-0 z-10 bg-background border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/screens')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  {screen.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {screen.location || 'Ubicación no especificada'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={screen.isOnline ? "default" : "destructive"}>
                {screen.isOnline ? 'En línea' : 'Desconectada'}
              </Badge>
              {playlist && (
                <Badge variant="outline">
                  {playlist.name}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                <FullscreenIcon className="w-4 h-4 mr-2" />
                Pantalla Completa
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={`${isFullscreen ? 'w-full h-full' : 'container mx-auto p-4'}`}>
        <div className={`${isFullscreen ? 'w-full h-full' : 'aspect-video'} bg-black rounded-lg overflow-hidden`}>
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
                <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl mb-2">Sin contenido asignado</h3>
                <p className="opacity-75">Esta pantalla no tiene una playlist asignada</p>
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
