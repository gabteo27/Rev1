import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PlaylistItem, ContentItem } from '@shared/schema';

// --- Estilos y Componentes de Renderizado ---

const styles = {
  container: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: '#000', color: 'white', overflow: 'hidden',
  } as React.CSSProperties,

  message: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
    fontSize: '3vw', textAlign: 'center', padding: '2rem'
  } as React.CSSProperties,

  media: {
    width: '100%', height: '100%', objectFit: 'contain'
  } as React.CSSProperties,
};

// Componentes específicos para cada tipo de contenido
const ImagePlayer = ({ src }: { src: string }) => <img key={src} src={src} style={styles.media} alt="Contenido Digital" />;
const VideoPlayer = ({ src }: { src: string }) => <video key={src} src={src} style={styles.media} autoPlay muted loop />;
const WebpagePlayer = ({ src }: { src:string }) => <iframe key={src} src={src} style={{...styles.media, border: 'none'}} title="Contenido Web" />;

// --- Lógica Principal del Reproductor ---

interface PlaylistData {
  items: (PlaylistItem & { contentItem: ContentItem })[];
}

// Función para buscar la playlist con autenticación de token
const fetchPlaylist = async (playlistId: string): Promise<PlaylistData> => {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error("No hay token de autenticación.");

  const response = await fetch(`/api/playlists/${playlistId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) throw new Error("No se pudo cargar la playlist.");
  return response.json();
};


export default function ContentPlayer() {
  const [playlistId] = useState<string | null>(localStorage.getItem('playlistId'));
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Clave única para forzar el re-renderizado de videos e iframes
  const [renderKey, setRenderKey] = useState(Date.now()); 

  const { data: playlist, isLoading, isError, error } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => fetchPlaylist(playlistId!),
    enabled: !!playlistId, // Solo ejecuta la query si hay un playlistId
    refetchOnWindowFocus: false,
    retry: 3,
  });

  // El motor de reproducción (el bucle)
  useEffect(() => {
    // No hacer nada si no hay items en la playlist
    if (!playlist || playlist.items.length === 0) return;

    // Obtiene la duración del item actual, o un valor por defecto
    const currentItem = playlist.items[currentItemIndex];
    const durationInSeconds = currentItem?.customDuration || currentItem?.contentItem.duration || 10;

    const timer = setTimeout(() => {
      // Avanza al siguiente item, volviendo al inicio si es el último
      setCurrentItemIndex((prevIndex) => (prevIndex + 1) % playlist.items.length);
      // Cambia la clave para forzar la recreación del componente de medios
      setRenderKey(Date.now());
    }, durationInSeconds * 1000);

    // Limpia el temporizador si el componente se desmonta o el índice cambia
    return () => clearTimeout(timer);
  }, [currentItemIndex, playlist]);

  // --- Renderizado del Componente ---

  if (!playlistId) {
    return <div style={styles.message}>Esta pantalla no tiene ninguna playlist asignada.</div>;
  }

  if (isLoading) {
    return <div style={styles.message}>Cargando contenido...</div>;
  }

  if (isError) {
    return <div style={styles.message}>Error: {error.message}</div>;
  }

  if (!playlist || playlist.items.length === 0) {
    return <div style={styles.message}>La playlist asignada está vacía.</div>;
  }

  const currentItem = playlist.items[currentItemIndex].contentItem;

  const renderContent = () => {
    switch (currentItem.type) {
      case 'image':
        return <ImagePlayer src={currentItem.url!} />;
      case 'video':
        return <VideoPlayer src={currentItem.url!} />;
      case 'webpage':
      case 'pdf': // Los PDF se pueden mostrar en un iframe
        return <WebpagePlayer src={currentItem.url!} />;
      default:
        return <div style={styles.message}>Tipo de contenido no soportado: {currentItem.type}</div>;
    }
  };

  return (
    <div style={styles.container} key={renderKey}>
      {renderContent()}
    </div>
  );
}