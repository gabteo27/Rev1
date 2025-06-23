import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WebSocketManager } from "@/lib/websocket";
import { AlertOverlay } from "@/components/player/AlertOverlay";

// Memoized components for better performance
const MemoizedImage = memo(({ src, alt, className }: { src: string; alt: string; className: string }) => (
  <img 
    src={src} 
    alt={alt} 
    className={className}
    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
    loading="lazy"
  />
));
MemoizedImage.displayName = "MemoizedImage";

const MemoizedVideo = memo(({ src, className }: { src: string; className: string }) => (
  <video
    className={className}
    autoPlay
    muted
    loop
    playsInline
    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
  >
    <source src={src} type="video/mp4" />
  </video>
));
MemoizedVideo.displayName = "MemoizedVideo";

const MemoizedWebPage = memo(({ url, className }: { url: string; className: string }) => (
  <iframe
    src={url}
    className={className}
    style={{ width: '100%', height: '100%', border: 'none' }}
    title="Contenido Web"
    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
  />
));
MemoizedWebPage.displayName = "MemoizedWebPage";

// Optimized content item component
const ContentItem = memo(({ 
  content, 
  isVisible, 
  onLoadComplete 
}: { 
  content: any; 
  isVisible: boolean; 
  onLoadComplete: () => void;
}) => {
  const itemRef = useRef<HTMLDivElement>(null);

  const contentElement = useMemo(() => {
    const baseClassName = `absolute inset-0 transition-opacity duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`;

    switch (content.type) {
      case 'image':
        return (
          <MemoizedImage
            src={content.url}
            alt={content.title}
            className={baseClassName}
          />
        );
      case 'video':
        return (
          <MemoizedVideo
            src={content.url}
            className={baseClassName}
          />
        );
      case 'webpage':
        return (
          <MemoizedWebPage
            url={content.url}
            className={baseClassName}
          />
        );
      case 'pdf':
        return (
          <iframe
            src={`${content.url}#toolbar=0&navpanes=0&scrollbar=0`}
            className={baseClassName}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={content.title}
          />
        );
      default:
        return (
          <div className={`${baseClassName} flex items-center justify-center bg-gray-100`}>
            <p className="text-2xl text-gray-600">Tipo de contenido no soportado</p>
          </div>
        );
    }
  }, [content, isVisible]);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onLoadComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onLoadComplete]);

  return (
    <div ref={itemRef} className="absolute inset-0">
      {contentElement}
    </div>
  );
});
ContentItem.displayName = "ContentItem";

// Optimized widget components
const ClockWidget = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
      <div className="text-2xl font-bold">
        {time.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })}
      </div>
      <div className="text-sm opacity-80">
        {time.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
    </div>
  );
});
ClockWidget.displayName = "ClockWidget";

const WeatherWidget = memo(() => (
  <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
    <div className="flex items-center space-x-2">
      <span className="text-lg">☀️</span>
      <div>
        <div className="font-bold">25°C</div>
        <div className="text-sm opacity-80">Soleado</div>
      </div>
    </div>
  </div>
));
WeatherWidget.displayName = "WeatherWidget";

// Main component with optimizations
const ContentPlayer = memo(({ 
  playlistId, 
  isPreview = false 
}: { 
  playlistId?: number; 
  isPreview?: boolean;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const [isPlaying, setIsPlaying] = useState(true); // Control playback state
  const authToken = localStorage.getItem('authToken');
  const wsManager = useMemo(() => new WebSocketManager(), []);

  // Query configuration with conditional fetching
  const queryOptions = useMemo(() => ({
    queryKey: [isPreview ? "/api/playlists" : "/api/player/playlists", playlistId],
    queryFn: async () => {
      if (!playlistId) return null;

      try {
        let endpoint;
        let headers: Record<string, string> = {};

        if (isPreview) {
          endpoint = `/api/playlists/${playlistId}`;
          const response = await apiRequest(endpoint);
          if (!response.ok) {
            if (response.status === 404) {
              console.warn(`Playlist ${playlistId} not found`);
              return null;
            }
            throw new Error(`Failed to fetch playlist: ${response.status}`);
          }
          return response.json();
        } else {
          endpoint = `/api/player/playlists/${playlistId}`;
          const authToken = localStorage.getItem('authToken');
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }

          const response = await fetch(endpoint, { headers });

          if (!response.ok) {
            if (response.status === 404) {
              console.warn(`Playlist ${playlistId} not found`);
              return null;
            }
            throw new Error(`Failed to fetch playlist: ${response.status}`);
          }

          const data = await response.json();
          console.log('Playlist data loaded:', data);
          return data;
        }
      } catch (error) {
        console.error('Error loading playlist:', error);
        throw error;
      }
    },
    enabled: !!playlistId,
    retry: 1,
    staleTime: isPreview ? 60000 : 300000, // 1 min for preview, 5 min for player
    refetchInterval: isPreview ? false : 30000, // Only auto-refresh in production
  }), [playlistId, isPreview]);

  const { data: playlistData, isLoading, error, refetch } = useQuery(queryOptions);

  const contentItems = useMemo(() => 
    playlistData?.items || [], 
    [playlistData?.items]
  );

  // Memoized callbacks
  const goToNext = useCallback(() => {
    if (contentItems.length <= 1 || !isPlaying) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % contentItems.length);
      setIsTransitioning(false);
    }, 500);
  }, [contentItems.length, isPlaying]);

  const resetInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (contentItems.length > 1 && isPlaying) {
      const currentItem = contentItems[currentIndex];
      const duration = (currentItem?.duration || 10) * 1000;

      intervalRef.current = setInterval(goToNext, duration);
    }
  }, [contentItems, currentIndex, goToNext, isPlaying]);

  // Real-time update system using WebSocket with heartbeat
  useEffect(() => {
    if (isPreview) return;

    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;

    let lastPlaylistId = playlistId;

    // Connect to WebSocket with player authentication
    console.log('🔌 Connecting player WebSocket...');

    const setupWebSocket = async () => {
      try {
        await wsManager.connect();

        // Authenticate with the server
        wsManager.send({
          type: 'player-auth',
          token: authToken
        });

        // Identify as screen
        const screenId = localStorage.getItem('screenId');
        if (screenId) {
          wsManager.send({
            type: 'screen-identify',
            screenId: parseInt(screenId)
          });
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    setupWebSocket();

    // Handle WebSocket messages
    const handlePlaylistChange = (data: any) => {
      const newPlaylistId = data.playlistId;
      const targetScreenId = data.screenId;
      const currentScreenId = localStorage.getItem('screenId');

      console.log(`🔄 Playlist change: ${playlistId} → ${newPlaylistId}, screenId: ${targetScreenId}`);

      if (targetScreenId && targetScreenId.toString() === currentScreenId && newPlaylistId !== playlistId) {
        console.log(`🎵 Playlist changed - RELOADING`);
        window.location.reload();
      }
    };

    const handlePlaylistUpdate = (data: any) => {
      if (data.playlistId === playlistId) {
        console.log('🔄 Playlist content updated, refreshing...');
        refetch();
      }
    };

    const handleContentDelete = (data: any) => {
      const targetScreenId = data.screenId;
      const currentScreenId = localStorage.getItem('screenId');
      const deletedPlaylistId = data.playlistId;

      if (targetScreenId === currentScreenId && deletedPlaylistId === playlistId) {
        console.log('🗑️ Content deleted from current playlist, refreshing...');
        refetch();
        setCurrentIndices(prev => {
          const newIndices = { ...prev };
          Object.keys(newIndices).forEach(zoneId => {
            newIndices[zoneId] = { ...newIndices[zoneId], currentIndex: 0 };
          });
          return newIndices;
        });
      }
    };

    const handleScreenUpdate = (data: any) => {
      const targetScreenId = data.screenId;
      const currentScreenId = localStorage.getItem('screenId');

      if (targetScreenId === currentScreenId) {
        console.log('🔄 Screen updated - reloading...');
        setTimeout(() => window.location.reload(), 500);
      }
    };

    // Subscribe to events
    wsManager.on('playlist-change', handlePlaylistChange);
    wsManager.on('playlist-content-updated', handlePlaylistUpdate);
    wsManager.on('content-deleted-from-playlist', handleContentDelete);
    wsManager.on('screen-playlist-updated', handleScreenUpdate);

    // Heartbeat system
    const heartbeat = () => {
      if (wsManager.isConnected()) {
        wsManager.send({
          type: 'player-heartbeat',
          timestamp: new Date().toISOString(),
          screenId: localStorage.getItem('screenId')
        });
      }
    };

    const heartbeatInterval = setInterval(heartbeat, 30000);

    // Connection check
    const connectionCheck = setInterval(() => {
      if (!wsManager.isConnected()) {
        console.log('🔄 Reconnecting WebSocket...');
        setupWebSocket();
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(connectionCheck);
      wsManager.off('playlist-change', handlePlaylistChange);
      wsManager.off('playlist-content-updated', handlePlaylistUpdate);
      wsManager.off('content-deleted-from-playlist', handleContentDelete);
      wsManager.off('screen-playlist-updated', handleScreenUpdate);
    };
  }, [playlistId, refetch, isPreview]);

  // Content rotation logic
  useEffect(() => {
    resetInterval();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [resetInterval]);

  // Alert cleanup
  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Cargando contenido...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-500 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error al cargar contenido</h2>
          <p className="text-lg">Por favor, verifica la configuración de la playlist.</p>
        </div>
      </div>
    );
  }

  // Render empty playlist
  if (!contentItems.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Playlist Vacía</h2>
          <p className="text-xl">No hay contenido configurado para mostrar.</p>
          <p className="text-sm mt-4 opacity-70">
            Agrega contenido a tu playlist desde el panel de administración.
          </p>
        </div>
      </div>
    );
  }

  const currentItem = contentItems[currentIndex];

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Content Area */}
      <div className="relative w-full h-full">
        {contentItems.map((item, index) => (
          <ContentItem
            key={`${item.id}-${index}`}
            content={item}
            isVisible={index === currentIndex && !isTransitioning}
            onLoadComplete={() => {}}
          />
        ))}
      </div>

      {/* Widgets */}
      {!isPreview && (
        <>
          <ClockWidget />
          <WeatherWidget />
        </>
      )}

      {/* Content Info Overlay */}
      {currentItem && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg">
          <div className="text-sm font-medium">{currentItem.title}</div>
          {contentItems.length > 1 && (
            <div className="text-xs opacity-70">
              {currentIndex + 1} de {contentItems.length}
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {contentItems.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ 
              width: `${((currentIndex + 1) / contentItems.length) * 100}%` 
            }}
          />
        </div>
      )}

      {/* Alert Overlays */}
      {alerts.map(alert => (
        <AlertOverlay
          key={alert.id}
          alert={alert}
          onClose={() => removeAlert(alert.id)}
        />
      ))}
    </div>
  );
});

ContentPlayer.displayName = "ContentPlayer";

export default ContentPlayer;