import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { wsManager } from "@/lib/websocket";

import Header from "@/components/layout/header";
import LivePreview from "@/components/preview/live-preview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp,
  RefreshCw
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
  const [selectedScreen, setSelectedScreen] = useState<any>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);

  // Queries
  const { data: screens = [] } = useQuery({
    queryKey: ["/api/screens"],
    queryFn: () => apiRequest("/api/screens").then(res => res.json()),
    refetchInterval: 30000, // Cambiar de 5s a 30s
    staleTime: 15000, // 15 segundos
  });

  console.log("🖥️ Fetched screens for preview:", screens);

  useEffect(() => {
    if (screens.length > 0) {
      // Si no hay pantalla seleccionada, seleccionar la primera disponible
      if (!selectedScreen) {
        const firstActiveScreen = screens.find((s: any) => s.isOnline && s.playlistId) || screens[0];
        if (firstActiveScreen) {
          setSelectedScreen(firstActiveScreen);
          setSelectedPlaylistId(firstActiveScreen.playlistId || null);
          console.log("🖥️ Auto-selected screen:", firstActiveScreen);
        }
      } else {
        // Actualizar la pantalla seleccionada si ya existe
        const updatedScreen = screens.find((s: any) => s.id === selectedScreen.id);
        if (updatedScreen) {
          setSelectedScreen(updatedScreen);
          setSelectedPlaylistId(updatedScreen.playlistId || null);
        }
      }
    }
  }, [screens]);

  useEffect(() => {
    console.log("🖥️ Selected screen:", selectedScreen);
    console.log("🎵 Playlist ID:", selectedPlaylistId);
  }, [selectedScreen, selectedPlaylistId]);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const { toast } = useToast();

  // Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];

    // Wait for WebSocket to be connected before subscribing
    const setupSubscriptions = async () => {
      try {
        // Set up polling as fallback with reduced frequency
        const pollingInterval = setInterval(() => {
          // Poll for updates every 2 minutes as fallback, only when WebSocket is disconnected
          if (!wsManager.isConnected()) {
            queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
            queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
          }
        }, 120000);

        unsubscribeFunctions.push(() => clearInterval(pollingInterval));

        // Try to connect WebSocket if not connected
        if (!wsManager.isConnected()) {
          try {
            await wsManager.connect();
            console.log('✅ WebSocket connected for dashboard');
          } catch (error) {
            console.warn('WebSocket connection failed, will retry later:', error);
            setTimeout(setupSubscriptions, 5000);
            return;
          }
        }

        // Subscribe to alerts
        const alertHandler = (alertData) => {
        console.log('Alerta recibida vía WebSocket:', alertData);
        toast({
          title: alertData?.title || "Nueva Alerta",
          description: alertData?.message || "Alerta del sistema",
          variant: alertData?.type === 'error' ? 'destructive' : 'default',
        });
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      };
      wsManager.on('alert', alertHandler);
      unsubscribeFunctions.push(() => wsManager.off('alert', alertHandler));

      // Subscribe to screen updates
      const screenUpdateHandler = (screenData) => {
        console.log('Actualización de pantalla recibida:', screenData);
        toast({
          title: "Pantalla Actualizada",
          description: `${screenData?.name || 'Pantalla'} ha sido actualizada`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
      };
      wsManager.on('screen-update', screenUpdateHandler);
      unsubscribeFunctions.push(() => wsManager.off('screen-update', screenUpdateHandler));

      // Subscribe to playlist updates
      const playlistUpdateHandler = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
        if (selectedPlaylistId) {
          queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
        }
      };
      wsManager.on('playlists-updated', playlistUpdateHandler);
      unsubscribeFunctions.push(() => wsManager.off('playlists-updated', playlistUpdateHandler));

      // Subscribe to playlist content updates
      const playlistContentHandler = (data) => {
        console.log('Playlist content update received:', data);
        queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
        queryClient.invalidateQueries({ queryKey: ["/api/content"] });
        if (data?.playlistId) {
          queryClient.invalidateQueries({ queryKey: ["/api/playlists", data.playlistId.toString()] });
        }
        if (selectedPlaylistId && data?.playlistId === parseInt(selectedPlaylistId)) {
          queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
        }
        // Force refetch to get immediate updates
        queryClient.refetchQueries({ queryKey: ["/api/playlists"] });
      };
      wsManager.on('playlist-content-updated', playlistContentHandler);
      unsubscribeFunctions.push(() => wsManager.off('playlist-content-updated', playlistContentHandler));

      // Subscribe to content deletion
      const contentDeleteHandler = (data) => {
        console.log('Content deletion received:', data);
        const { contentTitle, affectedPlaylists } = data;

        // Show notification
        if (contentTitle && affectedPlaylists?.length > 0) {
          toast({
            title: "Contenido eliminado",
            description: `"${contentTitle}" ha sido eliminado de ${affectedPlaylists.length} playlist(s)`,
          });
        }

        queryClient.invalidateQueries({ queryKey: ["/api/content"] });
        queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
        if (selectedPlaylistId) {
          queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
        }
      };
      wsManager.on('content-deleted', contentDeleteHandler);
      unsubscribeFunctions.push(() => wsManager.off('content-deleted', contentDeleteHandler));

      // Subscribe to widget updates
      const widgetUpdateHandler = (widgetData) => {
        console.log('Widget update received via WebSocket:', widgetData);
        queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
        toast({
          title: "Widget Actualizado",
          description: `Widget ${widgetData?.action || 'modificado'}`,
        });
      };
      wsManager.on('widget-updated', widgetUpdateHandler);
      unsubscribeFunctions.push(() => wsManager.off('widget-updated', widgetUpdateHandler));

      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        // Retry setup after a delay
        setTimeout(setupSubscriptions, 5000);
      }
    };

    setupSubscriptions();

    return () => {
      // Cleanup all subscriptions
      unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from WebSocket event:', error);
        }
      });
    };
  }, [toast, selectedPlaylistId]);

  // Screens data is already fetched above with refetch functionality

  const { data: playlists = [] } = useQuery({
    queryKey: ["/api/playlists"],
    queryFn: () => apiRequest("/api/playlists").then(res => res.json()),
    retry: 1,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const { data: content = [], isLoading: isLoadingContent, error: contentError } = useQuery<any[]>({
    queryKey: ["/api/content"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/content");
        if (!response.ok) {
          console.warn(`Content API returned ${response.status}`);
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn('Content loading failed:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 120000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: () => apiRequest("/api/alerts").then(res => res.json()),
    retry: 1,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Control playback mutation
  const playbackMutation = useMutation({
    mutationFn: async ({ screenId, playlistId, action }: { screenId: string, playlistId: string, action: 'play' | 'pause' | 'stop' }) => {
      const response = await apiRequest(`/api/screens/${screenId}/playback`, {
        method: "POST",
        body: JSON.stringify({ playlistId, action }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Reproducción actualizada",
        description: `${variables.action === 'play' ? 'Iniciada' : variables.action === 'pause' ? 'Pausada' : 'Detenida'} en la pantalla seleccionada`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      if (selectedPlaylistId) {
        queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
      }

      // Broadcast update via WebSocket to connected screens
      if (wsManager.isConnected()) {
        wsManager.send({
          type: 'playback-control',
          data: {
            screenId: variables.screenId,
            playlistId: variables.playlistId,
            action: variables.action
          }
        });
      }
    },
    onError: (error: any) => {
      console.error('Playback control error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo controlar la reproducción",
        variant: "destructive",
      });
    }
  });

  // Update screen playlist mutation
  const updateScreenPlaylistMutation = useMutation({
    mutationFn: async ({ screenId, playlistId }: { screenId: string, playlistId: string }) => {
      const response = await apiRequest(`/api/screens/${screenId}`, {
        method: "PUT",
        body: JSON.stringify({ playlistId: playlistId ? parseInt(playlistId) : null }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Pantalla actualizada",
        description: "La playlist de la pantalla ha sido cambiada",
      });

      // Update local state immediately
      setSelectedPlaylistId(variables.playlistId);

      // Invalidate and refresh all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      if (variables.playlistId) {
        queryClient.invalidateQueries({ queryKey: ["/api/playlists", variables.playlistId] });
      }

      // Broadcast screen update
      if (wsManager.isConnected()) {
        wsManager.send({
          type: 'screen-playlist-updated',
          data: {
            screenId: variables.screenId,
            playlistId: variables.playlistId,
            timestamp: new Date().toISOString()
          }
        });
      }
    },
    onError: (error: any) => {
      console.error('Update screen playlist error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la playlist de la pantalla",
        variant: "destructive",
      });
    }
  });

  const togglePreview = () => {
    if (!selectedScreen || !selectedPlaylistId) return;

    const action = isPreviewPlaying ? 'pause' : 'play';
    playbackMutation.mutate({
      screenId: selectedScreen,
      playlistId: selectedPlaylistId,
      action
    });

    setIsPreviewPlaying(!isPreviewPlaying);
  };

  const stopPreview = () => {
    if (!selectedScreen) return;

    playbackMutation.mutate({
      screenId: selectedScreen,
      playlistId: selectedPlaylistId,
      action: 'stop'
    });

    setIsPreviewPlaying(false);
  };

  // Sync selected playlist with selected screen
  useEffect(() => {
    if (selectedScreen && Array.isArray(screens)) {
      const screen = screens.find((s: any) => s.id.toString() === selectedScreen.id);
      if (screen && screen.playlistId && screen.playlistId.toString() !== selectedPlaylistId) {
        setSelectedPlaylistId(screen.playlistId.toString());
      }
    }
  }, [selectedScreen, screens]);

  // Calculate statistics
  const activeScreens = Array.isArray(screens) ? screens.filter((s: any) => s.isOnline).length : 0;
  const totalScreens = Array.isArray(screens) ? screens.length : 0;
  const totalFiles = Array.isArray(content) ? content.length : 0;
  const totalDuration = Array.isArray(playlists) ? 
    playlists.reduce((sum: number, playlist: any) => sum + (playlist.totalDuration || 0), 0) : 0;
  const activeAlertsCount = Array.isArray(alerts) ? alerts.filter((a: any) => a.isActive).length : 0;


const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

  const selectedScreenData = Array.isArray(screens) ? screens.find((s: any) => s.id.toString() === selectedScreen) : null;
  const selectedPlaylistData = Array.isArray(playlists) ? playlists.find((p: any) => p.id.toString() === selectedPlaylistId) : null;

  const handleAlertDismiss = async (alertId: number) => {
    try {
      const response = await apiRequest(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAlertsList(prev => prev.filter(alert => alert.id !== alertId));
        // Also invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      } else if (response.status === 404) {
        // Alert already deleted, just remove from local state
        setAlertsList(prev => prev.filter(alert => alert.id !== alertId));
      }
    } catch (error) {
      console.error('Error dismissing alert:', error);
      // Remove from local state anyway to prevent UI issues
      setAlertsList(prev => prev.filter(alert => alert.id !== alertId));
    }
  };

  // Query for detailed playlist data when a playlist is selected
  const { data: playlistDetails } = useQuery({
    queryKey: ["/api/playlists", selectedPlaylistId],
    queryFn: async () => {
      const response = await apiRequest(`/api/playlists/${selectedPlaylistId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist details: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!selectedPlaylistId,
    retry: 1,
    staleTime: 60000,
  });

return (
    <div className="h-full flex flex-col bg-background">
      <Header
        title="Dashboard XcienTV"
        subtitle="Panel de control principal para señalización digital"
      />

      <div className="flex-1 main-content-scroll px-6 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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

        {/* Control de Reproducción */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Control de Reproducción
              </CardTitle>
              <CardDescription>
                Selecciona una pantalla y playlist para controlar la reproducción
              </CardDescription>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="screen-select">Pantalla</Label>
                    <Select 
                  value={selectedScreen?.id?.toString() || ""} 
                  onValueChange={(value) => {
                    const screen = screens.find((s: any) => s.id.toString() === value);
                    if (screen) {
                      setSelectedScreen(screen);
                      setSelectedPlaylistId(screen.playlistId || null);
                      console.log("🖥️ Manually selected screen:", screen);
                    }
                  }}
                >
                      <SelectTrigger id="screen-select">
                        <SelectValue placeholder="Seleccionar pantalla..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(screens) && screens.length > 0 ? (
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

                  <div className="space-y-2">
                    <Label htmlFor="playlist-select">Playlist</Label>
                    <Select 
                      value={selectedPlaylistId} 
                      onValueChange={(value) => {
                        if (selectedScreen && value !== selectedPlaylistId) {
                          updateScreenPlaylistMutation.mutate({
                            screenId: selectedScreen,
                            playlistId: value
                          });
                        } else {
                          setSelectedPlaylistId(value);
                        }
                      }}
                    >
                      <SelectTrigger id="playlist-select">
                        <SelectValue placeholder="Seleccionar playlist..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(playlists) && playlists.length > 0 ? (
                          playlists.map((playlist: any) => (
                            <SelectItem key={playlist.id} value={playlist.id.toString()}>
                              <div className="flex items-center gap-2">
                                <List className="w-4 h-4" />
                                <span>{playlist.name}</span>
                                <Badge variant="secondary" className="ml-auto">
                                  {playlist.totalItems || playlist.items?.length || 0} items
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No hay playlists disponibles</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Estado de reproducción */}
                {selectedScreen && selectedPlaylistId && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">Sincronización automática</span>
                      </div>
                      <Badge variant="default" className="text-xs">
                        Activa
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      La pantalla se actualiza automáticamente cuando cambias la playlist
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

                {/* Información de la playlist seleccionada */}
                {selectedPlaylistData && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{selectedPlaylistData.name}</h4>
                      <Badge>{selectedPlaylistData.totalItems || selectedPlaylistData.items?.length || 0} elementos</Badge>
                    </div>
                    {(playlistDetails || selectedPlaylistData) && (
                      <p className="text-sm text-muted-foreground">
                        Duración total: {formatDuration((playlistDetails?.totalDuration || selectedPlaylistData.totalDuration) || 0)}
                      </p>
                    )}
                  </div>
                )}
          <LivePreview />
        </div>

        {/* Widgets y actividad del sistema */}
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
                <Activity className="h-5 w-5" />
                Actividad del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                <div className="flex items-start gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border-l-2 border-green-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">🔄 Broadcast sincronizado</p>
                    <p className="text-xs text-muted-foreground">Todas las pantallas actualizadas - {new Date().toLocaleTimeString('es-ES')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-2 border-blue-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">📝 Playlist actualizada</p>
                    <p className="text-xs text-muted-foreground">Cambios aplicados a {totalScreens} pantalla{totalScreens !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border-l-2 border-purple-500">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">📺 Nueva pantalla agregada</p>
                    <p className="text-xs text-muted-foreground">Pantalla registrada y configurada automáticamente</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border-l-2 border-indigo-500">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">🔧 Widget configurado</p>
                    <p className="text-xs text-muted-foreground">Widgets dinámicos actualizados en pantallas</p>
                  </div>
                </div>

                {activeAlertsCount > 0 && (
                  <div className="flex items-start gap-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border-l-2 border-orange-500">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">⚠️ {activeAlertsCount} alerta{activeAlertsCount > 1 ? 's' : ''} activa{activeAlertsCount > 1 ? 's' : ''}</p>
                      <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border-l-2 border-emerald-500">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">📁 Contenido disponible</p>
                    <p className="text-xs text-muted-foreground">{totalFiles} archivos sincronizados y listos</p>
                  </div>
                </div>

                <
div className="flex items-start gap-3 p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded border-l-2 border-cyan-500">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">🌐 WebSocket conectado</p>
                    <p className="text-xs text-muted-foreground">Comunicación en tiempo real activa</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Última actividad: {new Date().toLocaleTimeString('es-ES')}
                </span>
                <Button size="sm" variant="ghost" className="text-xs h-6">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}