
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, ExternalLink, Tv, Eye, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function LivePreview() {
  const [selectedScreenId, setSelectedScreenId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Obtenemos la lista de pantallas para el selector
  const { data: screens = [], isLoading: screensLoading, error: screensError } = useQuery({
    queryKey: ["/api/screens"],
    retry: 2,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  // Buscamos los datos de la pantalla seleccionada
  const selectedScreenData = screens.find((s: any) => s.id.toString() === selectedScreenId);
  const playlistId = selectedScreenData?.playlistId;

  // Obtenemos los detalles de la playlist para la pantalla seleccionada
  const { data: playlist, isLoading: playlistLoading } = useQuery({
    queryKey: ["/api/playlists", playlistId],
    queryFn: async () => {
      if (!playlistId) return null;
      try {
        const response = await apiRequest(`/api/playlists/${playlistId}`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching playlist:', error);
        return null;
      }
    },
    enabled: !!playlistId,
    retry: 1,
    staleTime: 60000,
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
      setPreviewError(null);
    }
  };

  const handleIframeError = () => {
    setPreviewError('Error al cargar la vista previa. Verifique que la pantalla esté conectada y tenga contenido asignado.');
  };

  useEffect(() => {
    if (selectedScreenId && !selectedScreenData?.playlistId) {
      setPreviewError('La pantalla seleccionada no tiene una playlist asignada.');
    } else {
      setPreviewError(null);
    }
  }, [selectedScreenId, selectedScreenData]);

  if (screensLoading) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Cargando Vista Previa...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg aspect-video flex items-center justify-center min-h-[200px]">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (screensError) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-red-600">Error al Cargar Pantallas</CardTitle>
          <CardDescription>No se pudieron cargar las pantallas disponibles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg aspect-video flex items-center justify-center min-h-[200px]">
            <p className="text-red-600 dark:text-red-400">Error de conexión</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                          {screen.location && <span className="text-xs text-muted-foreground">({screen.location})</span>}
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
            {previewError ? (
              <div className="text-white text-center p-4">
                <Tv className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-75">{previewError}</p>
              </div>
            ) : selectedScreenId && playlistId && playlist?.items?.length > 0 ? (
              <iframe 
                src={`/screen-player?screenId=${selectedScreenId}&preview=true`} 
                className="w-full h-full border-0" 
                title="Vista previa de la pantalla"
                style={{ minHeight: '200px' }}
                onError={handleIframeError}
                onLoad={() => setPreviewError(null)}
              />
            ) : playlistLoading ? (
              <div className="text-white text-center p-4">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-sm opacity-75">Cargando contenido...</p>
              </div>
            ) : (
              <div className="text-white text-center p-4">
                <Tv className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-75">
                  {!selectedScreenId 
                    ? 'Selecciona una pantalla para ver la vista previa' 
                    : !playlistId
                    ? 'Esta pantalla no tiene una playlist asignada'
                    : 'Esta playlist no tiene contenido'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Información de la pantalla seleccionada */}
          {selectedScreenData && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Pantalla:</strong> {selectedScreenData.name}</p>
              {selectedScreenData.location && <p><strong>Ubicación:</strong> {selectedScreenData.location}</p>}
              <p><strong>Estado:</strong> {selectedScreenData.isOnline ? 'En línea' : 'Desconectada'}</p>
              {playlist && (
                <p><strong>Playlist:</strong> {playlist.name} ({playlist.items?.length || 0} elementos)</p>
              )}
            </div>
          )}
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
