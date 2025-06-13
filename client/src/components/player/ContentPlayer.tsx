// client/src/components/player/ContentPlayer.tsx (versión completa y mejorada)

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AlertOverlay } from './AlertOverlay';
import type { Playlist, PlaylistItem, Widget, Alert } from '@shared/schema';
import { wsManager } from '@/lib/websocket';

// --- Estilos para el reproductor ---
const styles = {
  container: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', color: 'white', overflow: 'hidden' } as React.CSSProperties,
  media: { width: '100%', height: '100%', objectFit: 'cover' } as React.CSSProperties, // 'cover' suele ser mejor para signage
  zone: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' } as React.CSSProperties,
};

// --- Componentes para renderizar cada tipo de contenido (sin cambios) ---
const ImagePlayer = ({ src }: { src: string }) => <img src={src} style={styles.media} alt="" />;
const VideoPlayer = ({ src }: { src: string }) => <video src={src} style={styles.media} autoPlay muted loop playsInline />;
const WebpagePlayer = ({ src }: { src: string }) => <iframe src={src} style={{ ...styles.media, border: 'none' }} title="web-content" />;

// Dedicated PDF Player Component
const PDFPlayer = ({ src }: { src: string }) => {
  // Create a PDF viewer URL using PDF.js or Google Docs viewer
  const pdfViewerUrl = src.startsWith('http') 
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`
    : `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + src)}&embedded=true`;

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
    />
  );
};

// YouTube Player Component with autoplay and loop
const YouTubePlayer = ({ url }: { url: string }) => {
  // Extract YouTube video ID from URL
  const getYouTubeID = (url: string) => {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^#\&\?]*)/,
      /youtube\.com\/watch\?.*v=([^#\&\?]*)/,
      /youtu\.be\/([^#\&\?]*)/,
      /youtube\.com\/embed\/([^#\&\?]*)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }
    return null;
  };

  const videoId = getYouTubeID(url);

  if (!videoId) {
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
          <div>URL de YouTube no válida</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>{url}</div>
        </div>
      </div>
    );
  }

  // Build embed URL with all kiosk mode parameters
  const embedUrl = `https://www.youtube.com/embed/${videoId}?` + [
    'autoplay=1',           // Auto-start video
    'mute=1',              // Muted (required for autoplay)
    'loop=1',              // Loop the video
    `playlist=${videoId}`,  // Required for loop to work
    'controls=0',          // Hide player controls
    'showinfo=0',          // Hide video info
    'iv_load_policy=3',    // Hide annotations
    'modestbranding=1',    // Minimal YouTube branding
    'rel=0',               // Don't show related videos
    'fs=0',                // Disable fullscreen
    'disablekb=1',         // Disable keyboard controls
    'cc_load_policy=0',    // Disable closed captions
    'playsinline=1',       // Play inline on mobile
    'enablejsapi=1'        // Enable JavaScript API
  ].join('&');

  return (
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
    />
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
      }, 10000); // Cambia cada 10 segundos
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
  const queryClient = useQueryClient();

  const { data: playlist, isLoading } = useQuery<Playlist & { items: PlaylistItem[] }>({
    queryKey: isPreview ? ['/api/playlists', playlistId] : ['/api/player/playlists', playlistId],
    queryFn: () => {
      const endpoint = isPreview ? `/api/playlists/${playlistId}` : `/api/player/playlists/${playlistId}`;
      console.log(`🎵 Fetching playlist data from: ${endpoint}`);

      if (isPreview) {
        return apiRequest(endpoint).then(res => res.json());
      } else {
        // For player, use direct fetch with auth token
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
        }).then(data => {
          console.log(`🎵 Playlist data received:`, data);
          return data;
        });
      }
    },
    enabled: !!playlistId,
    refetchInterval: isPreview ? 30000 : false, // Reduce frequency for preview
    staleTime: isPreview ? 30000 : 60000, // Cache data longer
    gcTime: 300000, // Keep cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true,
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
            throw new Error('Failed to fetch alerts');
          }
          return res.json();
        });
      }
    },
    refetchInterval: 5000, // Verificar alertas cada 5 segundos
    enabled: !!playlistId,
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
        // Para el player, necesitamos pasar el token de autenticación
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
    refetchInterval: isPreview ? 10000 : 120000, // Actualiza widgets
    enabled: !!playlistId, // Solo ejecutar si hay playlist
  });

  // Real-time update system using WebSocket and polling fallback
  useEffect(() => {
    if (isPreview) return;

    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;

    let validationInterval: NodeJS.Timeout;
    let lastPlaylistId = playlistId;

    // Connect to WebSocket with player authentication
    console.log('🔌 Connecting player WebSocket...');
    wsManager.connect(undefined, authToken);

    // Handle WebSocket messages
    const handleWebSocketMessage = (data: any) => {
      console.log('🎵 WebSocket message received in player:', data);

      if (data.type === 'playlist-change') {
        console.log('🔄 Playlist change detected via WebSocket:', data.data);

        // Force page reload for playlist assignment changes
        setTimeout(() => {
          console.log('🔄 Reloading page due to playlist assignment change...');
          window.location.reload();
        }, 1000);
      } else if (data.type === 'playlist-content-updated') {
        console.log('📝 Playlist content updated, refreshing...');

        // Invalidate and refetch playlist data
        queryClient.invalidateQueries({ queryKey: ['/api/player/playlists', playlistId] });
        queryClient.refetchQueries({ 
          queryKey: ['/api/player/playlists', playlistId],
          type: 'active'
        });

        // Reset current index if it's out of bounds
        if (data.playlist && data.playlist.items) {
          const newItemCount = data.playlist.items.length;
          //if (currentIndex >= newItemCount && newItemCount > 0) {
          //  setCurrentIndex(0);
          //} else if (newItemCount === 0) {
          //  setIsPlaying(false);
          //}
        }
      } else if (data.type === 'playlist-update') {
        console.log('🔄 Generic playlist update detected via WebSocket:', data.data);

        // Handle generic playlist updates
        if (data.data.playlist?.id === playlistId) {
          console.log('🎯 Playlist update is for current playlist, refreshing...');

          // Invalidate and refetch playlist data
          queryClient.invalidateQueries({ queryKey: ['/api/player/playlists', playlistId] });
          queryClient.refetchQueries({ 
            queryKey: ['/api/player/playlists', playlistId],
            type: 'active'
          });
        }
      }
    };

    // Subscribe to playlist changes
    const unsubscribePlaylist = wsManager.subscribe('playlist-change', handleWebSocketMessage);

    // Fallback: Check for playlist changes periodically 
    const checkForUpdates = () => {
      fetch('/api/player/validate-token', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then(res => res.json()).then(data => {
        if (data.valid && data.screen) {
          const currentPlaylistId = data.screen.playlistId;

          // Only update if playlist actually changed
          if (currentPlaylistId !== lastPlaylistId) {
            console.log(`🔄 Playlist changed from ${lastPlaylistId} to ${currentPlaylistId} (polling)`);
            lastPlaylistId = currentPlaylistId;

            // Reload the page to reflect the new playlist
            setTimeout(() => {
              console.log('🔄 Reloading page due to playlist change (polling)...');
              window.location.reload();
            }, 500);
          }
        }
      }).catch(error => {
        console.error('Validation error:', error);
      });
    };

    // Check every 5 seconds as fallback
    console.log('🔍 Starting playlist monitoring (fallback)...');
    validationInterval = setInterval(checkForUpdates, 5000);

    return () => {
      if (validationInterval) {
        clearInterval(validationInterval);
      }
      unsubscribePlaylist();
      console.log('🔍 Stopped playlist monitoring');
    };
  }, [isPreview, playlistId]);

  const [zoneTrackers, setZoneTrackers] = useState<Record<string, ZoneTracker>>({});

  // Manejar la expiración de alertas
  const handleAlertExpired = (alertId: number) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));

    // Si no es preview, marcar la alerta como inactiva en el servidor
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
  };

  // Additional effect to detect playlist changes and log them
  useEffect(() => {
    if (!isPreview && playlistId) {
      console.log(`🎵 Current playlistId: ${playlistId}`);
      console.log(`🎵 Playlist data:`, playlist);

      // Store current playlist ID for comparison
      const storedPlaylistId = localStorage.getItem('currentPlaylistId');
      if (storedPlaylistId !== String(playlistId)) {
        console.log(`🔄 Playlist ID changed from ${storedPlaylistId} to ${playlistId}`);
        localStorage.setItem('currentPlaylistId', String(playlistId));
      }
    }
  }, [playlistId, playlist, isPreview]);

  // 1. Inicializa o actualiza los trackers cuando la playlist cambia
  useEffect(() => {
    if (playlist?.items && Array.isArray(playlist.items)) {
      console.log('Playlist changed, updating trackers:', playlist.items);
      console.log('Playlist layout:', playlist.layout);

      const zones: Record<string, PlaylistItem[]> = {};

      // Inicializa las zonas según el layout
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
        case 'single_zone':
        default:
          zones['main'] = [];
          break;
      }

      // Agrupa items por zona
      for (const item of playlist.items) {
        const zone = item.zone || 'main';
        console.log(`Item ${item.id} assigned to zone: ${zone}, item:`, item);
        if (!zones[zone]) {
          zones[zone] = [];
        }
        zones[zone].push(item);
      }

      // Ordena los items dentro de cada zona por el campo order
      for(const zone in zones) {
        zones[zone].sort((a,b) => (a.order || 0) - (b.order || 0));
      }

      console.log('Zones created:', zones);

      const newTrackers: Record<string, ZoneTracker> = {};
      for (const zoneId in zones) {
        newTrackers[zoneId] = {
          currentIndex: 0,
          items: zones[zoneId],
        };
      }

      console.log('Zone trackers updated:', newTrackers);
      setZoneTrackers(newTrackers);
    } else {
      console.log('No playlist items, clearing trackers');
      setZoneTrackers({});
    }
  }, [playlist?.id, playlist?.items, playlist?.layout]); // More specific dependencies

  // 2. Lógica de temporizadores para cada zona
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
  }, [zoneTrackers]); // Se re-ejecuta cada vez que un índice cambia

  // --- Función para renderizar el contenido de un item ---
  const renderContentItem = (item: PlaylistItem) => {
    if (!item?.contentItem) {
      console.warn('No content item found for playlist item:', item);
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
    console.log(`Rendering content item: ${title} (${type}) - ${url}`);

    // Detect YouTube URLs for special handling
    const isYouTubeURL = (url: string) => {
      return url && (
        url.includes('youtube.com/watch') || 
        url.includes('youtu.be/') || 
        url.includes('youtube.com/embed/') ||
        url.includes('youtube.com/v/')
      );
    };

    // Handle YouTube URLs with special player
    if (isYouTubeURL(url)) {
      console.log('Detected YouTube URL, using YouTubePlayer:', url);
      return <YouTubePlayer url={url} />;
    }

    switch (type) {
      case 'image': 
        return <ImagePlayer src={url} />;
      case 'video': 
        return <VideoPlayer src={url} />;
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

  // --- Función para renderizar una zona específica ---
  const renderZone = (zoneId: string) => {
    const tracker = zoneTrackers[zoneId];
    console.log(`Rendering zone ${zoneId}:`, tracker);
    if (!tracker || tracker.items.length === 0) {
      console.log(`Zone ${zoneId} has no content`);
      return null;
    }
    const currentItem = tracker.items[tracker.currentIndex];
    console.log(`Zone ${zoneId} current item:`, currentItem);
    return renderContentItem(currentItem);
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

  // --- Renderizado del Layout ---
  const layout = playlist?.layout || 'single_zone';
  console.log('Rendering layout:', layout);

  // Debug: mostrar qué contenido hay en cada zona
  Object.keys(zoneTrackers).forEach(zoneId => {
    const tracker = zoneTrackers[zoneId];
    console.log(`Zone ${zoneId}: ${tracker.items.length} items, current index: ${tracker.currentIndex}`);
  });

  switch (layout) {
    case 'split_vertical':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '50%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('left') || (              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona izquierda
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, width: '50%' }}>
            {renderZone('right') || (
              <div 
 style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona derecha
              </div>
            )}
          </div>

          {/* Widgets Overlay */}
          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}
        </div>
      );
    case 'split_horizontal':
      return (
        <div style={{ ...styles.container, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...styles.zone, height: '50%', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('top') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona superior
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, height: '50%' }}>
            {renderZone('bottom') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona inferior
              </div>
            )}
          </div>

          {/* Widgets Overlay */}
          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
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

          {/* Widgets Overlay */}
          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {/* Alerts Overlay */}
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

          {/* Widgets Overlay */}
          {widgets.filter(w => w.isEnabled).map((widget) => (
            <WidgetRenderer key={widget.id} widget={widget} />
          ))}

          {/* Alerts Overlay */}
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