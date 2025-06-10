// @ts-nocheck
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// Función para obtener los detalles de la pantalla y su playlist
const fetchScreenDetails = async (screenId) => {
  const res = await fetch(`/api/screens/${screenId}`);
  if (!res.ok) throw new Error('Failed to fetch screen details');
  const screen = await res.json();

  if (!screen.playlistId) return { screen, playlist: null };

  const playlistRes = await fetch(`/api/playlists/${screen.playlistId}`);
  if (!playlistRes.ok) throw new Error('Failed to fetch playlist');
  const playlist = await playlistRes.json();

  return { screen, playlist };
};

const ContentItem = ({ item }) => {
    switch(item.content.type) {
        case 'image':
            return <img src={item.content.url} alt={item.content.name} className="w-full h-full object-contain" />;
        case 'video':
            return <video src={item.content.url} autoPlay muted loop className="w-full h-full object-contain" />;
        case 'url':
            return <iframe src={item.content.url} title={item.content.name} className="w-full h-full border-0" />;
        default:
            return <div>Unsupported content type</div>;
    }
};

const ContentPlayer = ({ screenId, initialPlaylistId, onPlaylistUpdate }) => {
  const [currentPlaylistId, setCurrentPlaylistId] = useState(initialPlaylistId);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Cuando el padre nos notifica de un cambio, actualizamos el ID
  useEffect(() => {
    if (onPlaylistUpdate) {
      setCurrentPlaylistId(onPlaylistUpdate);
      setCurrentItemIndex(0); // Reiniciar el índice
    }
  }, [onPlaylistUpdate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['screenDetails', screenId, currentPlaylistId],
    queryFn: async () => {
        if (!currentPlaylistId) { // Si no hay playlist, obtenemos datos de la pantalla
            const res = await fetch(`/api/player/status/${screenId}`);
            if (!res.ok) throw new Error('Failed to fetch player status');
            const screen = await res.json();
            if (screen.playlistId && screen.playlistId !== currentPlaylistId) {
                setCurrentPlaylistId(screen.playlistId); // Actualizamos si hay nueva playlist
            }
            return { screen, playlist: null };
        }
        // Si ya tenemos playlistId, obtenemos todo
        const playlistRes = await fetch(`/api/playlists/${currentPlaylistId}`);
        if (!playlistRes.ok) throw new Error('Failed to fetch playlist');
        const playlist = await playlistRes.json();
        return { playlist };
    },
    enabled: !!screenId, // Solo ejecutar si hay screenId
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data?.playlist?.items || data.playlist.items.length === 0) return;

    const currentItem = data.playlist.items[currentItemIndex];
    const duration = (currentItem.duration || 10) * 1000; // Duración en milisegundos

    const timer = setTimeout(() => {
      setCurrentItemIndex((prevIndex) => (prevIndex + 1) % data.playlist.items.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentItemIndex, data]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-black text-white">Cargando contenido...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen bg-black text-white">Error: {error.message}</div>;
  }

  if (!data?.playlist?.items || data.playlist.items.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <h1 className="text-4xl font-bold mb-4">Pantalla Vinculada</h1>
            <p className="text-lg">ID: <span className="font-mono">{screenId}</span></p>
            <p className="text-lg mt-4">Esperando asignación de contenido desde el panel de administración.</p>
        </div>
    );
  }

  const currentItem = data.playlist.items[currentItemIndex];

  return (
    <div className="w-screen h-screen bg-black">
      <ContentItem item={currentItem} />
    </div>
  );
};

export default ContentPlayer;