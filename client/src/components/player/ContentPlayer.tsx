import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WebSocketClient } from '@/lib/websocket';
import { apiFetch } from '@/lib/api';

// Interfaces y tipos
interface PlaylistItem {
  id: number;
  type: 'image' | 'video' | 'widget' | 'url';
  title: string;
  content: any;
  duration: number;
  config?: any;
}

interface Playlist {
  id: number;
  name: string;
  items: PlaylistItem[];
}

interface Widget {
  id: number;
  type: string;
  title: string;
  config: any;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  zIndex: number;
}

interface PlaybackState {
  [playlistId: number]: {
    currentIndex: number;
    isPlaying: boolean;
    startTime: number;
  };
}

interface Props {
  playlistId?: number;
  isPreview?: boolean;
}

// Componente memoizado para mostrar contenido de imagen
const ImageContent = memo<{ item: PlaylistItem; layout: any }>(({ item, layout }) => {
  const imageUrl = item.content?.url;

  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <p className="text-2xl">Imagen no disponible</p>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full flex items-center justify-center bg-black overflow-hidden"
      style={{ objectFit: layout?.imageConfig?.fit || 'contain' }}
    >
      <img
        src={imageUrl}
        alt={item.title || 'Imagen del contenido'}
        className="max-w-full max-h-full object-contain"
        style={{
          filter: layout?.imageConfig?.filter || 'none',
          transform: layout?.imageConfig?.transform || 'none'
        }}
        loading="lazy"
      />
    </div>
  );
});

ImageContent.displayName = 'ImageContent';

// Componente memoizado para mostrar contenido de video
const VideoContent = memo<{ item: PlaylistItem; layout: any; onEnded: () => void }>(({ item, layout, onEnded }) => {
  const videoUrl = item.content?.url;

  if (!videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <p className="text-2xl">Video no disponible</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black">
      <video
        src={videoUrl}
        className="w-full h-full object-contain"
        autoPlay
        muted
        onEnded={onEnded}
        style={{
          filter: layout?.videoConfig?.filter || 'none',
          transform: layout?.videoConfig?.transform || 'none'
        }}
        playsInline
        preload="metadata"
      />
    </div>
  );
});

VideoContent.displayName = 'VideoContent';

// Componente memoizado para mostrar contenido URL
const URLContent = memo<{ item: PlaylistItem; layout: any }>(({ item, layout }) => {
  const url = item.content?.url;

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <p className="text-2xl">URL no disponible</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <iframe
        src={url}
        className="w-full h-full border-0"
        title={item.title || 'Contenido web'}
        style={{
          filter: layout?.urlConfig?.filter || 'none',
          transform: layout?.urlConfig?.transform || 'none'
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        loading="lazy"
      />
    </div>
  );
});

URLContent.displayName = 'URLContent';

// Componente memoizado para widgets del clima
const WeatherWidget = memo<{ config: any }>(({ config }) => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!config?.apiKey || !config?.city) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=${config.apiKey}&q=${config.city}&aqi=no`
        );

        if (response.ok) {
          const data = await response.json();
          setWeatherData(data);
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(interval);
  }, [config?.apiKey, config?.city]);

  if (loading) {
    return (
      <div className="p-4 bg-blue-100 rounded-lg">
        <p className="text-blue-800">Cargando clima...</p>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className="p-4 bg-blue-100 rounded-lg">
        <p className="text-blue-800">Configure API key y ciudad</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">{weatherData.location?.name}</h3>
          <p className="text-3xl font-bold">{weatherData.current?.temp_c}°C</p>
          <p className="text-sm opacity-90">{weatherData.current?.condition?.text}</p>
        </div>
        {weatherData.current?.condition?.icon && (
          <img 
            src={`https:${weatherData.current.condition.icon}`}
            alt="Weather icon"
            className="w-16 h-16"
          />
        )}
      </div>
    </div>
  );
});

WeatherWidget.displayName = 'WeatherWidget';

// Componente memoizado para widgets de noticias
const NewsWidget = memo<{ config: any }>(({ config }) => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const rssUrl = config?.rssUrl || 'https://feeds.bbci.co.uk/mundo/rss.xml';
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          setNews(data.items?.slice(0, config?.maxItems || 3) || []);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setNews([{
          title: 'Noticias en tiempo real',
          description: 'Configure la URL RSS para mostrar noticias actualizadas'
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 15 * 60 * 1000); // 15 minutos

    return () => clearInterval(interval);
  }, [config?.rssUrl, config?.maxItems]);

  if (loading) {
    return (
      <div className="p-3 bg-orange-100 rounded-lg">
        <p className="text-orange-800">Cargando noticias...</p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gradient-to-r from-orange-100 to-orange-200 rounded-lg">
      <h3 className="text-lg font-bold text-orange-800 mb-2">📰 Últimas Noticias</h3>
      <div className="space-y-2">
        {news.slice(0, 2).map((item, index) => (
          <div key={index} className="text-sm">
            <h4 className="font-semibold text-orange-900 line-clamp-2">{item.title}</h4>
            <p className="text-orange-700 text-xs line-clamp-1">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

NewsWidget.displayName = 'NewsWidget';

// Componente memoizado para widgets de reloj
const ClockWidget = memo<{ config: any }>(({ config }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: config?.showSeconds ? '2-digit' : undefined,
      hour12: config?.format12Hour || false,
      timeZone: config?.timezone || 'America/Mexico_City'
    };
    return date.toLocaleTimeString('es-MX', options);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: config?.timezone || 'America/Mexico_City'
    };
    return date.toLocaleDateString('es-MX', options);
  };

  return (
    <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-lg">
      <div className="text-center">
        <div className="text-4xl font-bold font-mono">
          {formatTime(time)}
        </div>
        {config?.showDate && (
          <div className="text-sm mt-2 capitalize opacity-90">
            {formatDate(time)}
          </div>
        )}
      </div>
    </div>
  );
});

ClockWidget.displayName = 'ClockWidget';

// Componente memoizado para renderizar widgets
const WidgetRenderer = memo<{ widget: Widget }>(({ widget }) => {
  const widgetContent = useMemo(() => {
    switch (widget.type) {
      case 'weather':
        return <WeatherWidget config={widget.config} />;
      case 'news':
        return <NewsWidget config={widget.config} />;
      case 'clock':
        return <ClockWidget config={widget.config} />;
      default:
        return (
          <div className="p-4 bg-gray-200 rounded-lg">
            <p className="text-gray-600">Widget desconocido: {widget.type}</p>
          </div>
        );
    }
  }, [widget.type, widget.config]);

  const positionStyles = useMemo(() => {
    const positions = {
      'top-left': { top: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    };
    return positions[widget.position] || positions['top-left'];
  }, [widget.position]);

  return (
    <div
      className="absolute"
      style={{
        ...positionStyles,
        zIndex: widget.zIndex || 1000,
        maxWidth: '300px'
      }}
    >
      {widgetContent}
    </div>
  );
});

WidgetRenderer.displayName = 'WidgetRenderer';

// Componente principal optimizado
const ContentPlayer = memo<Props>(({ playlistId, isPreview = false }) => {
  // Estados locales
  const [playbackState, setPlaybackState] = useState<PlaybackState>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Query client para optimizar requests
  const queryClient = useQueryClient();

  // Memoizar configuración de queries para evitar re-renders
  const playlistQueryConfig = useMemo(() => ({
    queryKey: ['/api/player/playlists', playlistId],
    queryFn: async () => {
      if (!playlistId) return null;
      console.log(`[apiFetch] Calling: /api/player/playlists/${playlistId}`);
      return apiFetch(`/api/player/playlists/${playlistId}`);
    },
    enabled: !!playlistId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  }), [playlistId]);

  const widgetsQueryConfig = useMemo(() => ({
    queryKey: ['/api/player/widgets'],
    queryFn: async () => {
      console.log(`[apiFetch] Calling: /api/player/widgets`);
      return apiFetch('/api/player/widgets');
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: 1
  }), []);

  // Queries optimizadas
  const { data: playlist, isLoading: playlistLoading, error: playlistError } = useQuery(playlistQueryConfig);
  const { data: widgets = [], isLoading: widgetsLoading } = useQuery(widgetsQueryConfig);

  // Memoizar estado actual del playback
  const currentState = useMemo(() => {
    if (!playlistId || !playbackState[playlistId]) {
      return { currentIndex: 0, isPlaying: true, startTime: Date.now() };
    }
    return playbackState[playlistId];
  }, [playlistId, playbackState]);

  // Memoizar item actual
  const currentItem = useMemo(() => {
    if (!playlist?.items || playlist.items.length === 0) return null;
    return playlist.items[currentState.currentIndex] || playlist.items[0];
  }, [playlist?.items, currentState.currentIndex]);

  // Callback memoizado para avanzar al siguiente item
  const nextItem = useCallback(() => {
    if (!playlistId || !playlist?.items || playlist.items.length === 0) return;

    setIsTransitioning(true);

    setTimeout(() => {
      setPlaybackState(prev => {
        const current = prev[playlistId] || { currentIndex: 0, isPlaying: true, startTime: Date.now() };
        const nextIndex = (current.currentIndex + 1) % playlist.items.length;

        return {
          ...prev,
          [playlistId]: {
            ...current,
            currentIndex: nextIndex,
            startTime: Date.now()
          }
        };
      });
      setIsTransitioning(false);
    }, 300);
  }, [playlistId, playlist?.items]);

  // Callback memoizado para manejar fin de video
  const handleVideoEnded = useCallback(() => {
    nextItem();
  }, [nextItem]);

  // Efecto para el timer de duración
  useEffect(() => {
    if (!currentItem || currentItem.type === 'video' || !currentState.isPlaying) return;

    const duration = (currentItem.duration || 10) * 1000;
    const elapsed = Date.now() - currentState.startTime;
    const remaining = Math.max(0, duration - elapsed);

    if (remaining === 0) {
      nextItem();
      return;
    }

    const timer = setTimeout(nextItem, remaining);
    return () => clearTimeout(timer);
  }, [currentItem, currentState, nextItem]);

  // WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    if (!playlistId) return;

    console.log(`🔌 Iniciando WebSocket para playlist: ${playlistId}`);

    let wsClient: WebSocketClient;

    try {
      wsClient = WebSocketClient.getInstance();

      const handlePlaylistChange = (data: any) => {
        const { playlistId: newPlaylistId, screenId: messageScreenId } = data;
        const currentScreenId = localStorage.getItem('screenId');

        if (messageScreenId && messageScreenId.toString() === currentScreenId && newPlaylistId !== playlistId) {
          console.log(`🎵 Playlist changed from ${playlistId} to ${newPlaylistId} - IMMEDIATE RELOAD`);
          window.location.reload();
        }
      };

      const handleContentUpdated = (data: any) => {
        const { screenId: messageScreenId, playlistId: updatedPlaylistId } = data;
        const currentScreenId = localStorage.getItem('screenId');

        if (messageScreenId === currentScreenId && updatedPlaylistId === playlistId) {
          console.log('🔄 Content updated, refreshing playlist data...');
          queryClient.invalidateQueries({ queryKey: ['/api/player/playlists', playlistId] });
        }
      };

      const handleContentDeleted = (data: any) => {
        const { screenId: messageScreenId, playlistId: deletedFromPlaylistId } = data;
        const currentScreenId = localStorage.getItem('screenId');

        if (messageScreenId === currentScreenId && deletedFromPlaylistId === playlistId) {
          console.log('🗑️ Content deleted from current playlist, refreshing...');
          queryClient.invalidateQueries({ queryKey: ['/api/player/playlists', playlistId] });
          queryClient.refetchQueries({ queryKey: ['/api/player/playlists', playlistId], type: 'active' });

          setPlaybackState(prev => ({
            ...prev,
            [playlistId]: { ...prev[playlistId], currentIndex: 0 }
          }));
        }
      };

      const unsubscribePlaylistChange = wsClient.subscribe('playlist-change', handlePlaylistChange);
      const unsubscribeContentUpdated = wsClient.subscribe('playlist-content-updated', handleContentUpdated);
      const unsubscribeContentDeleted = wsClient.subscribe('playlist-item-deleted', handleContentDeleted);
      const unsubscribeScreenUpdated = wsClient.subscribe('screen-playlist-updated', handlePlaylistChange);

      // Heartbeat para mantener conexión activa
      const heartbeatInterval = setInterval(() => {
        if (wsClient.isConnected()) {
          wsClient.send({
            type: 'player-heartbeat',
            timestamp: new Date().toISOString(),
            screenId: localStorage.getItem('screenId')
          });
          console.log('💓 WebSocket heartbeat sent');
        } else {
          console.log('💓 Sending HTTP heartbeat (WebSocket not connected)');
          fetch('/api/player/heartbeat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              screenId: localStorage.getItem('screenId'),
              timestamp: new Date().toISOString()
            })
          }).catch(error => console.error('HTTP heartbeat failed:', error));
        }
      }, 30000); // 30 segundos

      return () => {
        unsubscribePlaylistChange();
        unsubscribeContentUpdated();
        unsubscribeContentDeleted();
        unsubscribeScreenUpdated();
        clearInterval(heartbeatInterval);
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
    }
  }, [playlistId, queryClient]);

  // Renderizado condicional memoizado
  const renderContent = useMemo(() => {
    if (playlistLoading) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-black text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-2xl">Cargando contenido...</p>
          </div>
        </div>
      );
    }

    if (playlistError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-red-900 text-white">
          <div className="text-center">
            <p className="text-3xl mb-4">❌ Error al cargar playlist</p>
            <p className="text-lg opacity-75">Verifique la conexión y la configuración</p>
          </div>
        </div>
      );
    }

    if (!playlist?.items || playlist.items.length === 0) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <p className="text-3xl mb-4">📋 Playlist vacía</p>
            <p className="text-lg opacity-75">Agregue contenido a esta playlist para comenzar</p>
          </div>
        </div>
      );
    }

    if (!currentItem) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <p className="text-3xl mb-4">⚠️ Contenido no disponible</p>
            <p className="text-lg opacity-75">No se pudo cargar el elemento actual</p>
          </div>
        </div>
      );
    }

    // Layout por defecto
    const layout = currentItem.config?.layout || {};

    const contentComponent = (() => {
      switch (currentItem.type) {
        case 'image':
          return <ImageContent item={currentItem} layout={layout} />;
        case 'video':
          return <VideoContent item={currentItem} layout={layout} onEnded={handleVideoEnded} />;
        case 'url':
          return <URLContent item={currentItem} layout={layout} />;
        default:
          return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
              <p className="text-2xl">Tipo de contenido no soportado: {currentItem.type}</p>
            </div>
          );
      }
    })();

    return (
      <div 
        className={`w-full h-screen relative transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {contentComponent}

        {/* Widgets overlay */}
        {widgets.map((widget: Widget) => (
          <WidgetRenderer key={widget.id} widget={widget} />
        ))}

        {/* Debug info (solo en preview) */}
        {isPreview && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
            <p>Playlist: {playlist.name}</p>
            <p>Item: {currentState.currentIndex + 1}/{playlist.items.length}</p>
            <p>Tipo: {currentItem.type}</p>
            <p>Duración: {currentItem.duration}s</p>
          </div>
        )}
      </div>
    );
  }, [
    playlistLoading,
    playlistError,
    playlist,
    currentItem,
    currentState,
    isTransitioning,
    widgets,
    isPreview,
    handleVideoEnded
  ]);

  return renderContent;
});

ContentPlayer.displayName = 'ContentPlayer';

export default ContentPlayer;