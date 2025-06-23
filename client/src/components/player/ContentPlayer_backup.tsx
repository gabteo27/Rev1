import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertOverlay } from "./AlertOverlay";
import type { Playlist, PlaylistItem, Widget, Alert } from "@shared/schema";
import { wsManager } from "@/lib/websocket";
import { API_BASE_URL, apiFetch } from "@/lib/api"; // 1. Importa API_BASE_URL


// --- Estilos para el reproductor ---
const styles = {
  container: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', color: 'white', overflow: 'hidden' } as React.CSSProperties,
  media: { width: '100%', height: '100%', objectFit: 'contain' } as React.CSSProperties,
  zone: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' } as React.CSSProperties,
};

// Función para obtener el estilo de media con objectFit personalizado
const getMediaStyle = (objectFit: string = 'contain') => ({
  width: '100%',
  height: '100%',
  objectFit: objectFit as any
} as React.CSSProperties);

// --- Componentes para renderizar cada tipo de contenido ---
const ImagePlayer = ({ src, objectFit = 'contain' }: { src: string, objectFit?: string }) => 
  <img src={src} style={getMediaStyle(objectFit)} alt="" />;
const VideoPlayer = ({ src, objectFit = 'contain' }: { src: string, objectFit?: string }) => 
  <video src={src} style={getMediaStyle(objectFit)} autoPlay muted loop playsInline />;
const WebpagePlayer = ({ src }: { src: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div style={{ 
        ...styles.media, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'rgba(255,255,255,0.7)',
        fontSize: '18px',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🌐</div>
          <div>Error cargando página web</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>{src}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.media, position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
          zIndex: 1
        }}>
          <div>Cargando página web...</div>
        </div>
      )}
      <iframe 
        src={src} 
        style={{ ...styles.media, border: 'none' }} 
        title="web-content"
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
};

// PDF Player Component
const PDFPlayer = ({ src }: { src: string }) => {
  const [error, setError] = useState(false);

  const pdfViewerUrl = src.startsWith('http') 
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`
    : `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + src)}&embedded=true`;

  if (error) {
    return (
      <div style={{ 
        ...styles.media, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'rgba(255,255,255,0.7)',
        fontSize: '18px',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📄</div>
          <div>Error cargando PDF</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>{src}</div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={pdfViewerUrl}
      style={{ 
        ...styles.media, 
        border: 'none',
        background: '#f5f5f5'
      }}
      title="PDF document"
      loading="eager"
      sandbox="allow-scripts allow-same-origin"
      onError={() => setError(true)}
    />
  );
};

// YouTube Player Component
const YouTubePlayer = ({ url }: { url: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const getYouTubeID = (url: string) => {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Limpiar la URL de espacios y caracteres extraños
    const cleanUrl = url.trim();

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      try {
        const match = cleanUrl.match(pattern);
        if (match && match[1] && match[1].length === 11) {
          return match[1];
        }
      } catch (e) {
        console.error('Error matching YouTube URL pattern:', e);
        continue;
      }
    }
    return null;
  };

  const videoId = getYouTubeID(url);

  if (!videoId || error) {
    return (
      <div style={{ 
        ...styles.media, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'rgba(255,255,255,0.7)',
        fontSize: '18px',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📺</div>
          <div>{error ? 'Error cargando video de YouTube' : 'URL de YouTube no válida'}</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>
            {url?.substring(0, 50)}{url?.length > 50 ? '...' : ''}
          </div>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?` + [
    'autoplay=1',
    'mute=1',
    'loop=1',
    `playlist=${videoId}`,
    'controls=0',
    'showinfo=0',
    'iv_load_policy=3',
    'modestbranding=1',
    'rel=0',
    'fs=0',
    'disablekb=1',
    'cc_load_policy=0',
    'playsinline=1',
    'enablejsapi=1'
  ].join('&');

  return (
    <div style={{ ...styles.media, position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
          zIndex: 1
        }}>
          <div>Cargando video de YouTube...</div>
        </div>
      )}
      <iframe
        key={`youtube-${videoId}-${Date.now()}`}
        src={embedUrl}
        style={{ 
          ...styles.media, 
          border: 'none',
          background: '#000'
        }}
        title={`YouTube video player - ${videoId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen={false}
        loading="eager"
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
};

// Widget Components
const ClockWidget = ({ config, position }: { config: any, position: string }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const format = config?.format || '24h';
  const timezone = config?.timezone || 'America/Mexico_City';

  const formatTime = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: format === '12h'
      }).format(date);
    } catch (error) {
      return date.toLocaleTimeString('es-ES');
    }
  };

  const formatDate = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      return date.toLocaleDateString('es-ES');
    }
  };

  return (
    <div style={{
      position: 'absolute',
      ...getPositionStyles(position),
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '8px',
      zIndex: 1000,
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
        {formatTime(time)}
      </div>
      <div style={{ fontSize: '14px', opacity: 0.8 }}>
        {formatDate(time)}
      </div>
    </div>
  );
};

const WeatherWidget = ({ config, position }: { config: any, position: string }) => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
        const city = config?.city || 'Mexico City';

        if (apiKey) {
          const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=no`
          );
          if (response.ok) {
            const data = await response.json();
            setWeather(data);
          }
        } else {
          setWeather({
            location: { name: city },
            current: { temp_c: 22, condition: { text: 'Soleado' } }
          });
        }
      } catch (error) {
        console.error('Weather API error:', error);
        setWeather({
          location: { name: config?.city || 'Ciudad' },
          current: { temp_c: 22, condition: { text: 'No disponible' } }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config]);

  if (loading) {
    return (
      <div style={{
        position: 'absolute',
        ...getPositionStyles(position),
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        zIndex: 1000,
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ fontSize: '16px' }}>Cargando clima...</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      ...getPositionStyles(position),
      backgroundColor: 'rgba(59, 130, 246, 0.9)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '8px',
      zIndex: 1000,
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
        {weather?.location?.name || 'Ciudad'}
      </div>
      <div style={{ fontSize: '16px' }}>
        {weather?.current?.temp_c}°C - {weather?.current?.condition?.text || 'Sin datos'}
      </div>
    </div>
  );
};

const NewsWidget = ({ config, position }: { config: any, position: string }) => {
  const [news, setNews] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const rssUrl = config?.rssUrl || 'https://feeds.bbci.co.uk/mundo/rss.xml';
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

        const response = await fetch(proxyUrl);
        if (response.ok) {
          const data = await response.json();
          setNews(data.items?.slice(0, config?.maxItems || 3) || []);
        }
      } catch (error) {
        console.error('News API error:', error);
        setNews([
          { title: 'Noticias en tiempo real', description: 'Configure la URL RSS para mostrar noticias actualizadas' }
        ]);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config]);

  useEffect(() => {
    if (news.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % news.length);
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [news.length]);

  if (news.length === 0) return null;

  const currentNews = news[currentIndex];

  return (
    <div style={{
      position: 'absolute',
      ...getPositionStyles(position),
      backgroundColor: 'rgba(249, 115, 22, 0.9)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '8px',
      zIndex: 1000,
      fontFamily: 'Arial, sans-serif',
      maxWidth: '300px'
    }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
        📰 Últimas Noticias
      </div>
      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
        {currentNews?.title}
      </div>
      {news.length > 1 && (
        <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.7 }}>
          {currentIndex + 1} de {news.length}
        </div>
      )}
    </div>
  );
};

const TextWidget = ({ config, position }: { config: any, position: string }) => {
  const text = config?.text || 'Texto personalizado';
  const fontSize = config?.fontSize || '16px';
  const color = config?.color || '#ffffff';
  const backgroundColor = config?.backgroundColor || 'rgba(0, 0, 0, 0.8)';

  return (
    <div style={{
      position: 'absolute',
      ...getPositionStyles(position),
      backgroundColor,
      color,
      padding: '15px 20px',
      borderRadius: '8px',
      zIndex: 1000,
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ fontSize, fontWeight: 'medium' }}>
        {text}
      </div>
    </div>
  );
};

// Función para obtener estilos de posición
const getPositionStyles = (position: string) => {
  switch (position) {
    case 'top-left':
      return { top: '20px', left: '20px' };
    case 'top-right':
      return { top: '20px', right: '20px' };
    case 'bottom-left':
      return { bottom: '20px', left: '20px' };
    case 'bottom-right':
      return { bottom: '20px', right: '20px' };
    case 'center':
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      };
    default:
      return { bottom: '20px', right: '20px' };
  }
};

// Componente para renderizar widgets
const WidgetRenderer = ({ widget }: { widget: Widget }) => {
  if (!widget.isEnabled) return null;

  let config = {};
  try {
    config = JSON.parse(widget.settings || "{}");
  } catch (e) {
    config = {};
  }

  switch (widget.type) {
    case 'clock':
      return <ClockWidget config={config} position={widget.position || 'bottom-right'} />;
    case 'weather':
      return <WeatherWidget config={config} position={widget.position || 'top-right'} />;
    case 'news':
      return <NewsWidget config={config} position={widget.position || 'top-left'} />;
    case 'text':
      return <TextWidget config={config} position={widget.position || 'center'} />;
    default:
      return null;
  }
};

interface ZoneTracker {
  currentIndex: number;
  items: PlaylistItem[];
}

export default function ContentPlayer({ playlistId, isPreview = false }: { playlistId?: number, isPreview?: boolean }) {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [zoneTrackers, setZoneTrackers] = useState<Record<string, ZoneTracker>>({});
  const queryClient = useQueryClient();

  const { data: playlist, isLoading } = useQuery<Playlist & { items: PlaylistItem[] }>({
    queryKey: isPreview ? ['/api/playlists', playlistId] : ['/api/player/playlists', playlistId],
    queryFn: () => {
      const endpoint = isPreview ? `/api/playlists/${playlistId}` : `/api/player/playlists/${playlistId}`;
      console.log(`🎵 Fetching playlist data from: ${endpoint}`);

      if (isPreview) {
        return apiRequest(endpoint).then(res => res.json());
      } else {
        const authToken = localStorage.getItem('authToken');
        return fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch playlist: ${res.status}`);
          }
          return res.json();
        });
      }
    },
    enabled: !!playlistId,
    refetchInterval: isPreview ? 30000 : false, // Solo polling en preview
    staleTime: isPreview ? 30000 : Infinity, // Cache infinito en player
    gcTime: 300000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // No refetch automático en player
  });

  // Query para obtener alertas activas
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: [isPreview ? '/api/alerts/active' : '/api/player/alerts'],
    queryFn: () => {
      const endpoint = isPreview ? '/api/alerts/active' : '/api/player/alerts';
      if (isPreview) {
        return apiRequest(endpoint).then(res => res.json());
      } else {
        const authToken = localStorage.getItem('authToken');
        return fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }).then(res => {
          if (!res.ok) {
            console.warn('Failed to fetch alerts via API:', res.status);
            return []; // Return empty array instead of throwing
          }
          return res.json();
        });
      }
    },
    refetchInterval: isPreview ? 10000 : false, // Solo polling en preview
    enabled: !!playlistId, // Habilitado tanto en preview como en player
    retry: false, // No retry automático para evitar spam
  });

  // Actualizar alertas activas cuando cambian
  useEffect(() => {
    if (alerts) {
      setActiveAlerts(alerts.filter(alert => alert.isActive));
    }
  }, [alerts]);

  // Query para obtener widgets activos
  const { data: widgets = [] } = useQuery<Widget[]>({
    queryKey: [isPreview ? '/api/widgets' : '/api/player/widgets'],
    queryFn: () => {
      const endpoint = isPreview ? '/api/widgets' : '/api/player/widgets';
      if (isPreview) {
        return apiRequest(endpoint).then(res => res.json());
      } else {
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
      }
    },
    refetchInterval: isPreview ? 10000 : 120000,
    enabled: !!playlistId,
  });

  // Real-time update system using WebSocket with heartbeat
  useEffect(() => {
    if (isPreview) return;

    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;

    let lastPlaylistId = playlistId;

    // Connect to WebSocket with player authentication
    console.log('🔌 Connecting player WebSocket...');
    wsManager.connect(undefined, authToken);

    // Handle WebSocket messages
    const handleWebSocketMessage = (data: any) => {
      console.log('🎵 WebSocket message received:', data);

      if (data.type === 'playlist-content-updated' && data.data?.playlistId === playlistId) {
        console.log('🔄 Playlist content updated, refreshing...');

        // Immediate invalidation and refetch
        queryClient.invalidateQueries({ queryKey: ['/api/player/playlists', playlistId] });
        queryClient.refetchQueries({ 
          queryKey: ['/api/player/playlists', playlistId],
          type: 'active'
        });
      }

      if (data.type === 'playlist-item-deleted' && data.data?.playlistId === playlistId) {
        console.log('🗑️ Playlist item deleted, updating player state...');

        const deletedItemId = data.data?.itemId;

        // Reset zone trackers to avoid showing deleted items
        setZoneTrackers(prev => {
          const newTrackers = { ...prev };
          Object.keys(newTrackers).forEach(zoneId => {
            // Reset index to 0 to avoid invalid indices
            newTrackers[zoneId] = {
              ...newTrackers[zoneId],
              currentIndex: 0
            };
          });
          return newTrackers;
        });

        // Immediate invalidation and refetch
        queryClient.invalidateQueries({ queryKey: ['/api/player/playlists', playlistId] });
        queryClient.refetchQueries({ 
          queryKey: ['/api/player/playlists', playlistId],
          type: 'active'
        });

        console.log(`🔄 Player state updated after deletion of item ${deletedItemId}`);
      }

      if (data.type === 'playlist-change') {
        const newPlaylistId = data.data?.playlistId; // Corregido: usar playlistId directamente
        const messageScreenId = data.data?.screenId;
        const screenId = localStorage.getItem('screenId');

        console.log(`🔄 Playlist change in ContentPlayer: ${lastPlaylistId} → ${newPlaylistId}, screenId: ${messageScreenId}`);

        if (messageScreenId && messageScreenId.toString() === screenId) {
          if (newPlaylistId !== lastPlaylistId) {
            console.log(`🎵 Playlist changed from ${lastPlaylistId} to ${newPlaylistId} - IMMEDIATE RELOAD`);
            lastPlaylistId = newPlaylistId;

            // Recarga inmediata sin delay
            window.location.reload();
          }
        }
      }

      if (data.type === 'content-deleted-from-playlist') {
        const messageScreenId = data.data?.screenId;
        const screenId = localStorage.getItem('screenId');
        const currentPlaylistId = data.data?.playlistId;

        if (messageScreenId === screenId && currentPlaylistId === playlistId) {
          console.log(`🗑️ Content deleted from current playlist, refreshing player...`);

          // Invalidar queries y refrescar inmediatamente
          queryClient.invalidateQueries({ queryKey: ['/api/player/playlists', playlistId] });
          queryClient.refetchQueries({ 
            queryKey: ['/api/player/playlists', playlistId],
            type: 'active'
          });

          // Reset zone trackers para evitar mostrar contenido eliminado
          setZoneTrackers(prev => {
            const newTrackers = { ...prev };
            Object.keys(newTrackers).forEach(zoneId => {
              newTrackers[zoneId] = {
                ...newTrackers[zoneId],
                currentIndex: 0
              };
            });
            return newTrackers;
          });
        }
      }

      if (data.type === 'screen-playlist-updated') {
        const messageScreenId = data.data?.screenId;
        const newPlaylistId = data.data?.playlistId;
        const screenId = localStorage.getItem('screenId');

        if (messageScreenId === screenId) {
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
    const unsubscribePlaylistItemDeleted = wsManager.subscribe('playlist-item-deleted', handleWebSocketMessage);
    const unsubscribePlaybackControl = wsManager.subscribe('playback-control', handleWebSocketMessage);
    const unsubscribeScreenPlaylist = wsManager.subscribe('screen-playlist-updated', handleWebSocketMessage);

    // Heartbeat cada 2 minutos para reducir la carga
    const sendHeartbeat = () => {
      if (wsManager.isConnected()) {
        wsManager.send({ 
          type: 'player-heartbeat', 
          timestamp: new Date().toISOString(),
          screenId: localStorage.getItem('screenId')
        });
        console.log('💓 WebSocket heartbeat sent');
      } else {
        console.log('💓 Sending HTTP heartbeat (WebSocket not connected)');
        // Fallback HTTP heartbeat si WebSocket no está conectado
        fetch('/api/screens/heartbeat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }).then(response => {
          if (response.ok) {
            console.log('💓 HTTP heartbeat successful');
          }
        }).catch(error => {
          console.error('💓 HTTP Heartbeat failed:', error);
        });
      }
    };

    // Enviar heartbeat inmediato y luego cada 2 minutos
    sendHeartbeat();
    const heartbeatTimer = setInterval(sendHeartbeat, 120000); // 2 minutos

    return () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      unsubscribePlaylistChange();
      unsubscribePlaylistContent();
      unsubscribePlaylistItemDeleted();
      unsubscribePlaybackControl();
      unsubscribeScreenPlaylist();
      console.log('💓 Stopped heartbeat and monitoring');
    };
  }, [isPreview, playlistId]);

  // Inicializa o actualiza los trackers cuando la playlist cambia
  useEffect(() => {
    if (playlist?.items && Array.isArray(playlist.items)) {
      console.log('Playlist changed, updating trackers:', playlist.items);

      const zones: Record<string, PlaylistItem[]> = {};
      const layout = playlist.layout || 'single_zone';

      switch (layout) {
        case 'split_vertical':
          zones['left'] = [];
          zones['right'] = [];
          break;
        case 'split_horizontal':
          zones['top'] = [];
          zones['bottom'] = [];
          break;
        case 'pip_bottom_right':
          zones['main'] = [];
          zones['pip'] = [];
          break;
        case 'grid_2x2':
          zones['top_left'] = [];
          zones['top_right'] = [];
          zones['bottom_left'] = [];
          zones['bottom_right'] = [];
          break;
        case 'grid_3x3':
          zones['grid_1'] = [];
          zones['grid_2'] = [];
          zones['grid_3'] = [];
          zones['grid_4'] = [];
          zones['grid_5'] = [];
          zones['grid_6'] = [];
          zones['grid_7'] = [];
          zones['grid_8'] = [];
          zones['grid_9'] = [];
          break;
        case 'sidebar_left':
          zones['sidebar'] = [];
          zones['main'] = [];
          break;
        case 'sidebar_right':
          zones['main'] = [];
          zones['sidebar'] = [];
          break;
        case 'header_footer':
          zones['header'] = [];
          zones['main'] = [];
          zones['footer'] = [];
          break;
        case 'triple_vertical':
          zones['left'] = [];
          zones['center'] = [];
          zones['right'] = [];
          break;
        case 'triple_horizontal':
          zones['top'] = [];
          zones['middle'] = [];
          zones['bottom'] = [];
          break;
        case 'custom_layout':
          // Para layout personalizado, usar configuración
          if (playlist.customLayoutConfig) {
            try {
              const customConfig = JSON.parse(playlist.customLayoutConfig);
              if (customConfig.zones) {
                customConfig.zones.forEach((zone: any) => {
                  zones[zone.id] = [];
                });
              }
            } catch (e) {
              console.error('Error parsing custom layout config:', e);
              zones['main'] = [];
            }
          } else {
            zones['main'] = [];
          }
          break;
        case 'single_zone':
        default:
          zones['main'] = [];
          break;
      }

      for (const item of playlist.items) {
        const zone = item.zone || 'main';
        if (!zones[zone]) {
          zones[zone] = [];
        }
        zones[zone].push(item);
      }

      for(const zone in zones) {
        zones[zone].sort((a,b) => (a.order || 0) - (b.order || 0));
      }

      const newTrackers: Record<string, ZoneTracker> = {};
      for (const zoneId in zones) {
        newTrackers[zoneId] = {
          currentIndex: 0,
          items: zones[zoneId],
        };
      }

      setZoneTrackers(newTrackers);
    } else {
      setZoneTrackers({});
    }
  }, [playlist?.id, playlist?.items, playlist?.layout]);

  // Lógica de temporizadores para cada zona
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    for (const zoneId in zoneTrackers) {
      const tracker = zoneTrackers[zoneId];
      if (tracker.items.length > 0) {
        const currentItem = tracker.items[tracker.currentIndex];
        const duration = (currentItem.customDuration || currentItem.contentItem.duration || 10) * 1000;

        const timer = setTimeout(() => {
          setZoneTrackers(prev => ({
            ...prev,
            [zoneId]: {
              ...prev[zoneId],
              currentIndex: (prev[zoneId].currentIndex + 1) % prev[zoneId].items.length,
            },
          }));
        }, duration);

        timers.push(timer);
      }
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [zoneTrackers]);

  // Manejar la expiración de alertas
  const handleAlertExpired = useCallback((alertId: number) => {
    console.log(`🔔 Alert ${alertId} expired`);
    setActiveAlerts(prev => {
      const filtered = prev.filter(alert => alert.id !== alertId);
      console.log(`🔔 Removed alert ${alertId}, remaining alerts:`, filtered.length);
      return filtered;
    });

    // Clear any existing timer for this alert
    if (alertTimers.has(alertId)) {
      clearTimeout(alertTimers.get(alertId));
      alertTimers.delete(alertId);
    }

    if (!isPreview) {
      const authToken = localStorage.getItem('authToken');
      fetch(`/api/player/alerts/${alertId}/expire`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        console.error('Failed to expire alert:', error);
      });
    }
  }, [isPreview]);

  // Escuchar actualizaciones de alertas via WebSocket con caducidad automática
  const alertTimers = new Map<number, NodeJS.Timeout>();

  const handleAlertMessage = useCallback((data: any) => {
    console.log('🔔 Alert message received:', data);

    if (data.deleted || data.type === 'alert-deleted') {
      const alertId = data.id || data.data?.id;
      console.log(`🔔 Deleting alert ${alertId}`);

      setActiveAlerts(prev => {
        const filtered = prev.filter(alert => alert.id !== alertId);
        console.log(`🔔 Alerts after deletion:`, filtered.length);
        return filtered;
      });

      // Clear timer if exists
      if (alertTimers.has(alertId)) {
        clearTimeout(alertTimers.get(alertId));
        alertTimers.delete(alertId);
        console.log(`🔔 Cleared timer for deleted alert ${alertId}`);
      }
      return;
    }

    const alert = (data.data || data) as Alert;
    if (!alert || !alert.isActive) {
      console.log('🔔 Ignoring inactive alert:', alert);
      return;
    }

    console.log(`🔔 Processing alert ${alert.id}:`, alert);

    setActiveAlerts(prev => {
      const existing = prev.find(a => a.id === alert.id);
      if (existing) {
        // Update existing alert
        console.log(`🔔 Updating existing alert ${alert.id}`);
        return prev.map(a => a.id === alert.id ? alert : a);
      }
      console.log(`🔔 Adding new alert ${alert.id}`);
      return [...prev, alert];
    });

    // Auto-remove alert after duration (only for non-fixed alerts)
    if (alert.duration > 0 && !alert.isFixed) {
      // Clear any existing timer for this alert
      if (alertTimers.has(alert.id)) {
        clearTimeout(alertTimers.get(alert.id));
      }

      const timer = setTimeout(() => {
        console.log(`🔔 Auto-expiring alert ${alert.id} after ${alert.duration} seconds`);
        handleAlertExpired(alert.id);
      }, alert.duration * 1000);

      alertTimers.set(alert.id, timer);
      console.log(`🔔 Alert ${alert.id} will expire in ${alert.duration} seconds`);
    }
  }, [handleAlertExpired]);

  useEffect(() => {
    if (isPreview) return;

    // Subscribe to alerts
    const unsubscribeAlert = wsManager.subscribe('alert', handleAlertMessage);
    const unsubscribeAlertDeleted = wsManager.subscribe('alert-deleted', handleAlertMessage);

    // Fetch active alerts on mount
    const fetchActiveAlerts = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          console.warn('No auth token available for fetching alerts');
          return;
        }

        const response = await fetch('/api/player/alerts', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const alerts = await response.json();
          console.log('📡 Fetched active alerts for player:', alerts.length);
          setActiveAlerts(alerts.filter((alert: Alert) => alert.isActive));
        } else {
          console.warn('Failed to fetch player alerts:', response.status);
        }
      } catch (error) {
        console.error('Error fetching active alerts:', error);
      }
    };

    // Wait a bit for auth to be ready, then fetch alerts
    setTimeout(fetchActiveAlerts, 500);

    // Cleanup timers on unmount
    return () => {
      unsubscribeAlert();
      unsubscribeAlertDeleted();
      alertTimers.forEach(timer => clearTimeout(timer));
      alertTimers.clear();
    };
  }, [isPreview, handleAlertMessage]);

  // Función para renderizar el contenido de un item
  const renderContentItem = (item: PlaylistItem, zoneId?: string) => {
    if (!item?.contentItem) {
      return (
        <div style={{ 
          ...styles.media, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'rgba(255,255,255,0.5)',
          backgroundColor: '#1a1a1a'
        }}>
          Sin contenido disponible
        </div>
      );
    }

    const { type, url, title } = item.contentItem;

    // Obtener configuración de objectFit para la zona
    let zoneSettings: any = {};
    try {
      if (playlist?.zoneSettings && typeof playlist.zoneSettings === 'string') {
        zoneSettings = JSON.parse(playlist.zoneSettings);
      } else if (playlist?.zoneSettings && typeof playlist.zoneSettings === 'object') {
        zoneSettings = playlist.zoneSettings;
      }
    } catch (e) {
      console.warn('Error parsing zone settings:', e);
      zoneSettings = {};
    }

    const currentZoneId = zoneId || 'main';
    const objectFit = zoneSettings[currentZoneId]?.objectFit || 'contain';

    console.log(`Zone ${currentZoneId} objectFit:`, objectFit, 'from settings:', zoneSettings);

    const isYouTubeURL = (url: string) => {
      if (!url || typeof url !== 'string') {
        return false;
      }

      try {
        const cleanUrl = url.trim().toLowerCase();
        return cleanUrl.includes('youtube.com/watch') || 
               cleanUrl.includes('youtu.be/') || 
               cleanUrl.includes('youtube.com/embed/') ||
               cleanUrl.includes('youtube.com/v/');
      } catch (e) {
        console.error('Error validating YouTube URL:', e);
        return false;
      }
    };

    if (isYouTubeURL(url)) {
      return <YouTubePlayer url={url} />;
    }

    switch (type) {
      case 'image': 
        return <ImagePlayer src={url} objectFit={objectFit} />;
      case 'video': 
        return <VideoPlayer src={url} objectFit={objectFit} />;
      case 'pdf':
        return <PDFPlayer src={url} />;
      case 'webpage': 
        return <WebpagePlayer src={url} />;
      default: 
        return (
          <div style={{ 
            ...styles.media, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'rgba(255,255,255,0.5)',
            backgroundColor: '#1a1a1a'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>❓</div>
              <div>Tipo de contenido no soportado: {type}</div>
            </div>
          </div>
        );
    }
  };

  // Función para renderizar una zona específica
  const renderZone = (zoneId: string) => {
    const tracker = zoneTrackers[zoneId];
    if (!tracker || tracker.items.length === 0) {
      return null;
    }
    const currentItem = tracker.items[tracker.currentIndex];
    return renderContentItem(currentItem, zoneId);
  };

  // Si no hay playlistId, mostrar mensaje de espera
  if (!playlistId) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '15px' }}>⏳ Esperando configuración</div>
            <div style={{ fontSize: '16px', opacity: 0.8, maxWidth: '600px', lineHeight: '1.5' }}>
              Esta pantalla está emparejada pero no tiene una playlist asignada.
              <br />
              Asigna una playlist desde el panel de administración para comenzar la reproducción.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>Cargando Playlist...</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>ID: {playlistId}</div>
        </div>
      </div>
    </div>
  );

  if (!playlist) return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>Playlist no encontrada</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>ID: {playlistId}</div>
        </div>
      </div>
    </div>
  );

  // Renderizado del Layout
  const layout = playlist?.layout || 'single_zone';

  const renderZoneContent = (zoneId: string) => {
    const tracker = zoneTrackers[zoneId];
    if (!tracker || tracker.items.length === 0) {
      return null;
    }
    const currentItem = tracker.items[tracker.currentIndex];
    return renderContentItem(currentItem, zoneId);
  }

  switch (layout) {
    case 'custom_layout': {
      let customZones: any[] = [];
      let customConfig: any = {};

      try {
        // Handle both string and object types for customLayoutConfig
        if (typeof playlist.customLayoutConfig === 'string') {
          customConfig = JSON.parse(playlist.customLayoutConfig);
        } else if (typeof playlist.customLayoutConfig === 'object' && playlist.customLayoutConfig !== null) {
          customConfig = playlist.customLayoutConfig;
        }

        customZones = customConfig.zones || [];
        console.log('Custom layout zones:', customZones);
      } catch (e) {
        console.error('Error parsing custom layout config:', e, 'Config:', playlist.customLayoutConfig);
        // Fallback to default layout if custom config fails
        return (
          <div style={styles.container}>
            {renderZone('main') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Error en configuración personalizada: {e.message}
              </div>
            )}
            {widgets.filter(w => w.isEnabled).map((widget) => (
              <WidgetRenderer key={widget.id} widget={widget} />
            ))}
            {activeAlerts.map((alert) => (
              <AlertOverlay
                key={alert.id}
                alert={alert}
                onAlertExpired={handleAlertExpired}
              />
            ))}
          </div>
        );
      }

      if (customZones.length === 0) {
        // Check if there are items in the main zone
        const mainZoneItems = zoneTrackers['main']?.items || [];
        return (
          <div style={styles.container}>
            {mainZoneItems.length > 0 ? renderZone('main') : (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚙️</div>
                  <div>Layout personalizado sin zonas configuradas</div>
                  <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '5px' }}>
                    Configure las zonas en el editor de layout
                  </div>
                </div>
              </div>
            )}
            {widgets.filter(w => w.isEnabled).map((widget) => (
              <WidgetRenderer key={widget.id} widget={widget} />
            ))}
            {activeAlerts.map((alert) => (
              <AlertOverlay
                key={alert.id}
                alert={alert}
                onAlertExpired={handleAlertExpired}
              />
            ))}
          </div>
        );
      }

      return (
        <div style={{ 
          ...styles.container, 
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden'
        }}>
          {customZones.map((zone: any) => (
            <div
              key={zone.id}
              style={{
                position: 'absolute',
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                border: isPreview ? '1px solid rgba(255,255,255,0.1)' : 'none',
                borderRadius: '4px',
                overflow: 'hidden',
                zIndex: 1
              }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {renderZoneContent(zone.id) ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {renderZoneContent(zone.id)}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: Math.max(12, Math.min(zone.width, zone.height) * 0.8) + 'px',
                    textAlign: 'center',
                    padding: '8px',
                    width: '100%',
                    height: '100%'
                  }}>
                    <div>
                      <div style={{ marginBottom: '4px' }}>{zone.title}</div>
                      <div style={{ fontSize: '0.8em', opacity: 0.7 }}>Sin contenido</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {widgets.filter(w => w.isEnabled).map(widget => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}
          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );
    }
    case 'split_vertical':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '50%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('left') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona izquierda
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, width: '50%' }}>
            {renderZone('right') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona derecha
              </div>
            )}
          </div>

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );

    case 'grid_2x2':
      return (
        <div style={{ ...styles.container, display: 'grid', gridTemplate: '1fr 1fr / 1fr 1fr', gap: '2px' }}>
          <div style={{ ...styles.zone, backgroundColor: '#111' }}>
            {renderZone('top_left') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Superior Izquierda
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, backgroundColor: '#111' }}>
            {renderZone('top_right') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Superior Derecha
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, backgroundColor: '#111' }}>
            {renderZone('bottom_left') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Inferior Izquierda
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, backgroundColor: '#111' }}>
            {renderZone('bottom_right') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Inferior Derecha
              </div>
            )}
          </div>

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );

    case 'sidebar_left':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '25%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('sidebar') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Barra Lateral
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, width: '75%' }}>
            {renderZone('main') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Contenido Principal
              </div>
            )}
          </div>

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );

    case 'grid_3x3':
      return (
        <div style={{ ...styles.container, display: 'grid', gridTemplate: '1fr 1fr 1fr / 1fr 1fr 1fr', gap: '2px' }}>
          {Array.from({length: 9}, (_, i) => {
            const zoneId = `grid_${i + 1}`;
            return (
              <div key={zoneId} style={{ ...styles.zone, backgroundColor: '#111' }}>
                {renderZone(zoneId) || (
                  <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                    Celda {i + 1}
                  </div>
                )}
              </div>
            );
          })}

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );

    case 'sidebar_right':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '75%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('main') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Contenido Principal
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, width: '25%' }}>
            {renderZone('sidebar') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Barra Lateral
              </div>
            )}
          </div>

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );

    case 'header_footer':
      return (
        <div style={{ ...styles.container, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...styles.zone, height: '15%', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('header') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Cabecera
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, height: '70%' }}>
            {renderZone('main') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Contenido Principal
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, height: '15%', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('footer') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Pie de Página
              </div>
            )}
          </div>

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );

    case 'triple_vertical':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '33.33%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('left') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Izquierda
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, width: '33.33%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('center') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Centro
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, width: '33.33%' }}>
            {renderZone('right') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Derecha
              </div>
            )}
          </div>

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );

    case 'triple_horizontal':
      return (
        <div style={{ ...styles.container, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...styles.zone, height: '33.33%', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('top') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Superior
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, height: '33.33%', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('middle') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Medio
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, height: '33.33%' }}>
            {renderZone('bottom') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Inferior
              </div>
            )}
          </div>

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );

    case 'carousel':
      return (
        <div style={styles.container}>
          {renderZone('main') || (
            <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Carrusel sin contenido
            </div>
          )}

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );

    case 'web_scroll':
      return (
        <div style={styles.container}>
          {renderZone('main') || (
            <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Scroll Web sin contenido
            </div>
          )}

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );


    case 'pip_bottom_right':
      return (
        <div style={{...styles.container, position: 'relative' }}>
          <div style={{...styles.zone}}>
            {renderZone('main') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido principal
              </div>
            )}
          </div>
          <div style={{
            position: 'absolute', 
            bottom: '20px', 
            right: '20px', 
            width: '25%', 
            height: '25%', 
            border: '3px solid rgba(255,255,255,0.8)', 
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 10
          }}>
            {renderZone('pip') || (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                Sin PiP
              </div>
            )}
          </div>

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );
    case 'single_zone':
    default:
      return (
        <div style={styles.container}>
          {renderZone('main') || (
            <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Sin contenido
            </div>
          )}

          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {activeAlerts.map((alert) => (
            <AlertOverlay
              key={alert.id}
              alert={alert}
              onAlertExpired={handleAlertExpired}
            />
          ))}
        </div>
      );
  }
}