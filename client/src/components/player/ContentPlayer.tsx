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
    refetchInterval: isPreview ? 5000 : 60000, // Más frecuente en preview
  });

  const [zoneTrackers, setZoneTrackers] = useState<Record<string, ZoneTracker>>({});

  // 1. Inicializa o actualiza los trackers cuando la playlist cambia
  useEffect(() => {
    if (playlist?.items && Array.isArray(playlist.items)) {
      console.log('Playlist items:', playlist.items);
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
      
      console.log('Zone trackers created:', newTrackers);
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
    console.log(`Rendering zone ${zoneId}:`, tracker);
    if (!tracker || tracker.items.length === 0) {
      console.log(`Zone ${zoneId} has no content`);
      return null;
    }
    const currentItem = tracker.items[tracker.currentIndex];
    console.log(`Zone ${zoneId} current item:`, currentItem);
    return renderContentItem(currentItem);
  };

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
            <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white', fontSize: '12px', opacity: 0.7, zIndex: 1000 }}>
              Zona Izquierda ({zoneTrackers['left']?.items?.length || 0} items)
            </div>
            {renderZone('left') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona izquierda
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, width: '50%' }}>
            <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'white', fontSize: '12px', opacity: 0.7, zIndex: 1000 }}>
              Zona Derecha ({zoneTrackers['right']?.items?.length || 0} items)
            </div>
            {renderZone('right') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona derecha
              </div>
            )}
          </div>
        </div>
      );
    case 'split_horizontal':
      return (
        <div style={{ ...styles.container, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...styles.zone, height: '50%', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
            <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white', fontSize: '12px', opacity: 0.7, zIndex: 1000 }}>
              Zona Superior ({zoneTrackers['top']?.items?.length || 0} items)
            </div>
            {renderZone('top') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona superior
              </div>
            )}
          </div>
          <div style={{ ...styles.zone, height: '50%' }}>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'white', fontSize: '12px', opacity: 0.7, zIndex: 1000 }}>
              Zona Inferior ({zoneTrackers['bottom']?.items?.length || 0} items)
            </div>
            {renderZone('bottom') || (
              <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Sin contenido en zona inferior
              </div>
            )}
          </div>
        </div>
      );
    case 'pip_bottom_right':
      return (
        <div style={{...styles.container, position: 'relative' }}>
          <div style={{...styles.zone}}>
            <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white', fontSize: '12px', opacity: 0.7, zIndex: 1000 }}>
              Principal ({zoneTrackers['main']?.items?.length || 0} items)
            </div>
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
            <div style={{ position: 'absolute', top: '5px', left: '5px', color: 'white', fontSize: '10px', opacity: 0.7, zIndex: 1000 }}>
              PiP ({zoneTrackers['pip']?.items?.length || 0})
            </div>
            {renderZone('pip') || (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                Sin PiP
              </div>
            )}
          </div>
        </div>
      );
    case 'single_zone':
    default:
      return (
        <div style={styles.container}>
          <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white', fontSize: '12px', opacity: 0.7, zIndex: 1000 }}>
            Principal ({zoneTrackers['main']?.items?.length || 0} items)
          </div>
          {renderZone('main') || (
            <div style={{ ...styles.zone, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Sin contenido
            </div>
          )}
        </div>
      );
  }
}