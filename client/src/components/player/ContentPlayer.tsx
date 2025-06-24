
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { wsManager } from "@/lib/websocket";
import { AlertOverlay } from "@/components/player/AlertOverlay";
import { apiRequest } from "@/lib/queryClient";
import PDFPlayer from './PDFPlayer';

// Estilos para el reproductor
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

// Componentes memoizados para renderizar cada tipo de contenido
const ImagePlayer = memo(({ src, objectFit = 'contain' }: { src: string, objectFit?: string }) => 
  <img src={src} style={getMediaStyle(objectFit)} alt="" />
);
ImagePlayer.displayName = 'ImagePlayer';

const VideoPlayer = memo(({ src, objectFit = 'contain' }: { src: string, objectFit?: string }) => 
  <video src={src} style={getMediaStyle(objectFit)} autoPlay muted loop playsInline />
);
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
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [zoneTrackers, setZoneTrackers] = useState<Record<string, ZoneTracker>>({});
  const queryClient = useQueryClient();

  const { data: playlist, isLoading } = useQuery<any & { items: any[] }>({
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

  // Memoizar el parsing del custom layout config
  const customLayoutConfig = useMemo(() => {
    if (!playlist?.customLayoutConfig) return {};

    try {
      if (typeof playlist.customLayoutConfig === 'string') {
        return JSON.parse(playlist.customLayoutConfig);
      } else if (typeof playlist.customLayoutConfig === 'object' && playlist.customLayoutConfig !== null) {
        return playlist.customLayoutConfig;
      }
    } catch (e) {
      console.error('Error parsing custom layout config:', e);
    }
    return {};
  }, [playlist?.customLayoutConfig]);

  // Memoizar el procesamiento de zones - optimización costosa
  const processedZones = useMemo(() => {
    if (!playlist?.items || !Array.isArray(playlist.items)) {
      return {};
    }

    console.log('Processing zones for playlist:', playlist.items);

    const zones: Record<string, any[]> = {};
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
        for (let i = 1; i <= 9; i++) {
          zones[`grid_${i}`] = [];
        }
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
        if (customLayoutConfig.zones) {
          customLayoutConfig.zones.forEach((zone: any) => {
            zones[zone.id] = [];
          });
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

    for (const zone in zones) {
      zones[zone].sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    return zones;
  }, [playlist?.items, playlist?.layout, customLayoutConfig]);

  // Inicializa o actualiza los trackers cuando las zones cambian
  useEffect(() => {
    const newTrackers: Record<string, ZoneTracker> = {};
    for (const zoneId in processedZones) {
      newTrackers[zoneId] = {
        currentIndex: 0,
        items: processedZones[zoneId],
      };
    }
    setZoneTrackers(newTrackers);
  }, [processedZones]);

  // Memoizar la configuración de zone settings
  const zoneSettings = useMemo(() => {
    try {
      if (playlist?.zoneSettings && typeof playlist.zoneSettings === 'string') {
        return JSON.parse(playlist.zoneSettings);
      } else if (playlist?.zoneSettings && typeof playlist.zoneSettings === 'object') {
        return playlist.zoneSettings;
      }
    } catch (e) {
      console.warn('Error parsing zone settings:', e);
    }
    return {};
  }, [playlist?.zoneSettings]);

  // Función memoizada para renderizar el contenido de un item
  const renderContentItem = useCallback((item: any, zoneId?: string) => {
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

    const currentZoneId = zoneId || 'main';
    const objectFit = zoneSettings[currentZoneId]?.objectFit || 'contain';

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
  }, [zoneSettings]);

  // Función memoizada para renderizar una zona específica
  const renderZone = useCallback((zoneId: string) => {
    const tracker = zoneTrackers[zoneId];
    if (!tracker || tracker.items.length === 0) {
      return (
        <div style={{ 
          ...styles.zone, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'rgba(255,255,255,0.5)',
          backgroundColor: '#1a1a1a'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', marginBottom: '5px' }}>{zoneId}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Sin contenido</div>
          </div>
        </div>
      );
    }
    const currentItem = tracker.items[tracker.currentIndex];
    return renderContentItem(currentItem, zoneId);
  }, [zoneTrackers, renderContentItem]);

  // Optimizar lógica de temporizadores para cada zona
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Crear una representación estable de los ítems actuales
    const currentItems = Object.entries(zoneTrackers).map(([zoneId, tracker]) => ({
      zoneId,
      currentIndex: tracker.currentIndex,
      itemCount: tracker.items.length,
      currentItem: tracker.items[tracker.currentIndex]
    }));

    for (const { zoneId, currentIndex, itemCount, currentItem } of currentItems) {
      if (itemCount > 0 && currentItem) {
        const duration = (currentItem.customDuration || currentItem.contentItem?.duration || 10) * 1000;

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

  switch (layout) {
    case 'split_vertical':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '50%', borderRight: '2px solid rgba(255,255,255,0.1)' }}>
            {renderZone('left')}
          </div>
          <div style={{ ...styles.zone, width: '50%' }}>
            {renderZone('right')}
          </div>
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
          {activeAlerts.map((alert) => (
            <AlertOverlay key={alert.id} alert={alert} onAlertExpired={() => {}} />
          ))}
        </div>
      );
  }
}
