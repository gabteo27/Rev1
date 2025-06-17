import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { wsManager } from "@/lib/websocket";
import type { Playlist, Widget } from "@shared/schema";
import { AlertOverlay } from "./AlertOverlay";

interface ContentPlayerProps {
  playlistId?: number;
  isPreview?: boolean;
}

export function ContentPlayer({ playlistId, isPreview = false }: ContentPlayerProps) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [lastPlaylistId, setLastPlaylistId] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch playlist data
  const { data: playlist, error: playlistError } = useQuery<Playlist>({
    queryKey: isPreview ? ['/api/playlists', playlistId] : ['/api/player/playlists', playlistId],
    queryFn: () => {
      const endpoint = isPreview ? `/api/playlists/${playlistId}` : `/api/player/playlists/${playlistId}`;
      const authToken = localStorage.getItem('authToken');

      if (isPreview) {
        return fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }).then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch playlist');
          }
          return res.json();
        });
      } else {
        return fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }).then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch playlist');
          }
          return res.json();
        });
      }
    },
    enabled: !!playlistId,
    refetchInterval: false, // Disable automatic refetch, use WebSocket updates
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch widgets for overlays
  const { data: widgets = [] } = useQuery<Widget[]>({
    queryKey: isPreview ? ['/api/widgets'] : ['/api/player/widgets'],
    queryFn: () => {
      const endpoint = isPreview ? '/api/widgets' : '/api/player/widgets';
      const authToken = localStorage.getItem('authToken');

      return fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch widgets');
        }
        return res.json();
      });
    },
    refetchInterval: false, // Use WebSocket updates
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // WebSocket setup and heartbeat
  useEffect(() => {
    if (isPreview) return; // No WebSocket for preview mode

    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;

    // Connect WebSocket with player authentication
    wsManager.connect(undefined, authToken);

    // WebSocket message handler
    const handleWebSocketMessage = (data: any) => {
      console.log('🔌 WebSocket message received:', data);

      if (data.type === 'playlist-content-updated' && data.data?.playlistId === playlistId) {
        console.log('🔄 Playlist content updated, refreshing...');
        queryClient.invalidateQueries({ queryKey: ['/api/player/playlists', playlistId] });
        queryClient.refetchQueries({ 
          queryKey: ['/api/player/playlists', playlistId],
          type: 'active'
        });
      }

      if (data.type === 'playlist-change') {
        const newPlaylistId = data.data?.newPlaylistId;
        const messageScreenId = data.data?.screenId;
        const screenId = localStorage.getItem('screenId');

        if (messageScreenId === parseInt(screenId || '0') || !messageScreenId) {
          if (newPlaylistId !== lastPlaylistId) {
            console.log(`🔄 Playlist changed from ${lastPlaylistId} to ${newPlaylistId} (WebSocket)`);
            setLastPlaylistId(newPlaylistId);
            setTimeout(() => {
              console.log('🔄 Reloading page due to playlist change (WebSocket)...');
              window.location.reload();
            }, 500);
          }
        }
      }

      if (data.type === 'screen-playlist-updated') {
        const messageScreenId = data.data?.screenId;
        const newPlaylistId = data.data?.playlistId;
        const screenId = localStorage.getItem('screenId');

        if (messageScreenId === parseInt(screenId || '0')) {
          console.log(`🔄 Screen playlist updated to ${newPlaylistId} (WebSocket)`);
          setTimeout(() => {
            console.log('🔄 Reloading page due to screen playlist update...');
            window.location.reload();
          }, 500);
        }
      }
    };

    const unsubscribePlaylistChange = wsManager.subscribe('playlist-change', handleWebSocketMessage);
    const unsubscribePlaylistContent = wsManager.subscribe('playlist-content-updated', handleWebSocketMessage);
    const unsubscribePlaybackControl = wsManager.subscribe('playback-control', handleWebSocketMessage);
    const unsubscribeScreenPlaylist = wsManager.subscribe('screen-playlist-updated', handleWebSocketMessage);

    // Heartbeat every 1 minute
    const heartbeatInterval = setInterval(() => {
      if (wsManager.isConnected()) {
        wsManager.send({ 
          type: 'player-heartbeat', 
          timestamp: new Date().toISOString(),
          screenId: localStorage.getItem('screenId')
        });
        console.log('💓 Heartbeat sent via WebSocket');
      } else {
        // Fallback HTTP heartbeat if WebSocket is not connected
        fetch('/api/screens/heartbeat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }).then(response => {
          if (response.ok) {
            console.log('💓 Fallback HTTP heartbeat sent');
          }
        }).catch(error => {
          console.error('HTTP Heartbeat failed:', error);
        });
      }
    }, 60000); // 1 minute

    return () => {
      clearInterval(heartbeatInterval);
      unsubscribePlaylistChange();
      unsubscribePlaylistContent();
      unsubscribePlaybackControl();
      unsubscribeScreenPlaylist();
    };
  }, [playlistId, lastPlaylistId]);

  // Playlist playback logic
  useEffect(() => {
    if (!playlist?.items || playlist.items.length === 0 || !isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const currentItem = playlist.items[currentItemIndex];
    if (!currentItem) return;

    const duration = (currentItem.customDuration || currentItem.contentItem?.duration || 30) * 1000;

    intervalRef.current = setTimeout(() => {
      setCurrentItemIndex((prevIndex) => 
        prevIndex + 1 >= playlist.items!.length ? 0 : prevIndex + 1
      );
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playlist, currentItemIndex, isPlaying]);

  // Handle playlist or widget errors
  if (playlistError) {
    console.error('Playlist error:', playlistError);
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Error de Conexión</h1>
          <p className="text-lg">No se pudo cargar la playlist</p>
          <p className="text-sm mt-2 opacity-70">
            {playlistError.message || 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!playlist) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Cargando contenido...</p>
        </div>
      </div>
    );
  }

  // No content state
  if (!playlist.items || playlist.items.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Sin Contenido</h1>
          <p className="text-lg">Esta playlist no tiene elementos para mostrar</p>
        </div>
      </div>
    );
  }

  const currentItem = playlist.items[currentItemIndex];
  if (!currentItem?.contentItem) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Error de Contenido</h1>
          <p className="text-lg">El elemento actual no es válido</p>
        </div>
      </div>
    );
  }

  const contentItem = currentItem.contentItem;

  // Render content based on type
  const renderContent = () => {
    const baseUrl = window.location.origin;

    switch (contentItem.type) {
      case 'image':
        return (
          <img
            src={`${baseUrl}${contentItem.url}`}
            alt={contentItem.title}
            className="w-full h-full object-contain"
            onError={(e) => {
              console.error('Error loading image:', contentItem.url);
              e.currentTarget.style.display = 'none';
            }}
          />
        );

      case 'video':
        return (
          <video
            src={`${baseUrl}${contentItem.url}`}
            className="w-full h-full object-contain"
            autoPlay
            muted
            onError={(e) => {
              console.error('Error loading video:', contentItem.url);
            }}
            onEnded={() => {
              // Move to next item when video ends naturally
              setCurrentItemIndex((prevIndex) => 
                prevIndex + 1 >= playlist.items!.length ? 0 : prevIndex + 1
              );
            }}
          />
        );

      case 'webpage':
        return (
          <iframe
            src={contentItem.url}
            className="w-full h-full border-0"
            title={contentItem.title}
            onError={(e) => {
              console.error('Error loading webpage:', contentItem.url);
            }}
          />
        );

      case 'pdf':
        return (
          <iframe
            src={`${baseUrl}${contentItem.url}`}
            className="w-full h-full border-0"
            title={contentItem.title}
            onError={(e) => {
              console.error('Error loading PDF:', contentItem.url);
            }}
          />
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-600">
            <div className="text-center">
              <h2 className="text-xl mb-2">{contentItem.title}</h2>
              <p>Tipo de contenido no soportado: {contentItem.type}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Main content */}
      <div className="w-full h-full">
        {renderContent()}
      </div>

      {/* Alert overlay */}
      <AlertOverlay screenId={parseInt(localStorage.getItem('screenId') || '0')} />

      {/* Widget overlays */}
      {widgets.filter(widget => widget.isEnabled).map((widget) => (
        <div
          key={widget.id}
          className={`absolute ${
            widget.position === 'top-left' ? 'top-4 left-4' :
            widget.position === 'top-right' ? 'top-4 right-4' :
            widget.position === 'bottom-left' ? 'bottom-4 left-4' :
            widget.position === 'bottom-right' ? 'bottom-4 right-4' :
            'top-4 right-4'
          } z-20`}
        >
          {widget.type === 'clock' && (
            <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
              <div className="text-lg font-mono">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
          {widget.type === 'weather' && (
            <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
              <div className="text-lg">
                {widget.settings?.temperature || '22°C'}
              </div>
            </div>
          )}
          {widget.type === 'text' && (
            <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
              <div className="text-lg">
                {widget.settings?.text || widget.name}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Debug info in preview mode */}
      {isPreview && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-30">
          <div>Playlist: {playlist.name}</div>
          <div>Item: {currentItemIndex + 1}/{playlist.items.length}</div>
          <div>Tipo: {contentItem.type}</div>
          <div>Título: {contentItem.title}</div>
        </div>
      )}
    </div>
  );
}