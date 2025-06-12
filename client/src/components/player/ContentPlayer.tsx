// client/src/components/player/ContentPlayer.tsx (versión completa y mejorada)

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Playlist, PlaylistItem } from '@shared/schema';

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

interface ZoneTracker {
  currentIndex: number;
  items: PlaylistItem[];
}

export default function ContentPlayer({ playlistId, isPreview = false }: { playlistId: number, isPreview?: boolean }) {
  const { data: playlist, isLoading } = useQuery<Playlist & { items: PlaylistItem[] }>({
    queryKey: ['/api/playlists', playlistId],
    queryFn: () => apiRequest(`/api/playlists/${playlistId}`).then(res => res.json()),
    enabled: !!playlistId,
    refetchInterval: 60000, // Refresca la playlist cada minuto
  });

  const [zoneTrackers, setZoneTrackers] = useState<Record<string, ZoneTracker>>({});

  // 1. Inicializa o actualiza los trackers cuando la playlist cambia
  useEffect(() => {
    if (playlist?.items) {
      const zones: Record<string, PlaylistItem[]> = {};

      // Agrupa items por zona
      for (const item of playlist.items) {
        const zone = item.zone || 'main';
        if (!zones[zone]) {
          zones[zone] = [];
        }
        zones[zone].push(item);
      }

      // Ordena los items dentro de cada zona
      for(const zone in zones) {
        zones[zone].sort((a,b) => a.order - b.order);
      }

      const newTrackers: Record<string, ZoneTracker> = {};
      for (const zoneId in zones) {
        newTrackers[zoneId] = {
          currentIndex: 0,
          items: zones[zoneId],
        };
      }
      setZoneTrackers(newTrackers);
    }
  }, [playlist]);

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
    if (!item?.contentItem) return null;
    const { type, url } = item.contentItem;

    switch (type) {
      case 'image': return <ImagePlayer src={url} />;
      case 'video': return <VideoPlayer src={url} />;
      case 'pdf':
      case 'webpage': return <WebpagePlayer src={url} />;
      default: return <div>Tipo de contenido no soportado</div>;
    }
  };

  // --- Función para renderizar una zona específica ---
  const renderZone = (zoneId: string) => {
    const tracker = zoneTrackers[zoneId];
    if (!tracker || tracker.items.length === 0) return null;
    const currentItem = tracker.items[tracker.currentIndex];
    return renderContentItem(currentItem);
  };

  if (isLoading) return <div style={styles.container}><div style={styles.message}>Cargando Playlist...</div></div>;
  if (!playlist) return <div style={styles.container}><div style={styles.message}>Playlist no encontrada.</div></div>;

  // --- Renderizado del Layout ---
  const layout = playlist.layout || 'single_zone';

  switch (layout) {
    case 'split_vertical':
      return (
        <div style={{ ...styles.container, display: 'flex' }}>
          <div style={{ ...styles.zone, width: '50%' }}>{renderZone('left')}</div>
          <div style={{ ...styles.zone, width: '50%' }}>{renderZone('right')}</div>
        </div>
      );
    // ... puedes añadir más layouts aquí ...
    case 'pip_bottom_right':
      return (
        <div style={{...styles.container }}>
            <div style={{...styles.zone}}>{renderZone('main')}</div>
            <div style={{position: 'absolute', bottom: '20px', right: '20px', width: '25%', height: '25%', border: '4px solid white', zIndex: 10}}>
                {renderZone('pip')}
            </div>
        </div>
      );
    case 'single_zone':
    default:
      return (
        <div style={styles.container}>
          {renderZone('main')}
        </div>
      );
  }
}