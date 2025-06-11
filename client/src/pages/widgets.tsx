import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Clock, 
  Calendar,
  Thermometer,
  Rss,
  Image,
  Type,
  Settings,
  Trash2,
  ExternalLink,
  Loader2,
  Activity
} from "lucide-react";

// Real API widget components
const LiveWeatherWidget = ({ config }: { config: any }) => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        // Using free weather API from weatherapi.com
        const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
        const city = config?.city || 'Mexico City';
        
        if (apiKey) {
          const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=no`
          );
          if (response.ok) {
            const data = await response.json();
            setWeather(data);
          }
        } else {
          // Fallback to demo data when no API key
          setWeather({
            location: { name: city },
            current: { temp_c: 22, condition: { text: 'Soleado' } }
          });
        }
      } catch (error) {
        console.error('Weather API error:', error);
        setWeather({
          location: { name: config?.city || 'Ciudad' },
          current: { temp_c: 22, condition: { text: 'No disponible' } }
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        <div>
          <p className="font-medium">Cargando clima...</p>
          <p className="text-sm text-muted-foreground">Obteniendo datos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg">
      <Thermometer className="h-6 w-6 text-blue-600" />
      <div>
        <p className="font-medium">{weather?.location?.name || 'Ciudad'}</p>
        <p className="text-sm text-muted-foreground">
          {weather?.current?.temp_c}°C - {weather?.current?.condition?.text || 'Sin datos'}
        </p>
      </div>
    </div>
  );
};

const LiveNewsWidget = ({ config }: { config: any }) => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        // Using RSS feed or news API
        const rssUrl = config?.rssUrl || 'https://feeds.bbci.co.uk/mundo/rss.xml';
        
        // For demo purposes, using a CORS proxy for RSS feeds
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const data = await response.json();
          setNews(data.items?.slice(0, config?.maxItems || 3) || []);
        }
      } catch (error) {
        console.error('News API error:', error);
        setNews([
          { title: 'Noticias en tiempo real', description: 'Configure la URL RSS para mostrar noticias actualizadas' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
    const interval = setInterval(fetchNews, 15 * 60 * 1000); // Update every 15 minutes
    return () => clearInterval(interval);
  }, [config]);

  if (loading) {
    return (
      <div className="space-y-2 p-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
          <span className="text-sm font-medium">Cargando noticias...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Rss className="h-4 w-4 text-orange-600" />
        <span className="text-sm font-medium">Últimas Noticias</span>
      </div>
      {news.slice(0, 2).map((item, index) => (
        <div key={index} className="text-xs">
          <p className="font-medium line-clamp-2">{item.title}</p>
        </div>
      ))}
    </div>
  );
};

const LiveClockWidget = ({ config }: { config: any }) => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const format = config?.format || '24h';
  const timezone = config?.timezone || 'America/Mexico_City';
  
  const formatTime = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: format === '12h'
      }).format(date);
    } catch (error) {
      return date.toLocaleTimeString('es-ES');
    }
  };

  const formatDate = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      return date.toLocaleDateString('es-ES');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg">
      <Clock className="h-6 w-6 text-green-600" />
      <div>
        <p className="font-medium text-lg">{formatTime(time)}</p>
        <p className="text-sm text-muted-foreground">{formatDate(time)}</p>
      </div>
    </div>
  );
};

const TextWidget = ({ config }: { config: any }) => {
  const text = config?.text || 'Texto personalizado';
  const fontSize = config?.fontSize || '16px';
  const color = config?.color || '#000000';

  return (
    <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Type className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium">Texto Personalizado</span>
      </div>
      <p style={{ fontSize, color }} className="font-medium">
        {text}
      </p>
    </div>
  );
};

const widgetTypes = [
  { 
    value: "clock", 
    label: "Reloj", 
    icon: Clock, 
    description: "Muestra fecha y hora en tiempo real",
    component: LiveClockWidget
  },
  { 
    value: "weather", 
    label: "Clima", 
    icon: Thermometer, 
    description: "Información meteorológica actualizada",
    component: LiveWeatherWidget
  },
  { 
    value: "news", 
    label: "Noticias", 
    icon: Rss, 
    description: "Feed de noticias RSS en tiempo real",
    component: LiveNewsWidget
  },
  { 
    value: "text", 
    label: "Texto", 
    icon: Type, 
    description: "Texto personalizable",
    component: TextWidget
  },
];

export default function Widgets() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [newWidget, setNewWidget] = useState({
    name: "",
    type: "",
    config: "{}",
    position: "bottom-right"
  });
  const { toast } = useToast();

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ["/api/widgets"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/widgets", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      setCreateModalOpen(false);
      setNewWidget({ name: "", type: "", config: "{}", position: "bottom-right" });
      toast({
        title: "Widget creado",
        description: "El widget se ha creado exitosamente.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/widgets/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      toast({
        title: "Widget eliminado",
        description: "El widget se ha eliminado correctamente.",
      });
    },
  });

  const handleCreateWidget = () => {
    if (!newWidget.name.trim() || !newWidget.type) {
      toast({
        title: "Error",
        description: "Nombre y tipo son requeridos.",
        variant: "destructive",
      });
      return;
    }
    
    let config = {};
    try {
      config = JSON.parse(newWidget.config);
    } catch (e) {
      config = {};
    }

    createMutation.mutate({
      ...newWidget,
      config: JSON.stringify(config),
      isActive: true
    });
  };

  const handleDeleteWidget = (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este widget?")) {
      deleteMutation.mutate(id);
    }
  };

  const getWidgetIcon = (type: string) => {
    const widgetType = widgetTypes.find(w => w.value === type);
    return widgetType ? widgetType.icon : Settings;
  };

  const getWidgetComponent = (type: string) => {
    const widgetType = widgetTypes.find(w => w.value === type);
    return widgetType ? widgetType.component : null;
  };

  const getWidgetConfig = (type: string) => {
    switch (type) {
      case "clock":
        return { format: "24h", timezone: "America/Mexico_City" };
      case "weather":
        return { city: "Mexico City", units: "metric" };
      case "news":
        return { rssUrl: "https://feeds.bbci.co.uk/mundo/rss.xml", maxItems: 3 };
      case "text":
        return { text: "Texto personalizado", fontSize: "16px", color: "#000000" };
      default:
        return {};
    }
  };

  const handleTypeChange = (type: string) => {
    const config = getWidgetConfig(type);
    setNewWidget(prev => ({
      ...prev,
      type,
      config: JSON.stringify(config, null, 2)
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="Widgets" subtitle="Personaliza elementos interactivos" />
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Widgets Interactivos"
        subtitle="Elementos dinámicos con APIs en tiempo real para pantallas"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Activity className="w-4 h-4 mr-2" />
              {previewMode ? "Salir de Vista Previa" : "Vista Previa"}
            </Button>
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Widget
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Widget</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        value={newWidget.name}
                        onChange={(e) => setNewWidget(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nombre del widget"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={newWidget.type} onValueChange={handleTypeChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {widgetTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="position">Posición en pantalla</Label>
                    <Select value={newWidget.position} onValueChange={(value) => setNewWidget(prev => ({ ...prev, position: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">Superior izquierda</SelectItem>
                        <SelectItem value="top-right">Superior derecha</SelectItem>
                        <SelectItem value="bottom-left">Inferior izquierda</SelectItem>
                        <SelectItem value="bottom-right">Inferior derecha</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="config">Configuración (JSON)</Label>
                    <Textarea
                      id="config"
                      value={newWidget.config}
                      onChange={(e) => setNewWidget(prev => ({ ...prev, config: e.target.value }))}
                      placeholder="Configuración en formato JSON"
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure las opciones específicas del widget en formato JSON
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateWidget} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creando..." : "Crear Widget"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {previewMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vista Previa en Tiempo Real
            </CardTitle>
            <CardDescription>
              Widgets funcionando con APIs reales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {widgetTypes.map((widgetType) => {
                const Component = widgetType.component;
                const config = getWidgetConfig(widgetType.value);
                return (
                  <div key={widgetType.value}>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <widgetType.icon className="h-4 w-4" />
                      {widgetType.label} - Demo en Vivo
                    </h4>
                    <Component config={config} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Widget Types */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Widgets</CardTitle>
            <CardDescription>
              Widgets con APIs reales disponibles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {widgetTypes.map((type) => (
              <div key={type.value} className="flex items-center gap-3 p-3 border rounded-lg">
                <type.icon className="h-6 w-6 text-blue-500" />
                <div className="flex-1">
                  <h4 className="font-medium">{type.label}</h4>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Widgets */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Widgets Configurados ({Array.isArray(widgets) ? widgets.length : 0})</CardTitle>
              <CardDescription>
                Widgets activos en el sistema con datos en tiempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!Array.isArray(widgets) || widgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay widgets configurados</p>
                  <p className="text-sm">Crea tu primer widget interactivo</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {widgets.map((widget: any) => {
                    const IconComponent = getWidgetIcon(widget.type);
                    const WidgetComponent = getWidgetComponent(widget.type);
                    let config = {};
                    try {
                      config = JSON.parse(widget.config || "{}");
                    } catch (e) {
                      config = {};
                    }

                    return (
                      <div key={widget.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <IconComponent className="h-6 w-6 text-blue-500" />
                            <div>
                              <h3 className="font-medium">{widget.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {widgetTypes.find(t => t.value === widget.type)?.label || widget.type}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWidget(widget.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{widget.position}</Badge>
                            <Badge variant={widget.isActive ? "default" : "secondary"}>
                              {widget.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          
                          {/* Live Widget Preview */}
                          {WidgetComponent && widget.isActive && (
                            <div className="border-t pt-3">
                              <p className="text-xs text-muted-foreground mb-2">Vista previa en vivo:</p>
                              <WidgetComponent config={config} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* API Configuration Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Configuración de APIs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Para habilitar todas las funcionalidades de los widgets, configure las siguientes variables de entorno:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code>VITE_WEATHER_API_KEY</code> - API key de WeatherAPI.com para widgets de clima</li>
              <li><code>VITE_NEWS_API_KEY</code> - API key opcional para fuentes de noticias adicionales</li>
            </ul>
            <p>Los widgets funcionan con datos de demostración cuando no se configuran las APIs.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}