import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Square, 
  Maximize, 
  Clock,
  Thermometer
} from "lucide-react";

export default function LivePreview() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Get active playlist data
  const { data: playlists } = useQuery({
    queryKey: ["/api/playlists"],
    retry: false,
  });

  const activePlaylist = playlists?.find((p: any) => p.isActive);

  const { data: playlistData } = useQuery({
    queryKey: ["/api/playlists", activePlaylist?.id],
    enabled: !!activePlaylist?.id,
    retry: false,
  });

  const currentItem = playlistData?.items?.[currentItemIndex];
  const nextItem = playlistData?.items?.[currentItemIndex + 1] || playlistData?.items?.[0];

  // Simulate playback timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentItem) {
      const duration = currentItem.customDuration || currentItem.contentItem.duration || 30;
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newProgress = (elapsed / duration) * 100;
        const remaining = Math.max(0, duration - elapsed);
        
        setProgress(Math.min(newProgress, 100));
        setTimeRemaining(Math.ceil(remaining));
        
        if (elapsed >= duration) {
          // Move to next item
          const nextIndex = currentItemIndex + 1;
          if (nextIndex < playlistData.items.length) {
            setCurrentItemIndex(nextIndex);
          } else {
            setCurrentItemIndex(0);
          }
          setProgress(0);
        }
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentItem, currentItemIndex, playlistData]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentItemIndex(0);
    setTimeRemaining(0);
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  };

  const renderPreviewContent = () => {
    if (!currentItem) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium">Sin contenido</p>
            <p className="text-sm opacity-75">Selecciona una playlist activa</p>
          </div>
        </div>
      );
    }

    const content = currentItem.contentItem;

    switch (content.type) {
      case "image":
        return (
          <img 
            src={content.url} 
            alt={content.title}
            className="w-full h-full object-cover"
          />
        );
      case "video":
        return (
          <video 
            src={content.url} 
            className="w-full h-full object-cover"
            autoPlay={isPlaying}
            muted
            loop={false}
          />
        );
      case "webpage":
        return (
          <iframe
            src={content.url}
            className="w-full h-full border-0"
            title={content.title}
          />
        );
      default:
        return (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-4xl font-bold mb-2">{content.title}</div>
              <div className="text-lg opacity-75">{content.type.toUpperCase()}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Vista Previa</h3>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlay}
              disabled={!currentItem || isPlaying}
              className="text-green-600 hover:text-green-700"
            >
              <Play className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePause}
              disabled={!isPlaying}
              className="text-yellow-600 hover:text-yellow-700"
            >
              <Pause className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStop}
              disabled={!isPlaying && progress === 0}
              className="text-red-600 hover:text-red-700"
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-600 hover:text-slate-700"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="aspect-video bg-slate-100 rounded-lg relative overflow-hidden">
          {renderPreviewContent()}
          
          {/* Widget overlays */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg">
            <div className="text-lg font-bold">{getCurrentTime()}</div>
            <div className="text-sm">{getCurrentDate()}</div>
          </div>
          
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg">
            <div className="flex items-center">
              <Thermometer className="w-4 h-4 mr-2" />
              <span>24°C - Soleado</span>
            </div>
          </div>
          
          {/* Progress bar */}
          {isPlaying && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50">
              <div 
                className="bg-blue-500 h-1 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          {/* Status overlay when not playing */}
          {!isPlaying && currentItem && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-center text-white">
                <Play className="w-12 h-12 mx-auto mb-2 opacity-75" />
                <p className="text-lg font-medium">Reproducción pausada</p>
              </div>
            </div>
          )}
        </div>
        
        {currentItem && (
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-600 mb-1">
              Elemento actual: <span className="font-medium">{currentItem.contentItem.title}</span>
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
              {isPlaying && (
                <span>{timeRemaining}s restantes</span>
              )}
              {nextItem && (
                <span>Siguiente: {nextItem.contentItem.title}</span>
              )}
            </div>
          </div>
        )}
        
        {/* Playlist info */}
        {activePlaylist && (
          <div className="mt-3 text-center">
            <Badge variant="outline" className="text-xs">
              {activePlaylist.name}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
