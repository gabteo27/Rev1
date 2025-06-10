// @ts-nocheck
import { useEffect, useState } from 'react';
import { initializeWebSocket, closeWebSocket } from '../lib/websocket';
import ContentPlayer from '../components/player/ContentPlayer';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

const PairingCodeDisplay = ({ code }: { code: string | null }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
    <h1 className="text-4xl font-bold mb-4">Vincular esta pantalla</h1>
    <p className="text-lg mb-8">
      Ingresa el siguiente código en tu panel de administración para vincular esta pantalla.
    </p>
    <div className="bg-gray-800 p-8 rounded-lg">
      <p className="text-6xl font-mono tracking-widest">{code || 'Cargando...'}</p>
    </div>
  </div>
);

const PlayerPage = () => {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [screenId, setScreenId] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(false);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Obtener código de vinculación al cargar
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        // Podríamos revisar en localStorage si ya tenemos un screenId
        let storedScreenId = localStorage.getItem('screenId');

        if (storedScreenId) {
            const response = await fetch(`/api/player/status/${storedScreenId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.userId) { // Si tiene userId, ya está emparejada
                    setScreenId(data.id);
                    setIsPaired(true);
                    setPlaylistId(data.playlistId);
                    return;
                }
            }
        }

        // Si no, obtenemos un nuevo código
        const response = await fetch('/api/player/code', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to fetch pairing code');
        const data = await response.json();
        setPairingCode(data.pairingCode);
        setScreenId(data.id);
        localStorage.setItem('screenId', data.id); // Guardamos el nuevo ID

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        localStorage.removeItem('screenId'); // Limpiar en caso de error
      }
    };
    fetchInitialState();
  }, []);

  // 2. Conectar WebSocket cuando tengamos un screenId
  useEffect(() => {
    if (!screenId) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        // Evento de emparejamiento exitoso
        if (message.type === 'paired') {
          console.log('Screen has been paired!', message.screen);
          setIsPaired(true);
          setPlaylistId(message.screen.playlistId);
        }

        // Evento de actualización de contenido
        if (message.type === 'playlist-update') {
          console.log('Playlist has been updated!', message.playlistId);
          // Actualizamos el ID de la playlist para que ContentPlayer recargue
          setPlaylistId(message.playlistId);
        }

      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    initializeWebSocket(screenId, handleWebSocketMessage);

    return () => {
      closeWebSocket();
    };
  }, [screenId]);

  if (error) {
    return <div className="text-red-500 text-center mt-10">{error}</div>;
  }

  if (isPaired) {
    return <ContentPlayer screenId={screenId!} initialPlaylistId={playlistId} onPlaylistUpdate={playlistId} />;
  }

  return <PairingCodeDisplay code={pairingCode} />;
}

// Envolvemos todo en el QueryClientProvider
export function Player() {
    return (
        <QueryClientProvider client={queryClient}>
            <PlayerPage />
        </QueryClientProvider>
    )
}