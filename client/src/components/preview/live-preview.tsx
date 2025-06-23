import { useState, useMemo } from "react";
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

  // Fetch screens con mejor manejo de errores
  const { data: screens = [], isLoading: screensLoading } = useQuery({
    queryKey: ["/api/screens"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/screens");
        if (!response.ok) {
          console.warn(`Screens API returned ${response.status}`);
          return [];
        }
        const data = await response.json();
        console.log('🖥️ Fetched screens for preview:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching screens:', error);
        return [];
      }
    },
    retry: 2,
    staleTime: 30000,
    refetchInterval: 30000, // Refrescar cada 30 segundos para detectar nuevas pantallas
  });

  // Fetch playlist for selected screen con mejor validación
  const selectedScreen = useMemo(() => 
    screens.find((s: any) => s.id.toString() === selectedScreenId), 
    [screens, selectedScreenId]
  );

  const playlistId = selectedScreen?.playlistId;

  console.log('🖥️ Selected screen:', selectedScreen);
  console.log('🎵 Playlist ID:', playlistId);

  // Obtenemos los detalles de la playlist para la pantalla seleccionada
  const { data: playlist, isLoading: playlistLoading } = useQuery({
    queryKey: ["/api/playlists", playlistId],
    queryFn: async () => {
      if (!playlistId) {
        console.log('❌ No playlist ID for selected screen');
        return null;
      }
      try {
        console.log(`🎵 Fetching playlist ${playlistId} for preview`);
        const response = await apiRequest(`/api/playlists/${playlistId}`);
        if (!response.ok) {
          console.warn(`Playlist API returned ${response.status} for ID ${playlistId}`);
          return null;
        }
        const data = await response.json();
        console.log('🎵 Fetched playlist for preview:', data);
        return data;
      } catch (error) {
        console.error('Error fetching playlist:', error);
        return null;
      }
    },
    enabled: !!playlistId && !!selectedScreen,
    retry: 1,
    staleTime: 30000,
    refetchOnWindowFocus: false,
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

  const selectedScreenData = screens.find((s: any) => s.id.toString() === selectedScreenId);

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
                  <SelectValue placeholder={screensLoading ? "Cargando pantallas..." : "Seleccionar pantalla..."} />
                </SelectTrigger>
                <SelectContent>
                  {screensLoading ? (
                    <SelectItem value="loading" disabled>Cargando pantallas...</SelectItem>
                  ) : screens.length > 0 ? (
                    screens.map((screen: any) => (
                      <SelectItem key={screen.id} value={screen.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${screen.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>{screen.name}</span>
                          {screen.playlistId && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (Playlist: {screen.playlistId})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No hay pantallas emparejadas</SelectItem>
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
                  {screensLoading || playlistLoading 
                    ? 'Cargando...'
                    : !selectedScreenId 
                      ? 'Selecciona una pantalla para ver la vista previa' 
                      : !playlistId
                        ? 'Esta pantalla no tiene una playlist asignada'
                        : !playlist?.items?.length
                          ? 'La playlist está vacía'
                          : 'Cargando contenido...'
                  }
                </p>
                {selectedScreen && (
                  <div className="text-xs opacity-60 mt-2">
                    Pantalla: {selectedScreen.name} | Estado: {selectedScreen.isOnline ? 'En línea' : 'Desconectada'}
                    {playlistId && <div>Playlist ID: {playlistId}</div>}
                  </div>
                )}
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