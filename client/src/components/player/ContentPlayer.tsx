import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PlaylistItem, ContentItem } from '@shared/schema';

// --- Estilos y Componentes de Renderizado ---
const styles = {
  container: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', color: 'white', overflow: 'hidden' } as React.CSSProperties,
  message: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '3vw', textAlign: 'center', padding: '2rem' } as React.CSSProperties,
  media: { width: '100%', height: '100%', objectFit: 'contain' } as React.CSSProperties,
};

const ImagePlayer = ({ src }: { src: string }) => <img key={src} src={src} style={styles.media} alt="Contenido Digital" />;
const VideoPlayer = ({ src }: { src: string }) => <video key={src} src={src} style={styles.media} autoPlay muted loop playsInline />;
const WebpagePlayer = ({ src }: { src: string }) => <iframe key={src} src={src} style={{ ...styles.media, border: 'none' }} title="Contenido Web" sandbox="allow-scripts allow-same-origin"></iframe>;

// --- Lógica Principal del Reproductor ---
interface PlaylistData {
  items: (PlaylistItem & { contentItem: ContentItem })[];
}

const playerApiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error("No hay token de autenticación.");

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Error en la petición de la API del reproductor.");
  }
  return response.json();
};

export default function ContentPlayer() {
  const [playlistId] = useState<string | null>(localStorage.getItem('playlistId'));
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [renderKey, setRenderKey] = useState(Date.now());

  const { data: playlist, isLoading, isError, error } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => playerApiRequest(`/api/playlists/${playlistId}`),
    enabled: !!playlistId,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refresca la playlist cada 5 minutos
  });

  // Efecto para el bucle de reproducción
  useEffect(() => {
    if (!playlist?.items || playlist.items.length === 0) return;

    const currentItem = playlist.items[currentItemIndex];
    const durationInSeconds = currentItem?.customDuration || currentItem?.contentItem.duration || 10;

    const timer = setTimeout(() => {
      setCurrentItemIndex(prev => (prev + 1) % playlist.items.length);
      setRenderKey(Date.now());
    }, durationInSeconds * 1000);

    return () => clearTimeout(timer);
  }, [currentItemIndex, playlist]);

  // Efecto para el "Heartbeat" que reporta que la pantalla está en línea
  useEffect(() => {
    const sendHeartbeat = () => playerApiRequest('/api/screens/heartbeat', { method: 'POST' });

    sendHeartbeat(); // Envía uno al cargar
    const intervalId = setInterval(sendHeartbeat, 60 * 1000); // Y luego cada minuto

    return () => clearInterval(intervalId);
  }, []);

  // --- Renderizado del Componente ---
  if (!playlistId) return <div style={styles.message}>Esta pantalla no tiene ninguna playlist asignada.</div>;
  if (isLoading) return <div style={styles.message}>Cargando contenido...</div>;
  if (isError) return <div style={styles.message}>Error: {error.message}</div>;
  if (!playlist?.items || playlist.items.length === 0) return <div style={styles.message}>La playlist asignada está vacía.</div>;

  const currentItem = playlist.items[currentItemIndex].contentItem;

  const renderContent = () => {
    switch (currentItem.type) {
      case 'image': return <ImagePlayer src={currentItem.url!} />;
      case 'video': return <VideoPlayer src={currentItem.url!} />;
      case 'webpage':
      case 'pdf': return <WebpagePlayer src={currentItem.url!} />;
      default: return <div style={styles.message}>Tipo de contenido no soportado: {currentItem.type}</div>;
    }
  };

  return <div style={styles.container} key={renderKey}>{renderContent()}</div>;
}