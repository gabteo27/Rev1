
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, ExternalLink, Tv, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function LivePreview() {
  const [selectedScreenId, setSelectedScreenId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  // Obtenemos la lista de pantallas para el selector
  const { data: screens = [] } = useQuery({
    queryKey: ["/api/screens"],
    retry: 1,
  });

  // Buscamos los datos de la pantalla seleccionada
  const selectedScreenData = screens.find((s: any) => s.id.toString() === selectedScreenId);
  const playlistId = selectedScreenData?.playlistId;

  // Obtenemos los detalles de la playlist para la pantalla seleccionada
  const { data: playlist } = useQuery({
    queryKey: ["/api/playlists", playlistId],
    queryFn: () => apiRequest(`/api/playlists/${playlistId}`).then(res => res.json()),
    enabled: !!playlistId,
  });

  const openPlayerInNewWindow = () => {
    if (selectedScreenId) {
      window.open(`/screen-player?screenId=${selectedScreenId}`, '_blank', 'width=1280,height=720');
    }
  };

  const openLiveModal = () => {
    if (selectedScreenId) {
      setShowModal(true);
    }
  };

  return (
    <>
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Vista Previa en Vivo</CardTitle>
              <CardDescription>Visualización en tiempo real del contenido</CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              En vivo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar Pantalla:</label>
              <Select value={selectedScreenId} onValueChange={setSelectedScreenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar pantalla..." />
                </SelectTrigger>
                <SelectContent>
                  {screens.length > 0 ? (
                    screens.map((screen: any) => (
                      <SelectItem key={screen.id} value={screen.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${screen.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>{screen.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No hay pantallas disponibles</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                disabled={!selectedScreenId}
                onClick={openLiveModal}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver en Vivo
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                disabled={!selectedScreenId}
                onClick={openPlayerInNewWindow}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Vista previa en miniatura */}
          <div className="bg-slate-900 rounded-lg aspect-video flex items-center justify-center relative overflow-hidden min-h-[200px]">
            {selectedScreenId && playlistId && playlist?.items?.length > 0 ? (
              <iframe 
                src={`/screen-player?screenId=${selectedScreenId}&preview=true`} 
                className="w-full h-full border-0" 
                title="Vista previa de la pantalla"
                style={{ minHeight: '200px' }}
                onError={() => {
                  console.error('Error loading preview iframe');
                }}
              />
            ) : (
              <div className="text-white text-center p-4">
                <Tv className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-75">
                  {!selectedScreenId 
                    ? 'Selecciona una pantalla para ver la vista previa' 
                    : 'Esta pantalla no tiene una playlist asignada'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de vista en vivo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Vista en Vivo - {selectedScreenData?.name}</h3>
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cerrar
              </Button>
            </div>
            <div className="flex-1 bg-black">
              <iframe 
                src={`/screen-player?screenId=${selectedScreenId}`} 
                className="w-full h-full" 
                frameBorder="0"
                title="Vista en vivo de la pantalla"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, Monitor, Play, Pause, Square } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ContentPlayer from "@/components/player/ContentPlayer";

export default function LivePreview() {
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: playlists = [] } = useQuery({
    queryKey: ["/api/playlists"],
    queryFn: async () => {
      const response = await apiRequest("/api/playlists");
      return response.json();
    },
  });

  const selectedPlaylistData = playlists.find((p: any) => p.id.toString() === selectedPlaylist);

  const togglePreview = () => {
    setIsPlaying(!isPlaying);
  };

  const stopPreview = () => {
    setIsPlaying(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Vista Previa en Vivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Playlist selector */}
        <div className="space-y-2">
          <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar playlist..." />
            </SelectTrigger>
            <SelectContent>
              {playlists.map((playlist: any) => (
                <SelectItem key={playlist.id} value={playlist.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span>{playlist.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {playlist.items?.length || 0} items
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={togglePreview}
            disabled={!selectedPlaylist}
            size="sm"
            className="flex-1"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Reproducir
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={stopPreview}
            disabled={!selectedPlaylist}
            size="sm"
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>

        {/* Preview area */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {selectedPlaylist && isPlaying ? (
            <div className="absolute inset-0">
              <ContentPlayer 
                playlistId={parseInt(selectedPlaylist)} 
                isPreview={true}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-75">
                  {selectedPlaylist ? "Presiona reproducir para ver la vista previa" : "Selecciona una playlist"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Playlist info */}
        {selectedPlaylistData && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{selectedPlaylistData.name}</h4>
              <Badge variant="outline">
                {selectedPlaylistData.items?.length || 0} elementos
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
