import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tv, List, Folder, Clock, Play, Eye, Settings, Plus, Monitor, Pause } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedScreen, setSelectedScreen] = useState<string>("");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Fetch dashboard data with error handling
  const { data: screens = [], error: screensError } = useQuery({
    queryKey: ["/api/screens"],
    retry: false,
  });

  const { data: playlists = [], error: playlistsError } = useQuery({
    queryKey: ["/api/playlists"],
    retry: false,
  });

  const { data: content = [], error: contentError } = useQuery({
    queryKey: ["/api/content"],
    retry: false,
  });

  // Log any errors for debugging
  if (screensError) console.error('Screens query error:', screensError);
  if (playlistsError) console.error('Playlists query error:', playlistsError);
  if (contentError) console.error('Content query error:', contentError);

  const { data: selectedScreenData } = useQuery({
    queryKey: ["/api/screens", selectedScreen],
    enabled: !!selectedScreen,
    retry: false,
  });

  // Calculate stats
  const activeScreens = Array.isArray(screens) ? screens.filter((s: any) => s.isOnline)?.length || 0 : 0;
  const totalPlaylists = Array.isArray(playlists) ? playlists.length || 0 : 0;
  const totalFiles = Array.isArray(content) ? content.length || 0 : 0;
  const totalDuration = Array.isArray(playlists) ? playlists.reduce((acc: number, p: any) => acc + (p.totalDuration || 0), 0) || 0 : 0;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const togglePreview = () => {
    if (!selectedScreen) {
      toast({
        title: "Selecciona una pantalla",
        description: "Elige una pantalla para ver la vista previa.",
        variant: "destructive",
      });
      return;
    }
    setIsPreviewPlaying(!isPreviewPlaying);
  };

  const selectedScreenInfo = Array.isArray(screens) ? screens.find((s: any) => s.id === parseInt(selectedScreen)) : null;

  return (
    <div className="space-y-6">
      <Header 
        title="Dashboard XcienTV" 
        subtitle="Panel principal de control y gestión"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/content"}>
              <Plus className="h-4 w-4 mr-2" />
              Contenido
            </Button>
            <Button size="sm" onClick={() => window.location.href = "/playlists"}>
              <List className="h-4 w-4 mr-2" />
              Playlists
            </Button>
          </div>
        }
      />
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Tv className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pantallas Activas</p>
                <p className="text-2xl font-bold">{activeScreens}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <List className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Playlists</p>
                <p className="text-2xl font-bold">{totalPlaylists}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Folder className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Archivos</p>
                <p className="text-2xl font-bold">{totalFiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Tiempo Total</p>
                <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Screen Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa de Pantalla
            </CardTitle>
            <CardDescription>
              Monitorea el contenido en tiempo real
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select value={selectedScreen} onValueChange={setSelectedScreen}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar pantalla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(screens) ? screens.map((screen: any) => (
                      <SelectItem key={screen.id} value={screen.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            screen.isOnline ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          {screen.name} - {screen.location}
                        </div>
                      </SelectItem>
                    )) : []}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={togglePreview} disabled={!selectedScreen}>
                {isPreviewPlaying ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isPreviewPlaying ? "Pausar" : "Reproducir"}
              </Button>
            </div>

            <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
              {selectedScreen && isPreviewPlaying ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Play className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      {selectedScreenInfo?.name || "Pantalla"}
                    </h3>
                    <p className="text-sm opacity-75">
                      Reproduciendo contenido en vivo
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <Monitor className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Vista Previa</p>
                  <p className="text-sm">
                    {selectedScreen ? "Presiona reproducir para comenzar" : "Selecciona una pantalla"}
                  </p>
                </div>
              )}

              {selectedScreen && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center justify-between text-white text-sm">
                      <span>{selectedScreenInfo?.name || "Pantalla"}</span>
                      <Badge variant={selectedScreenInfo?.isOnline ? "default" : "destructive"}>
                        {selectedScreenInfo?.isOnline ? "En línea" : "Fuera de línea"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Gestiona tu contenido y pantallas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => window.location.href = "/content"}
              >
                <Plus className="h-6 w-6 mb-2" />
                Subir Contenido
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => window.location.href = "/playlists"}
              >
                <List className="h-6 w-6 mb-2" />
                Nueva Playlist
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => window.location.href = "/screens"}
              >
                <Tv className="h-6 w-6 mb-2" />
                Configurar Pantalla
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => window.location.href = "/scheduling"}
              >
                <Clock className="h-6 w-6 mb-2" />
                Programar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas acciones en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="text-sm">Sistema iniciado correctamente</p>
                <p className="text-xs text-muted-foreground">Hace unos momentos</p>
              </div>
            </div>
            {Array.isArray(playlists) ? playlists.slice(0, 3).map((playlist: any, index: number) => (
              <div key={playlist.id} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm">Playlist "{playlist.name}" disponible</p>
                  <p className="text-xs text-muted-foreground">
                    {playlist.totalItems || 0} elementos
                  </p>
                </div>
              </div>
            )) : []}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>Estado del Sistema</CardTitle>
            <CardDescription>
              Monitoreo en tiempo real
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pantallas conectadas</span>
              <Badge variant="default">{activeScreens} / {Array.isArray(screens) ? screens.length : 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Contenido total</span>
              <Badge variant="secondary">{totalFiles} archivos</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Playlists activas</span>
              <Badge variant="outline">{totalPlaylists}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Estado del servidor</span>
              <Badge variant="default">Óptimo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}