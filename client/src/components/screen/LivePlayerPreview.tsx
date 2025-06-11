import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, ExternalLink, Tv } from "lucide-react";
import ContentPlayer from "@/components/player/ContentPlayer"; // ✅ Importamos el reproductor directamente
import { apiRequest } from "@/lib/queryClient";

export default function LivePreview() {
  const [selectedScreenId, setSelectedScreenId] = useState<string>("");

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
    enabled: !!playlistId, // Solo se ejecuta si hay una playlistId
  });

  const openPlayerInNewWindow = () => {
    if (selectedScreenId) {
      window.open(`/screen-player?screenId=${selectedScreenId}`, '_blank');
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Vista Previa en Vivo</CardTitle>
            <CardDescription>Visualización en tiempo real</CardDescription>
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
            <Button 
                size="sm" 
                variant="outline"
                disabled={!selectedScreenId}
                onClick={openPlayerInNewWindow}
                className="w-full md:w-auto"
            >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en Nueva Ventana
            </Button>
        </div>

        {/* ✅ ÁREA DE VISTA PREVIA MODIFICADA */}
        <div className="bg-slate-900 rounded-lg aspect-video flex items-center justify-center relative overflow-hidden min-h-[200px]">
          {selectedScreenId && playlistId ? (
            // Renderizamos el componente directamente en lugar de un iframe
            <ContentPlayer 
              screenId={parseInt(selectedScreenId)}
              playlistId={playlistId}
              isPreview={true}
              className="w-full h-full"
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
  );
}