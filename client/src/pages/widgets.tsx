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
  Activity,
  Eye,
  EyeOff,
  Edit,
  Save,
  Monitor,
  Key,
  Globe,
  Palette
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    type: "clock", 
    name: "Reloj", 
    icon: Clock, 
    description: "Muestra fecha y hora en tiempo real",
    component: LiveClockWidget,
    defaultConfig: { format: "24h", timezone: "America/Mexico_City" }
  },
  { 
    type: "weather", 
    name: "Clima", 
    icon: Thermometer, 
    description: "Información meteorológica actualizada",
    component: LiveWeatherWidget,
    defaultConfig: { city: "Mexico City", units: "metric" },
    hasApiConfig: true,
    apiFields: [
      { key: 'apiKey', label: 'API Key', type: 'text' },
      { key: 'city', label: 'Ciudad', type: 'text' },
      { key: 'units', label: 'Unidades', type: 'select', options: ['metric', 'imperial'] }
    ]
  },
  { 
    type: "news", 
    name: "Noticias", 
    icon: Rss, 
    description: "Feed de noticias RSS en tiempo real",
    component: LiveNewsWidget,
    defaultConfig: { rssUrl: "https://feeds.bbci.co.uk/mundo/rss.xml", maxItems: 3 },
    hasApiConfig: true,
    apiFields: [
      { key: 'rssUrl', label: 'URL RSS', type: 'text' },
      { key: 'maxItems', label: 'Máximo de noticias', type: 'number' }
    ]
  },
  { 
    type: "text", 
    name: "Texto", 
    icon: Type, 
    description: "Texto personalizable",
    component: TextWidget,
    defaultConfig: { text: "Texto personalizado", fontSize: "16px", color: "#000000" },
    customFields: [
      { key: 'text', label: 'Texto', type: 'textarea' },
      { key: 'fontSize', label: 'Tamaño de letra', type: 'text' },
      { key: 'color', label: 'Color', type: 'color' }
    ]
  },
];

export default function Widgets() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<any>(null);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    position: 'top-right',
    config: '{}',
    isEnabled: true
  });
  const { toast } = useToast();

  // Fetch widgets
  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ["/api/widgets"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/widgets");
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching widgets:', error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Create widget mutation
  const createWidgetMutation = useMutation({
    mutationFn: async (widgetData: any) => {
      const response = await apiRequest("/api/widgets", {
        method: "POST",
        body: JSON.stringify(widgetData),
      });
      if (!response.ok) throw new Error("Error al crear widget");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      setIsCreateModalOpen(false);
      resetForm();
      toast({ title: "Widget creado", description: "El widget se ha creado exitosamente." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo crear el widget",
        variant: "destructive" 
      });
    }
  });

  // Update widget mutation
  const updateWidgetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await apiRequest(`/api/widgets/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Error al actualizar widget");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      setEditingWidget(null);
      toast({ title: "Widget actualizado", description: "Los cambios se han guardado." });
    }
  });

  // Delete widget mutation
  const deleteWidgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/widgets/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Error al eliminar widget");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      toast({ title: "Widget eliminado", description: "El widget se ha eliminado correctamente." });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      position: 'top-right',
      config: '{}',
      isEnabled: true
    });
    setSelectedType('');
  };

  const handleCreateWidget = () => {
    if (!formData.name.trim() || !selectedType) {
      toast({ 
        title: "Error", 
        description: "Nombre y tipo son requeridos.",
        variant: "destructive" 
      });
      return;
    }

    const widgetType = widgetTypes.find(t => t.type === selectedType);
    let config = widgetType?.defaultConfig || {};

    try {
      const customConfig = JSON.parse(formData.config);
      config = { ...config, ...customConfig };
    } catch (error) {
      // Use default config if JSON is invalid
    }

    createWidgetMutation.mutate({
      ...formData,
      type: selectedType,
      config: JSON.stringify(config)
    });
  };

  const toggleWidgetStatus = (widget: any) => {
    updateWidgetMutation.mutate({
      id: widget.id,
      data: { ...widget, isEnabled: !widget.isEnabled }
    });
  };

  const getWidgetComponent = (widget: any) => {
    const widgetType = widgetTypes.find(t => t.type === widget.type);
    if (!widgetType) return null;

    let config = {};
    try {
      config = JSON.parse(widget.config || '{}');
    } catch (error) {
      config = {};
    }

    return widgetType.component;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <Header
        title="Gestión de Widgets"
        subtitle="Configura widgets interactivos para tus pantallas"
      />

      <div className="flex-1 main-content-scroll px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Widget Gallery */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Widgets Activos</h2>
                <p className="text-muted-foreground">Gestiona los widgets de tus pantallas</p>
              </div>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Widget
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Widget</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="config" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="config">Configuración Básica</TabsTrigger>
                      <TabsTrigger value="api">APIs y Avanzado</TabsTrigger>
                    </TabsList>

                    <TabsContent value="config" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre del Widget</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Mi widget personalizado"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Posición</Label>
                          <Select value={formData.position} onValueChange={(value) => setFormData({...formData, position: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top-left">Superior Izquierda</SelectItem>
                              <SelectItem value="top-right">Superior Derecha</SelectItem>
                              <SelectItem value="bottom-left">Inferior Izquierda</SelectItem>
                              <SelectItem value="bottom-right">Inferior Derecha</SelectItem>
                              <SelectItem value="center">Centro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Widget</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {widgetTypes.map((type) => (
                            <div
                              key={type.type}
                              className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent ${
                                selectedType === type.type ? 'border-primary bg-primary/5' : ''
                              }`}
                              onClick={() => setSelectedType(type.type)}
                            >
                              <div className="flex items-center gap-3">
                                <type.icon className="h-6 w-6 text-primary" />
                                <div>
                                  <p className="font-medium">{type.name}</p>
                                  <p className="text-xs text-muted-foreground">{type.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="api" className="space-y-6">
                      {selectedType && widgetTypes.find(t => t.type === selectedType)?.hasApiConfig && (
                        <div className="space-y-6">
                          <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Configuración de API</h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                  Configure las APIs para datos en tiempo real
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {widgetTypes.find(t => t.type === selectedType)?.apiFields?.map((field) => (
                              <div key={field.key} className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-medium">
                                  <Globe className="h-4 w-4 text-primary" />
                                  {field.label}
                                </Label>
                                {field.type === 'select' ? (
                                  <Select>
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder={`Seleccionar ${field.label.toLowerCase()}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {field.options?.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    type={field.type}
                                    className="h-11"
                                    placeholder={field.type === 'password' ? '••••••••••••' : `Ingresa ${field.label.toLowerCase()}`}
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Configuración desde el Frontend</span>
                            </div>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              Las configuraciones de API se pueden modificar directamente desde esta interfaz
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedType && widgetTypes.find(t => t.type === selectedType)?.customFields && (
                        <div className="space-y-4">
                          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Palette className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-purple-900 dark:text-purple-100">Personalización</span>
                            </div>
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                              Personaliza la apariencia y contenido
                            </p>
                          </div>

                          {widgetTypes.find(t => t.type === selectedType)?.customFields?.map((field) => (
                            <div key={field.key} className="space-y-2">
                              <Label>{field.label}</Label>
                              {field.type === 'textarea' ? (
                                <Textarea placeholder={`Ingresa ${field.label.toLowerCase()}`} />
                              ) : field.type === 'select' ? (
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Seleccionar ${field.label.toLowerCase()}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {field.options?.map((option) => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type={field.type}
                                  placeholder={`Ingresa ${field.label.toLowerCase()}`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateWidget}
                      disabled={createWidgetMutation.isPending}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {createWidgetMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Crear Widget
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Widgets Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(widgets) && widgets.map((widget: any) => {
                  const WidgetComponent = getWidgetComponent(widget);
                  const widgetType = widgetTypes.find(t => t.type === widget.type);
                  let config = {};
                  try {
                    config = JSON.parse(widget.config || '{}');
                  } catch (error) {
                    config = {};
                  }

                  return (
                    <Card key={widget.id} className={`overflow-hidden transition-all hover:shadow-lg ${!widget.isEnabled ? 'opacity-60' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {widgetType && <widgetType.icon className="h-5 w-5 text-primary" />}
                            <CardTitle className="text-lg">{widget.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={widget.isEnabled ? "default" : "secondary"}>
                              {widget.isEnabled ? "Activo" : "Inactivo"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleWidgetStatus(widget)}
                            >
                              {widget.isEnabled ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingWidget(widget)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteWidgetMutation.mutate(widget.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>
                          Posición: {widget.position} • Tipo: {widget.type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {WidgetComponent && widget.isEnabled && (
                          <div className="mb-3">
                            <WidgetComponent config={config} />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Actualizado hace 1 min</span>
                          <Button size="sm" variant="ghost" className="h-6 px-2">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Widget Preview & Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Vista Previa en Vivo
                </CardTitle>
                <CardDescription>Widgets funcionando con datos reales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {widgetTypes.map((type) => {
                  const Component = type.component;
                  return (
                    <div key={type.type}>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.name} - Demo
                      </h4>
                      <Component config={type.defaultConfig} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Configuración de APIs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Para habilitar todas las funcionalidades:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><code>VITE_WEATHER_API_KEY</code> - OpenWeatherMap</li>
                    <li><code>VITE_NEWS_API_KEY</code> - NewsAPI</li>
                  </ul>
                  <p>Los widgets funcionan con datos demo sin APIs.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}