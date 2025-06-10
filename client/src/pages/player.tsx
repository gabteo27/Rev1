import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ContentPlayer from "@/components/player/ContentPlayer";
import { FunctionalWidget } from "@/components/widgets/functional-widget";
import type { Screen, Playlist, PlaylistItem, ContentItem, Alert, Widget } from "@shared/schema";

interface AlertOverlay {
  id: number;
  message: string;
  backgroundColor: string;
  textColor: string;
  duration: number;
  isActive: boolean;
}

export default function Player() {
  const { screenId } = useParams();
  const [location] = useLocation();
  
  // Parse search params manually
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const isFullscreen = searchParams.get("fullscreen") === "true";

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentAlert, setCurrentAlert] = useState<AlertOverlay | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: screen } = useQuery<Screen>({
    queryKey: [`/api/screens/${screenId}`],
    refetchInterval: 30000,
  });

  const { data: playlist } = useQuery<Playlist & { playlistItems: (PlaylistItem & { contentItem: ContentItem })[] }>({
    queryKey: [`/api/playlists/${screen?.playlistId}`],
    enabled: !!screen?.playlistId,
    refetchInterval: 30000,
  });

  const { data: initialWidgets } = useQuery<Widget[]>({
    queryKey: ["/api/widgets"],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!screenId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      wsRef.current?.send(JSON.stringify({
        type: 'identify_screen',
        screenId: parseInt(screenId)
      }));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'alert' && data.screenId === parseInt(screenId)) {
          setCurrentAlert(data.alert);

          // Auto-hide alert after duration (if duration > 0)
          if (data.alert.duration > 0) {
            setTimeout(() => {
              setCurrentAlert(null);
            }, data.alert.duration * 1000);
          }
        } else if (data.type === 'alert_update' && data.screenId === parseInt(screenId)) {
          if (!data.alert.isActive) {
            setCurrentAlert(null);
          }
        } else if (data.type === 'widget_update' && data.screenId === parseInt(screenId)) {
          setWidgets(prev => {
            const updated = [...prev];
            data.widgets.forEach((widget: Widget) => {
              const index = updated.findIndex(w => w.id === widget.id);
              if (index >= 0) {
                updated[index] = widget;
              } else {
                updated.push(widget);
              }
            });
            return updated;
          });
        } else if (data.type === 'widget_remove' && data.screenId === parseInt(screenId)) {
          setWidgets(prev => prev.filter(w => w.id !== data.widgetId));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      wsRef.current?.close();
    };
  }, [screenId]);

  // Initialize widgets
  useEffect(() => {
    if (initialWidgets) {
      setWidgets(initialWidgets.filter(w => w.isEnabled));
    }
  }, [initialWidgets]);

  // Content rotation logic
  const currentItem = playlist?.playlistItems[currentItemIndex];

  useEffect(() => {
    if (!currentItem || !playlist) return;

    const timer = setTimeout(() => {
      setCurrentItemIndex((prev) => 
        prev + 1 >= playlist.playlistItems.length ? 0 : prev + 1
      );
    }, currentItem.duration * 1000);

    return () => clearTimeout(timer);
  }, [currentItemIndex, currentItem, playlist]);

  const getWidgetPositionClass = (position: string) => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  if (!screen) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Cargando pantalla...</div>
      </div>
    );
  }

  if (!playlist || !currentItem) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <div className="text-white text-xl">
          {!playlist ? "Cargando contenido..." : "No hay contenido disponible"}
        </div>

        {/* Render widgets even when no content */}
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={`absolute z-20 ${getWidgetPositionClass(widget.position)}`}
          >
            <FunctionalWidget widget={widget} className="bg-white/90 backdrop-blur-sm" />
          </div>
        ))}

        {/* Alert overlay */}
        {currentAlert && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          >
            <div 
              className="max-w-4xl w-full p-8 rounded-lg text-center animate-pulse"
              style={{ 
                backgroundColor: currentAlert.backgroundColor,
                color: currentAlert.textColor 
              }}
            >
              <div className="text-3xl font-bold mb-4">⚠️ ALERTA URGENTE ⚠️</div>
              <div className="text-2xl font-medium">{currentAlert.message}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-black relative`}>
      {/* Main content */}
      <ContentPlayer
        contentItem={currentItem.contentItem}
        autoplay
      />

      {/* Widgets overlay */}
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={`absolute z-20 ${getWidgetPositionClass(widget.position)}`}
        >
          <FunctionalWidget widget={widget} className="bg-white/90 backdrop-blur-sm" />
        </div>
      ))}

      {/* Alert overlay */}
      {currentAlert && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => {
            if (currentAlert.duration === 0) {
              setCurrentAlert(null);
            }
          }}
        >
          <div 
            className="max-w-4xl w-full p-8 rounded-lg text-center animate-pulse cursor-pointer"
            style={{ 
              backgroundColor: currentAlert.backgroundColor,
              color: currentAlert.textColor 
            }}
          >
            <div className="text-3xl font-bold mb-4">⚠️ ALERTA URGENTE ⚠️</div>
            <div className="text-2xl font-medium mb-4">{currentAlert.message}</div>
            {currentAlert.duration === 0 && (
              <div className="text-sm opacity-75">Haz clic para cerrar</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}