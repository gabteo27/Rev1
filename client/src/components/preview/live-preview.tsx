
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Play, Pause, ExternalLink, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export default function LivePreview() {
  const [selectedScreen, setSelectedScreen] = useState("");
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Fetch screens data
  const { data: screens = [] } = useQuery({
    queryKey: ["/api/screens"],
    retry: 1,
  });

  const selectedScreenData = Array.isArray(screens) 
    ? screens.find((s: any) => s.id.toString() === selectedScreen) 
    : null;

  const openPlayerWindow = () => {
    if (selectedScreen) {
      window.open(`/screen-player?screenId=${selectedScreen}`, '_blank', 'width=1200,height=800');
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
        {/* Screen Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Seleccionar Pantalla:</label>
          <Select value={selectedScreen} onValueChange={setSelectedScreen}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar pantalla..." />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(screens) && screens.length > 0 ? (
                screens.map((screen: any) => (
                  <SelectItem key={screen.id} value={screen.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        screen.isOnline ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span>{screen.name}</span>
                      {screen.location && <span className="text-muted-foreground">- {screen.location}</span>}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>No hay pantallas disponibles</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Preview Frame */}
        <div className="bg-slate-900 rounded-lg aspect-video flex items-center justify-center relative overflow-hidden min-h-[200px]">
          {selectedScreen && isPreviewVisible ? (
            <iframe
              src={`/screen-player?screenId=${selectedScreen}`}
              className="w-full h-full border-none"
              title={`Preview for ${selectedScreenData?.name || 'Screen'}`}
            />
          ) : (
            <div className="text-white text-center">
              <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-75">
                {!selectedScreen 
                  ? 'Selecciona una pantalla para ver la vista previa' 
                  : 'Presiona "Ver Vista Previa" para iniciar'
                }
              </p>
            </div>
          )}

          {/* Preview Overlay */}
          {selectedScreenData && (
            <div className="absolute top-2 left-2">
              <Badge variant="outline" className="bg-black/50 text-white border-white/20">
                {selectedScreenData.name}
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={isPreviewVisible ? "destructive" : "default"}
              onClick={() => setIsPreviewVisible(!isPreviewVisible)}
              disabled={!selectedScreen}
            >
              {isPreviewVisible ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Ocultar Vista Previa
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Ver Vista Previa
                </>
              )}
            </Button>

            <Button 
              size="sm" 
              variant="outline"
              disabled={!selectedScreen}
              onClick={openPlayerWindow}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Abrir en Nueva Ventana
            </Button>
          </div>

          <Button size="sm" variant="ghost">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Screen Status */}
        {selectedScreenData && (
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Estado:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  selectedScreenData.isOnline ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={selectedScreenData.isOnline ? 'text-green-600' : 'text-red-600'}>
                  {selectedScreenData.isOnline ? 'En línea' : 'Desconectada'}
                </span>
              </div>
            </div>
            {selectedScreenData.playlistId && (
              <div className="text-xs text-muted-foreground mt-1">
                Reproduciendo playlist ID: {selectedScreenData.playlistId}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
