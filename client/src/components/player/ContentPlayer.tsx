import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PlaylistItem, ContentItem } from '@shared/schema';

// --- Estilos y Componentes de Renderizado ---
const styles = {
  container: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', color: 'white', overflow: 'hidden' } as React.CSSProperties,
  message: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '3vw', textAlign: 'center', padding: '2rem', flexDirection: 'column' } as React.CSSProperties,
  media: { width: '100%', height: '100%', objectFit: 'contain' } as React.CSSProperties,
};

// Componentes específicos para cada tipo de contenido
const ImagePlayer = ({ src }: { src: string }) => <img key={src} src={src} style={styles.media} alt="Contenido Digital" />;
const VideoPlayer = ({ src }: { src: string }) => <video key={src} src={src} style={styles.media} autoPlay muted loop playsInline />;
const WebpagePlayer = ({ src }: { src: string }) => {
  // Validate and format URL
  const formatUrl = (url: string): string => {
    if (!url) return '';

    // Clean the URL first
    let cleanUrl = url.trim();

    // If it doesn't start with http:// or https://, add https://
    if (!cleanUrl.match(/^https?:\/\//)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      // Validate URL
      new URL(cleanUrl);
      return cleanUrl;
    } catch (error) {
      console.error('Invalid URL:', url);
      return '';
    }
  };

  const formattedUrl = formatUrl(src);

  if (!formattedUrl) {
    return (
      <div style={styles.message}>
        <h2>Error en la URL</h2>
        <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
          La URL proporcionada no es válida: {src}
        </p>
      </div>
    );
  }

  return (
    <iframe 
      key={formattedUrl} 
      src={formattedUrl} 
      style={{ ...styles.media, border: 'none' }} 
      title="Contenido Web" 
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      allow="autoplay; fullscreen; geolocation; microphone; camera"
      onError={() => console.error('Error loading iframe:', formattedUrl)}
    />
  );
};

// --- Lógica Principal del Reproductor ---
interface PlaylistData {
  id: number;
  name: string;
  items: Array<{
    id: number;
    order: number;
    customDuration: number | null;
    contentItem: {
      id: number;
      title: string;
      type: string;
      url: string;
      duration: number;
    };
  }>;
}

// Helper para hacer peticiones API específicas del reproductor
const playerApiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error("No hay token de autenticación.");

  const response = await fetch(endpoint, {
    ...options,
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers 
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expirado o inválido, redirigir a login
      localStorage.removeItem('authToken');
      localStorage.removeItem('playlistId');
      window.location.href = '/';
      return;
    }
    const errorData = await response.text();
    try {
      const jsonError = JSON.parse(errorData);
      throw new Error(jsonError.message || "Error en la petición de la API del reproductor.");
    } catch {
      throw new Error(errorData || "Error en la petición de la API del reproductor.");
    }
  }

  // Si la respuesta no tiene cuerpo (ej. en el heartbeat), no intentes parsear JSON
  const contentLength = response.headers.get('content-length');
  if (response.status === 204 || contentLength === '0') return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export default function ContentPlayer() {
  const [playlistId, setPlaylistId] = useState<string | null>(localStorage.getItem('playlistId'));
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [renderKey, setRenderKey] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  const { data: playlist, isLoading, isError, error: queryError } = useQuery<PlaylistData>({
    queryKey: ['playlist', playlistId],
    queryFn: () => playerApiRequest(`/api/player/playlists/${playlistId}`),
    enabled: !!playlistId, // Solo ejecuta la query si hay un playlistId
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refresca la playlist cada 5 minutos
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedPlaylistId = localStorage.getItem('playlistId');

    if (!token) {
      setError('No authentication token found');
      return;
    }

    if (!savedPlaylistId) {
      setError('No playlist assigned to this screen');
      return;
    }

    setPlaylistId(savedPlaylistId);

    // Listen for playlist changes via WebSocket
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'playlist-change') {
          const newPlaylistId = data.data.playlistId;
          if (newPlaylistId) {
            localStorage.setItem('playlistId', newPlaylistId.toString());
            setPlaylistId(newPlaylistId.toString());
            setCurrentItemIndex(0);
            setRenderKey(Date.now());
          }
        }
      } catch (error) {
        console.warn('Failed to parse WebSocket message:', error);
      }
    };

    // Add WebSocket listener if available
    if (window.wsConnection) {
      window.wsConnection.addEventListener('message', handleMessage);
      return () => {
        window.wsConnection.removeEventListener('message', handleMessage);
      };
    }

    // Try to connect to WebSocket for real-time updates
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Player WebSocket connected');
        // Send authentication
        ws.send(JSON.stringify({
          type: 'player-auth',
          token: token
        }));
      };

      ws.onmessage = handleMessage;
      ws.onerror = (error) => console.error('Player WebSocket error:', error);

      return () => {
        ws.close();
      };
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }
  }, []);

  // Efecto para el bucle de reproducción
  useEffect(() => {
    if (!playlist?.items || playlist.items.length === 0) return;

    const currentItem = playlist.items[currentItemIndex];
    if (!currentItem) return; // Salvaguarda por si el índice está fuera de rango

    const durationInSeconds = currentItem.customDuration || currentItem.contentItem.duration || 10;

    const timer = setTimeout(() => {
      setCurrentItemIndex(prev => (prev + 1) % playlist.items.length);
      setRenderKey(Date.now());
    }, durationInSeconds * 1000);

    return () => clearTimeout(timer);
  }, [currentItemIndex, playlist]);

  // Efecto para el "Heartbeat" que reporta que la pantalla está en línea
  useEffect(() => {
    const sendHeartbeat = () => {
      playerApiRequest('/api/screens/heartbeat', { method: 'POST' }).catch(err => {
        console.error("Heartbeat fallido:", err.message);
      });
    };

    sendHeartbeat(); // Envía uno al cargar
    const intervalId = setInterval(sendHeartbeat, 60 * 1000); // Y luego cada minuto

    return () => clearInterval(intervalId);
  }, []);

  const renderContent = () => {
    const currentItem = playlist.items[currentItemIndex]?.contentItem;
    if (!currentItem) return null;
    const url = currentItem.url;
    console.log('Rendering content:', {
      type: currentItem.type,
      title: currentItem.title,
      url: url,
      playlistId: playlistId
    });

    if (!url) {
      return (
        <div style={styles.message}>
          <h2>Error: Sin URL</h2>
          <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
            El contenido "{currentItem.title}" no tiene una URL válida.
          </p>
        </div>
      );
    }

    try {
      switch (currentItem.type) {
        case 'image': 
          return <ImagePlayer src={url} />;
        case 'video': 
          return <VideoPlayer src={url} />;
        case 'webpage':
          return <WebpagePlayer src={url} />;
        case 'pdf': 
          return <WebpagePlayer src={url} />;
        case 'text':
          return (
            <div style={{ ...styles.media, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2vw', textAlign: 'center', maxWidth: '80%', lineHeight: '1.6', color: 'white' }}>
                {currentItem.description || currentItem.title}
              </div>
            </div>
          );
        default: 
          console.warn('Unsupported content type:', currentItem.type);
          return (
            <div style={styles.message}>
              <h2>Tipo no soportado</h2>
              <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
                Tipo de contenido: {currentItem.type}
              </p>
              <p style={{ fontSize: '1vw', marginTop: '1rem', opacity: 0.7 }}>
                Título: {currentItem.title}
              </p>
            </div>
          );
      }
    } catch (error) {
      console.error('Error rendering content:', error);
      return (
        <div style={styles.message}>
          <h2>Error al cargar contenido</h2>
          <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
            No se pudo mostrar: {currentItem.title}
          </p>
          <p style={{ fontSize: '1vw', marginTop: '1rem', opacity: 0.7 }}>
            URL: {url}
          </p>
          <p style={{ fontSize: '1vw', marginTop: '0.5rem', opacity: 0.7 }}>
            Tipo: {currentItem.type}
          </p>
        </div>
      );
    }
  };

// --- Renderizado del Componente ---
  if (!playlistId) {
    return (
      <div style={styles.message}>
        <h1>Sin Playlist</h1>
        <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
          Esta pantalla no tiene ninguna playlist asignada.
        </p>
        <p style={{ fontSize: '1vw', marginTop: '1rem', opacity: 0.7 }}>
          Token: {localStorage.getItem('authToken') ? 'Presente' : 'Ausente'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.message}>
        <h1>Cargando contenido...</h1>
        <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
          Playlist ID: {playlistId}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={styles.message}>
        <h1>Error al cargar la playlist</h1>
        <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
          {queryError?.message || 'Error desconocido'}
        </p>
        <p style={{ fontSize: '1vw', marginTop: '1rem', opacity: 0.7 }}>
          Playlist ID: {playlistId}
        </p>
        <p style={{ fontSize: '1vw', marginTop: '0.5rem', opacity: 0.7 }}>
          Token: {localStorage.getItem('authToken') ? 'Presente' : 'Ausente'}
        </p>
      </div>
    );
  }

  if (!playlist?.items || playlist.items.length === 0) {
    return (
      <div style={styles.message}>
        <h1>Playlist Vacía</h1>
        <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
          La playlist asignada no tiene contenido.
        </p>
        <p style={{ fontSize: '1vw', marginTop: '1rem', opacity: 0.7 }}>
          Playlist: {playlist?.name || 'Sin nombre'} (ID: {playlistId})
        </p>
      </div>
    );
  }

  const currentItem = playlist.items[currentItemIndex]?.contentItem;
  if (!currentItem) {
    return (
      <div style={styles.message}>
        <h1>Cargando item...</h1>
        <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
          Ítem {currentItemIndex + 1} de {playlist.items.length}
        </p>
      </div>
    );
  }

  return <div style={styles.container} key={renderKey}>{renderContent()}</div>;
}