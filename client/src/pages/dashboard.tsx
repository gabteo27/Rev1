import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import wsManager from "@/lib/websocket";
import Header from "@/components/layout/header";
import LivePreview from "@/components/preview/live-preview";
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
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
        if (!apiKey) {
          // Use demo data when no API key is available
          setWeather({
            name: 'Ciudad de México',
            main: { temp: 22 },
            weather: [{ description: 'Despejado' }]
          });
          return;
        }
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Mexico City&appid=${apiKey}&units=metric`
        );
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error('Weather API error:', error);
        // Fallback to demo data on error
        setWeather({
          name: 'Ciudad de México',
          main: { temp: 22 },
          weather: [{ description: 'No disponible' }]
        });
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

  // Subscribe to WebSocket events
  useEffect(() => {
    // Suscribirse a alertas
    const unsubscribeAlerts = wsManager.subscribe('alert', (alertData) => {
      console.log('Alerta recibida vía WebSocket:', alertData);
      toast({
        title: alertData.title || "Nueva Alerta",
        description: alertData.message,
        variant: alertData.type === 'error' ? 'destructive' : 'default',
      });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    });

    const unsubscribeScreens = wsManager.subscribe('screen-update', (screenData) => {
      console.log('Actualización de pantalla recibida:', screenData);
      toast({
        title: "Pantalla Actualizada",
        description: `${screenData.name} ha sido actualizada`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
    });

    // Refetch data to update the UI
    queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/screens"] });

    return () => {
      // Cleanup subscriptions
      if (typeof unsubscribeAlerts === 'function') {
        unsubscribeAlerts();
      }
      if (typeof unsubscribeScreens === 'function') {
        unsubscribeScreens();
      }
    };
  }, [toast]);

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
      const response = await apiRequest(`/api/screens/${screenId}/playback`, {
        method: "POST",
        body: JSON.stringify({ playlistId, action })
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Reproducción actualizada",
        description: `${variables.action === 'play' ? 'Iniciada' : variables.action === 'pause' ? 'Pausada' : 'Detenida'} en la pantalla seleccionada`,
      });
      
      // Broadcast update via WebSocket to connected screens
      wsManager.send('playback-control', {
        screenId: variables.screenId,
        playlistId: variables.playlistId,
        action: variables.action
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo controlar la reproducción",
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

  // Query for detailed playlist data when a playlist is selected
  const { data: playlistDetails } = useQuery({
    queryKey: ["/api/playlists", selectedPlaylist],
    enabled: !!selectedPlaylist,
    retry: 1,
  });

return (
    <div className="space-y-6 min-h-screen bg-background">
      <Header
        title="Dashboard XcienTV"
        subtitle="Panel de control principal para señalización digital"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6">
        {/* Control Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Control de Reproducción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="screen-select">Seleccionar Pantalla</Label>
              <Select value={selectedScreen} onValueChange={setSelectedScreen}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegir pantalla" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(screens) && screens.map((screen: any) => (
                    <SelectItem key={screen.id} value={screen.id.toString()}>
                      {screen.name} - {screen.isOnline ? 'En línea' : 'Desconectada'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="playlist-select">Seleccionar Playlist</Label>
              <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegir playlist" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(playlists) && playlists.map((playlist: any) => (
                    <SelectItem key={playlist.id} value={playlist.id.toString()}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedScreen && selectedPlaylist && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={togglePreview}
                  disabled={playbackMutation.isPending}
                  className="flex-1"
                >
                  {isPreviewPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isPreviewPlaying ? 'Pausar' : 'Reproducir'}
                </Button>
                <Button
                  onClick={stopPreview}
                  disabled={playbackMutation.isPending}
                  variant="outline"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            )}

            {playlistDetails && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Contenido de la Playlist</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {playlistDetails.items?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay contenido en esta playlist</p>
                  ) : (
                    playlistDetails.items?.map((item: any, index: number) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                        <span className="font-mono text-xs w-6">{index + 1}</span>
                        <span className="flex-1 truncate">{item.contentItem?.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.contentItem?.type}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Preview and System Status */}
        <div className="lg:col-span-2 space-y-6">
          <LivePreview />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <LivePreview />
        </div>
        <div className="space-y-6">
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
        </div>
      </div>
    </div>
  );
}
