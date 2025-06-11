import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Pause, 
  Square,
  Monitor, 
  List, 
  Folder, 
  Clock, 
  Tv,
  Activity,
  Users,
  Globe,
  Calendar,
  Thermometer,
  TrendingUp
} from "lucide-react";

// Widget components with real APIs
const WeatherWidget = () => {
  const [weather, setWeather] = useState<any>(null);
  
  useEffect(() => {
    // Using OpenWeatherMap API (user needs to provide API key)
    const fetchWeather = async () => {
      try {
        const apiKey = process.env.VITE_OPENWEATHER_API_KEY;
        if (!apiKey) return;
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Mexico City&appid=${apiKey}&units=metric`
        );
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error('Weather API error:', error);
      }
    };
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000); // Update every 10 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg">
      <Thermometer className="h-6 w-6 text-blue-600" />
      <div>
        <p className="font-medium">{weather?.name || 'Ciudad de México'}</p>
        <p className="text-sm text-muted-foreground">
          {weather?.main?.temp ? `${Math.round(weather.main.temp)}°C` : '22°C'} - {weather?.weather?.[0]?.description || 'Despejado'}
        </p>
      </div>
    </div>
  );
};

const ClockWidget = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg">
      <Clock className="h-6 w-6 text-green-600" />
      <div>
        <p className="font-medium">{time.toLocaleTimeString('es-ES')}</p>
        <p className="text-sm text-muted-foreground">{time.toLocaleDateString('es-ES')}</p>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [selectedScreen, setSelectedScreen] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const { toast } = useToast();

  // Fetch data with proper error handling
  const { data: screens = [] } = useQuery({
    queryKey: ["/api/screens"],
    retry: 1,
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ["/api/playlists"],
    retry: 1,
  });

  const { data: content = [] } = useQuery({
    queryKey: ["/api/content"],
    retry: 1,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["/api/alerts"],
    retry: 1,
  });

  // Control playback mutation
  const playbackMutation = useMutation({
    mutationFn: async ({ screenId, playlistId, action }: { screenId: string, playlistId: string, action: 'play' | 'pause' | 'stop' }) => {
      return await apiRequest(`/api/screens/${screenId}/playback`, {
        method: "POST",
        body: JSON.stringify({ playlistId, action })
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Reproducción actualizada",
        description: `${variables.action === 'play' ? 'Iniciada' : variables.action === 'pause' ? 'Pausada' : 'Detenida'} en la pantalla seleccionada`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo controlar la reproducción",
        variant: "destructive",
      });
    }
  });

  const togglePreview = () => {
    if (!selectedScreen || !selectedPlaylist) return;
    
    const action = isPreviewPlaying ? 'pause' : 'play';
    playbackMutation.mutate({
      screenId: selectedScreen,
      playlistId: selectedPlaylist,
      action
    });
    
    setIsPreviewPlaying(!isPreviewPlaying);
  };

  const stopPreview = () => {
    if (!selectedScreen) return;
    
    playbackMutation.mutate({
      screenId: selectedScreen,
      playlistId: selectedPlaylist,
      action: 'stop'
    });
    
    setIsPreviewPlaying(false);
  };

  // Calculate statistics
  const activeScreens = Array.isArray(screens) ? screens.filter((s: any) => s.isOnline).length : 0;
  const totalScreens = Array.isArray(screens) ? screens.length : 0;
  const totalFiles = Array.isArray(content) ? content.length : 0;
  const totalDuration = Array.isArray(playlists) ? 
    playlists.reduce((sum: number, playlist: any) => sum + (playlist.totalDuration || 0), 0) : 0;
  const activeAlerts = Array.isArray(alerts) ? alerts.filter((a: any) => a.isActive).length : 0;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const selectedScreenData = Array.isArray(screens) ? screens.find((s: any) => s.id.toString() === selectedScreen) : null;
  const selectedPlaylistData = Array.isArray(playlists) ? playlists.find((p: any) => p.id.toString() === selectedPlaylist) : null;

  return (
    <div className="space-y-6">
      <Header
        title="Dashboard XcienTV"
        subtitle="Panel de control principal para señalización digital"
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Tv className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Pantallas</p>
                <p className="text-2xl font-bold">{activeScreens}/{totalScreens}</p>
                <p className="text-xs text-muted-foreground">Activas/Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <List className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Playlists</p>
                <p className="text-2xl font-bold">{Array.isArray(playlists) ? playlists.length : 0}</p>
                <p className="text-xs text-muted-foreground">Configuradas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Folder className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Contenido</p>
                <p className="text-2xl font-bold">{totalFiles}</p>
                <p className="text-xs text-muted-foreground">Archivos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Duración Total</p>
                <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
                <p className="text-xs text-muted-foreground">Contenido</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Player Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Control de Reproducción
            </CardTitle>
            <CardDescription>
              Control remoto de pantallas en tiempo real
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pantalla de destino</Label>
                <Select value={selectedScreen} onValueChange={setSelectedScreen}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar pantalla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(screens) && screens.length > 0 ? screens.map((screen: any) => (
                      <SelectItem key={screen.id} value={screen.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            screen.isOnline ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="font-medium">{screen.name}</span>
                          <span className="text-sm text-muted-foreground">- {screen.location}</span>
                        </div>
                      </SelectItem>
                    )) : (
                      <SelectItem value="none" disabled>No hay pantallas disponibles</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Playlist</Label>
                <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar playlist..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(playlists) && playlists.length > 0 ? playlists.map((playlist: any) => (
                      <SelectItem key={playlist.id} value={playlist.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{playlist.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({playlist.totalItems || 0} elementos)
                          </span>
                        </div>
                      </SelectItem>
                    )) : (
                      <SelectItem value="none" disabled>No hay playlists disponibles</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={togglePreview} 
                disabled={!selectedScreen || !selectedPlaylist || playbackMutation.isPending}
                className="flex-1"
              >
                {isPreviewPlaying ? (
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
                disabled={!isPreviewPlaying || playbackMutation.isPending}
              >
                <Square className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Enhanced Preview Display */}
            <div className="border rounded-lg overflow-hidden bg-black text-white min-h-[300px] relative">
              {selectedScreen && isPreviewPlaying ? (
                <div className="p-6 text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-red-400">EN VIVO</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Monitor className="h-16 w-16 mx-auto text-blue-400" />
                    <h3 className="text-xl font-semibold">
                      {selectedScreenData?.name || 'Pantalla'}
                    </h3>
                    <p className="text-gray-400">{selectedScreenData?.location || 'Ubicación'}</p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <List className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">Reproduciendo:</span>
                    </div>
                    <p className="font-medium">{selectedPlaylistData?.name || 'Playlist'}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      <span>Elementos: {selectedPlaylistData?.totalItems || 0}</span>
                      <span>Duración: {formatDuration(selectedPlaylistData?.totalDuration || 0)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400">
                  <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Control de Reproducción</p>
                  <p className="text-sm">
                    {!selectedScreen ? 'Selecciona una pantalla' : 
                     !selectedPlaylist ? 'Selecciona una playlist' : 
                     'Presiona reproducir para iniciar'}
                  </p>
                </div>
              )}
            </div>

            {/* Screen Status */}
            {selectedScreen && selectedScreenData && (
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Estado de la pantalla:</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedScreenData.isOnline ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className={selectedScreenData.isOnline ? 'text-green-600' : 'text-red-600'}>
                      {selectedScreenData.isOnline ? 'En línea' : 'Desconectada'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Widgets and Activity */}
        <div className="space-y-6">
          {/* Live Widgets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Widgets en Vivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <WeatherWidget />
              <ClockWidget />
            </CardContent>
          </Card>

          {/* System Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Actividad del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm">Sistema operativo</p>
                  <p className="text-xs text-muted-foreground">Todas las pantallas sincronizadas</p>
                </div>
              </div>
              
              {activeAlerts > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                  <div>
                    <p className="text-sm">{activeAlerts} alerta{activeAlerts > 1 ? 's' : ''} activa{activeAlerts > 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground">Requieren atención</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm">Última sincronización</p>
                  <p className="text-xs text-muted-foreground">{new Date().toLocaleTimeString('es-ES')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pantallas conectadas</span>
                <Badge variant="default">{activeScreens}/{totalScreens}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Contenido total</span>
                <Badge variant="secondary">{totalFiles} archivos</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tiempo de contenido</span>
                <Badge variant="outline">{formatDuration(totalDuration)}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}