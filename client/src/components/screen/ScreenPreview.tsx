
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Monitor, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface ScreenPreviewProps {
  screen: any;
  onPlayClick: (screenId: number) => void;
}

export const ScreenPreview: React.FC<ScreenPreviewProps> = ({ screen, onPlayClick }) => {
  // Obtenemos la playlist asignada a esta pantalla
  const { data: playlist } = useQuery({
    queryKey: ['playlist_preview', screen.playlistId],
    queryFn: () => apiRequest(`/api/playlists/${screen.playlistId}`).then(res => res.json()),
    enabled: !!screen.playlistId,
  });

  const firstItem = playlist?.items?.[0]?.contentItem;
  const thumbnailUrl = firstItem?.thumbnailUrl || (firstItem?.type === 'image' ? firstItem.url : null);

  return (
    <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden mt-4 group">
      {thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt="Preview" 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Monitor className="w-10 h-10 text-slate-400 dark:text-slate-600" />
        </div>
      )}

      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          onClick={() => onPlayClick(screen.id)}
          variant="secondary"
          size="sm"
        >
          <Eye className="w-4 h-4 mr-2" />
          Ver en Vivo
        </Button>
      </div>

      {firstItem && (
        <Badge className="absolute bottom-2 left-2" variant="secondary">
          {firstItem.title || firstItem.name}
        </Badge>
      )}

      {playlist && (
        <Badge className="absolute top-2 right-2" variant="outline">
          {playlist.items?.length || 0} elementos
        </Badge>
      )}
    </div>
  );
};
