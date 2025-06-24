
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { wsManager } from "@/lib/websocket";
import PDFPlayer from "./PDFPlayer";
import { AlertOverlay } from "./AlertOverlay";
import { apiRequest } from "@/lib/queryClient";

// Estilos para el reproductor
const styles = {
  container: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', color: 'white', overflow: 'hidden' } as React.CSSProperties,
  media: { width: '100%', height: '100%', objectFit: 'contain' } as React.CSSProperties,
  zone: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' } as React.CSSProperties,
};

// Función para obtener el estilo de media con objectFit personalizado
const getMediaStyle = (objectFit: string = 'contain'): React.CSSProperties => {
  const validObjectFitValues = ['contain', 'cover', 'fill', 'none', 'scale-down'];
  const finalObjectFit = validObjectFitValues.includes(objectFit) ? objectFit : 'contain';

  return {
    width: '100%',
    height: '100%',
    objectFit: finalObjectFit as any,
    backgroundColor: '#000',
    display: 'block',
    margin: 'auto'
  };
};

// Componentes memoizados para renderizar cada tipo de contenido
const ImagePlayer = memo(({ src, objectFit = 'contain' }: { src: string, objectFit?: string }) => {
  return (
    <img 
      src={src} 
      style={getMediaStyle(objectFit)} 
      alt=""
      onError={(e) => console.error('Error loading image:', e)}
      onLoad={() => console.log('Image loaded successfully')}
    />
  );
});
ImagePlayer.displayName = 'ImagePlayer';

const VideoPlayer = memo(({ src, objectFit = 'contain' }: { src: string, objectFit?: string }) => {
  return (
    <video 
      src={src} 
      style={getMediaStyle(objectFit)} 
      autoPlay 
      muted 
      loop 
      playsInline
      onError={(e) => console.error('Error loading video:', e)}
      onLoadedData={() => console.log('Video loaded successfully')}
    />
  );
});
VideoPlayer.displayName = 'VideoPlayer';

const WebpagePlayer = memo(({ src }: { src: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

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
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});
WebpagePlayer.displayName = 'WebpagePlayer';

// YouTube Player Component
const YouTubePlayer = memo(({ url }: { url: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const getYouTubeID = useCallback((url: string) => {
    if (!url || typeof url !== 'string') {
      return null;
    }

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
  }, []);

  const videoId = useMemo(() => getYouTubeID(url), [url, getYouTubeID]);

  const embedUrl = useMemo(() => {
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?` + [
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
  }, [videoId]);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

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
        key={`youtube-${videoId}`}
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
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});
YouTubePlayer.displayName = 'YouTubePlayer';

interface ZoneTracker {
  currentIndex: number;
  items: any[];
}

export default function ContentPlayer({ playlistId, isPreview = false }: { playlistId?: number, isPreview?: boolean }) {
  const queryClient = useQueryClient();
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [zoneTrackers, setZoneTrackers] = useState<Record<string, ZoneTracker>>({});

  // Siempre renderizar todos los hooks en el mismo orden
  const { data: playlistData, isLoading } = useQuery<any & { items: any[] }>({
    queryKey: isPreview ? ['/api/playlists', playlistId] : ['/api/player/playlists', playlistId],
    queryFn: async () => {
      const endpoint = isPreview ? `/api/playlists/${playlistId}` : `/api/player/playlists/${playlistId}`;
      console.log(`🎵 Fetching playlist data from: ${endpoint}`);

      if (isPreview) {
        const response = await apiRequest(endpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch playlist: ${response.status}`);
        }
        return response.json();
      } else {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          throw new Error('No auth token found');
        }
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch playlist: ${response.status}`);
        }
        return response.json();
      }
    },
    enabled: !!playlistId,
    refetchInterval: isPreview ? 30000 : false,
    staleTime: isPreview ? 30000 : Infinity,
    gcTime: 300000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch widgets - SIEMPRE renderizar este hook
  const { data: widgets = [] } = useQuery({
    queryKey: ['user-widgets'],
    queryFn: async () => {
      console.log(`🔄 Fetching widgets for user`);
      if (isPreview) {
        const response = await apiRequest('/api/widgets');
        const data = await response.json();
        return data.filter((w: any) => w.isEnabled);
      } else {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          console.warn('No auth token found for widgets');
          return [];
        }
        const response = await fetch('/api/player/widgets', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          console.error('Failed to fetch widgets:', response.status);
          return [];
        }
        const data = await response.json();
        console.log(`✅ Fetched ${data.length} widgets for user`);
        return data;
      }
    },
    enabled: true, // Siempre habilitado
    retry: 1,
  });

  // Memoizar el parsing del custom layout config
  const customLayoutConfig = useMemo(() => {
    if (!playlistData?.customLayoutConfig) return {};

    try {
      if (typeof playlistData.customLayoutConfig === 'string') {
        return JSON.parse(playlistData.customLayoutConfig);
      } else if (typeof playlistData.customLayoutConfig === 'object' && playlistData.customLayoutConfig !== null) {
        return playlistData.customLayoutConfig;
      }
    } catch (e) {
      console.error('Error parsing custom layout config:', e);
    }
    return {};
  }, [playlistData?.customLayoutConfig]);

  // Determinar el layout
  const layout = useMemo(() => {
    return playlistData?.layout || 'single_zone';
  }, [playlistData?.layout]);

  // Process items into zones based on layout
  const zones = useMemo(() => {
    if (!playlistData?.items || !layout) return {};

    console.log('Processing zones for playlist:', playlistData.items);
    const zoneMap: { [key: string]: any[] } = {};

    playlistData.items.forEach((item: any) => {
      const zone = item.zone || 'main';
      if (!zoneMap[zone]) {
        zoneMap[zone] = [];
      }
      zoneMap[zone].push(item);
    });

    return zoneMap;
  }, [playlistData?.items, layout]);

  // Get unique zone names from the playlist items
  const zoneNames = useMemo(() => {
    if (!playlistData?.items) return ['main'];
    const uniqueZones = new Set(playlistData.items.map((item: any) => item.zone || 'main'));
    return Array.from(uniqueZones);
  }, [playlistData?.items]);

  // Create current item state for each zone
  const [currentItems, setCurrentItems] = useState<{ [key: string]: number }>({});

  // Initialize current items for all zones
  useEffect(() => {
    if (playlistData && zoneNames.length > 0) {
      const initialItems: { [key: string]: number } = {};
      zoneNames.forEach(zone => {
        initialItems[zone] = 0;
      });
      setCurrentItems(initialItems);
    }
  }, [playlistData, zoneNames]);

  // Zone advancement function
  const advanceZone = useCallback((zoneName: string) => {
    const zoneItems = zones[zoneName];
    if (zoneItems && zoneItems.length > 0) {
      setCurrentItems(prev => ({
        ...prev,
        [zoneName]: (prev[zoneName] + 1) % zoneItems.length
      }));
    }
  }, [zones]);

  // Enhanced timer with zone management
  useEffect(() => {
    if (!playlistData?.items || playlistData.items.length === 0) return;

    const intervals: { [key: string]: NodeJS.Timeout } = {};

    // Create timers for each zone
    Object.keys(zones).forEach(zoneName => {
      const zoneItems = zones[zoneName];
      if (zoneItems && zoneItems.length > 1) {
        intervals[zoneName] = setInterval(() => {
          advanceZone(zoneName);
        }, 5000); // 5 seconds per item
      }
    });

    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [zones, advanceZone, playlistData?.items]);

  // Memoizar la configuración de zone settings
  const zoneSettings = useMemo(() => {
    try {
      if (playlistData?.zoneSettings && typeof playlistData.zoneSettings === 'string') {
        return JSON.parse(playlistData.zoneSettings);
      } else if (playlistData?.zoneSettings && typeof playlistData.zoneSettings === 'object') {
        return playlistData.zoneSettings;
      }
    } catch (e) {
      console.warn('Error parsing zone settings:', e);
    }
    return {};
  }, [playlistData?.zoneSettings]);

  // Función memoizada para renderizar el contenido de un item
  const renderContentItem = useCallback((item: any, zoneId?: string) => {
    // Validación inicial del item
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

    // Validación de URL
    if (!url) {
      console.warn('No URL found in contentItem:', item.contentItem);
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
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
            <div>URL no encontrada</div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
              {title || 'Sin título'}
            </div>
          </div>
        </div>
      );
    }

    // Obtener configuración de objectFit para la zona actual
    const currentZoneId = zoneId || 'main';
    const objectFit = zoneSettings[currentZoneId]?.objectFit || 'contain';

    console.log(`🎯 Rendering content for zone ${currentZoneId}:`, {
      type,
      objectFit,
      zoneSettings: zoneSettings[currentZoneId],
      url: url.substring(0, 50) + '...'
    });

    // Función para validar URLs de YouTube
    const isYouTubeURL = (url: string): boolean => {
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

    // Manejo especial para URLs de YouTube
    if (isYouTubeURL(url)) {
      return <YouTubePlayer url={url} />;
    }

    // Renderizado según el tipo de contenido
    try {
      switch (type) {
        case 'image': 
          return <ImagePlayer src={url} objectFit={objectFit} />;

        case 'video': 
          return <VideoPlayer src={url} objectFit={objectFit} />;

        case 'pdf':
          // Mantener la lógica existente de renderizado de PDFs
          return <PDFPlayer src={url} objectFit={objectFit} />;

        case 'webpage': 
          return <WebpagePlayer src={url} />;

        case 'text':
          return (
            <div style={{ 
              ...styles.media, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white',
              backgroundColor: '#1a1a1a',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>📄</div>
                <div>{title || 'Contenido de texto'}</div>
              </div>
            </div>
          );

        default: 
          console.warn(`Unsupported content type: ${type}`);
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
                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
                  {title || 'Sin título'}
                </div>
              </div>
            </div>
          );
      }
    } catch (error) {
      console.error('Error rendering content item:', error);
      return (
        <div style={{ 
          ...styles.media, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'rgba(255,255,255,0.7)',
          backgroundColor: '#1a1a1a'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
            <div>Error al cargar contenido</div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
              {title || type || 'Error desconocido'}
            </div>
          </div>
        </div>
      );
    }
  }, [zoneSettings]);

  const renderZone = useCallback((zoneName: string, zoneStyles?: any) => {
    const zoneItems = zones[zoneName];
    if (!zoneItems || zoneItems.length === 0) {
      return <div style={{ ...styles.zone, ...zoneStyles }}>No items in zone {zoneName}</div>;
    }

    const currentItemIndex = currentItems[zoneName] || 0;
    const item = zoneItems[currentItemIndex];

    if (!item) {
      return <div style={{ ...styles.zone, ...zoneStyles }}>No item to display in zone {zoneName}</div>;
    }

    return renderContentItem(item, zoneName);
  }, [zones, currentItems, renderContentItem]);

  // WebSocket connection and real-time updates
  useEffect(() => {
    if (!isPreview && playlistId) {
      console.log('🔌 Setting up WebSocket for playlist updates...');

      // Try to connect WebSocket
      wsManager.connect().then(() => {
        console.log('✅ WebSocket connected for ContentPlayer');

        // Authenticate if we have a token
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          wsManager.authenticate(authToken).catch(console.error);
        }
      }).catch(console.error);

      // Handle playlist content updates
      const handlePlaylistUpdate = (data: any) => {
        console.log('🔄 Playlist update received:', data);
        if (data.playlistId === playlistId || data.data?.playlistId === playlistId) {
          console.log('♻️ Refreshing playlist content...');
          queryClient.invalidateQueries({ 
            queryKey: [isPreview ? '/api/playlists' : '/api/player/playlists', playlistId] 
          });
        }
      };

      // Handle playlist changes
      const handlePlaylistChange = (data: any) => {
        console.log('🎵 Playlist change received:', data);
        const newPlaylistId = data.playlistId || data.data?.playlistId;
        const screenId = localStorage.getItem('screenId');
        const messageScreenId = data.screenId || data.data?.screenId;

        if (messageScreenId && screenId && messageScreenId.toString() === screenId) {
          if (newPlaylistId && newPlaylistId !== playlistId) {
            console.log(`🔄 Reloading due to playlist change: ${playlistId} → ${newPlaylistId}`);
            window.location.reload();
          }
        }
      };

      // Subscribe to WebSocket events
      wsManager.on('playlist-content-updated', handlePlaylistUpdate);
      wsManager.on('playlist-change', handlePlaylistChange);
      wsManager.on('playlist-item-deleted', handlePlaylistUpdate);
      wsManager.on('playlist-item-added', handlePlaylistUpdate);

      return () => {
        wsManager.off('playlist-content-updated', handlePlaylistUpdate);
        wsManager.off('playlist-change', handlePlaylistChange);
        wsManager.off('playlist-item-deleted', handlePlaylistUpdate);
        wsManager.off('playlist-item-added', handlePlaylistUpdate);
      };
    }
  }, [isPreview, playlistId, queryClient]);

  const renderWidget = useCallback((widget: any) => {
    if (!widget || !widget.isEnabled) return null;

    // Determinar posición basada en el campo position
    let positionStyle: React.CSSProperties = {};

    switch (widget.position) {
      case 'top-left':
        positionStyle = { top: '20px', left: '20px' };
        break;
      case 'top-right':
        positionStyle = { top: '20px', right: '20px' };
        break;
      case 'bottom-left':
        positionStyle = { bottom: '20px', left: '20px' };
        break;
      case 'bottom-right':
        positionStyle = { bottom: '20px', right: '20px' };
        break;
      case 'center':
        positionStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        break;
      default:
        positionStyle = { top: '20px', right: '20px' };
    }

    const widgetStyle: React.CSSProperties = {
      position: 'absolute',
      ...positionStyle,
      zIndex: 100,
      pointerEvents: 'auto',
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      fontSize: '14px',
      minWidth: '200px',
    };

    // Renderizar según el tipo de widget
    let content = null;
    try {
      const config = JSON.parse(widget.config || '{}');

      switch (widget.type) {
        case 'clock':
          const now = new Date();
          content = (
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {now.toLocaleTimeString()}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {now.toLocaleDateString()}
              </div>
            </div>
          );
          break;
        case 'text':
          content = (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{widget.name}</div>
              <div>{config.text || 'Texto personalizado'}</div>
            </div>
          );
          break;
        case 'weather':
          content = (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Clima</div>
              <div>{config.city || 'Ciudad'} - 22°C</div>
            </div>
          );
          break;
        case 'news':
          content = (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Noticias</div>
              <div>Últimas noticias disponibles</div>
            </div>
          );
          break;
        default:
          content = (
            <div>
              <div style={{ fontWeight: 'bold' }}>{widget.name}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Widget {widget.type}</div>
            </div>
          );
      }
    } catch (error) {
      console.error('Error rendering widget:', error);
      content = (
        <div>
          <div style={{ fontWeight: 'bold' }}>{widget.name}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Error de configuración</div>
        </div>
      );
    }

    return (
      <div key={widget.id} style={widgetStyle}>
        {content}
      </div>
    );
  }, []);

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

  if (!playlistData) return (
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
  const layoutType = playlistData?.layout || 'single_zone';

  switch (layoutType) {
    case 'split_vertical':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '50%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('left')}
          </div>
          <div style={{ ...styles.zone, width: '50%' }}>
            {renderZone('right')}
          </div>
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );

    case 'split_horizontal':
      return (
        <div style={{ ...styles.container, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...styles.zone, height: '50%', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('top')}
          </div>
          <div style={{ ...styles.zone, height: '50%' }}>
            {renderZone('bottom')}
          </div>
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );

    case 'grid_2x2':
      return (
        <div style={{ ...styles.container, display: 'grid', gridTemplate: '1fr 1fr / 1fr 1fr', gap: '2px' }}>
          <div key="top_left" style={{ ...styles.zone, backgroundColor: '#111' }}>
            {renderZone('top_left')}
          </div>
          <div key="top_right" style={{ ...styles.zone, backgroundColor: '#111' }}>
            {renderZone('top_right')}
          </div>
          <div key="bottom_left" style={{ ...styles.zone, backgroundColor: '#111' }}>
            {renderZone('bottom_left')}
          </div>
          <div key="bottom_right" style={{ ...styles.zone, backgroundColor: '#111' }}>
            {renderZone('bottom_right')}
          </div>
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
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
                {renderZone(zoneId)}
              </div>
            );
          })}
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );

    case 'sidebar_left':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '25%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('sidebar')}
          </div>
          <div style={{ ...styles.zone, width: '75%' }}>
            {renderZone('main')}
          </div>
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );

    case 'sidebar_right':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '75%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('main')}
          </div>
          <div style={{ ...styles.zone, width: '25%' }}>
            {renderZone('sidebar')}
          </div>
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );

    case 'header_footer':
      return (
        <div style={{ ...styles.container, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...styles.zone, height: '15%', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('header')}
          </div>
          <div style={{ ...styles.zone, height: '70%' }}>
            {renderZone('main')}
          </div>
          <div style={{ ...styles.zone, height: '15%', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('footer')}
          </div>
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );

    case 'triple_vertical':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '33.33%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('left')}
          </div>
          <div style={{ ...styles.zone, width: '33.33%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('center')}
          </div>
          <div style={{ ...styles.zone, width: '33.33%' }}>
            {renderZone('right')}
          </div>
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}        
        </div>
      );

    case 'triple_horizontal':
      return (
        <div style={{ ...styles.container, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...styles.zone, height: '33.33%', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('top')}
          </div>
          <div style={{ ...styles.zone, height: '33.33%', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('middle')}
          </div>
          <div style={{ ...styles.zone, height: '33.33%' }}>
            {renderZone('bottom')}
          </div>
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );

    case 'pip_bottom_right':
      return (
        <div style={styles.container}>
          <div style={{ ...styles.zone, position: 'relative' }}>
            {renderZone('main')}
          </div>
          <div style={{ 
            ...styles.zone, 
            position: 'absolute', 
            bottom: '20px', 
            right: '20px', 
            width: '30%', 
            height: '30%',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {renderZone('pip')}
          </div>
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );

    case 'custom_layout': {
      const customZones = customLayoutConfig.zones || [];

      if (customZones.length === 0) {
        return (
          <div style={styles.container}>
            {renderZone('main')}
            {/* Widgets overlay */}
            {widgets && widgets.length > 0 && (
              <div className="absolute inset-0 pointer-events-none z-20">
                {widgets
                  .filter((widget: any) => widget.isEnabled)
                  .map((widget: any) => (
                    <div key={widget.id} className="pointer-events-auto">
                      {renderWidget(widget)}
                    </div>
                  ))}
              </div>
            )}
            {activeAlerts.map((alert) => (
              <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
            ))}
          </div>
        );
      }

      return (
        <div style={styles.container}>
          {customZones.map((zone: any) => (
            <div 
              key={zone.id}
              style={{
                position: 'absolute',
                left: `${zone.x || 0}%`,
                top: `${zone.y || 0}%`,
                width: `${zone.width || 100}%`,
                height: `${zone.height || 100}%`,
                ...styles.zone
              }}
            >
              {renderZone(zone.id)}
            </div>
          ))}
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );
    }

    case 'single_zone':
    default:
      return (
        <div style={styles.container}>
          {renderZone('main')}
          {/* Widgets overlay */}
          {widgets && widgets.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {widgets
                .filter((widget: any) => widget.isEnabled)
                .map((widget: any) => (
                  <div key={widget.id} className="pointer-events-auto">
                    {renderWidget(widget)}
                  </div>
                ))}
            </div>
          )}
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );
  }
}
