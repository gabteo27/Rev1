import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Cloud, Rss, Users, Clock, Newspaper, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertWidgetSchema, type Widget } from "@shared/schema";
import Header from "@/components/layout/header";

const widgetFormSchema = insertWidgetSchema.extend({
  settings: z.record(z.any()),
});

type WidgetFormData = z.infer<typeof widgetFormSchema>;

const widgetTypes = [
  { value: "clock", label: "Reloj", icon: Clock, description: "Muestra la hora y fecha actual" },
  { value: "weather", label: "Clima", icon: Cloud, description: "Información meteorológica en tiempo real" },
  { value: "rss", label: "RSS", icon: Rss, description: "Noticias y feeds RSS" },
  { value: "social", label: "Redes Sociales", icon: Users, description: "Posts de redes sociales" },
  { value: "news", label: "Noticias", icon: Newspaper, description: "Últimas noticias de fuentes confiables" },
];

const positions = [
  { value: "top-left", label: "Superior Izquierda" },
  { value: "top-right", label: "Superior Derecha" },
  { value: "bottom-left", label: "Inferior Izquierda" },
  { value: "bottom-right", label: "Inferior Derecha" },
  { value: "center", label: "Centro" },
];

export default function Widgets() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const { toast } = useToast();

  const { data: widgets = [], isLoading } = useQuery<Widget[]>({
    queryKey: ["/api/widgets"],
  });

  const form = useForm<WidgetFormData>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: {
      name: "",
      type: "",
      isEnabled: true,
      position: "top-right",
      settings: {},
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WidgetFormData) => {
      await apiRequest("/api/widgets", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      setIsCreateOpen(false);
      form.reset();
      setSelectedType("");
      toast({
        title: "Widget creado",
        description: "El widget se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Widget> }) => {
      await apiRequest(`/api/widgets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/widgets/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      toast({
        title: "Widget eliminado",
        description: "El widget se ha eliminado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WidgetFormData) => {
    createMutation.mutate(data);
  };

  const getWidgetIcon = (type: string) => {
    const widgetType = widgetTypes.find(t => t.value === type);
    return widgetType?.icon || Settings;
  };

  const getWidgetLabel = (type: string) => {
    const widgetType = widgetTypes.find(t => t.value === type);
    return widgetType?.label || type;
  };

  const renderWidgetSettings = () => {
    switch (selectedType) {
      case "weather":
        return (
          <>
            <FormField
              control={form.control}
              name="settings.apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key de OpenWeatherMap</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu API key de OpenWeatherMap" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Madrid, ES" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.units"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidades</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue="metric">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="metric">Celsius</SelectItem>
                      <SelectItem value="imperial">Fahrenheit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case "rss":
        return (
          <>
            <FormField
              control={form.control}
              name="settings.feedUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Feed RSS</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/rss" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.maxItems"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máximo de elementos</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.refreshInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo de actualización (minutos)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case "social":
        return (
          <>
            <FormField
              control={form.control}
              name="settings.platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plataforma</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona plataforma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario/Handle</FormLabel>
                  <FormControl>
                    <Input placeholder="@usuario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.accessToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token de Acceso</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Token de la API" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case "news":
        return (
          <>
            <FormField
              control={form.control}
              name="settings.apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key de NewsAPI</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu API key de NewsAPI" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue="es">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="es">España</SelectItem>
                      <SelectItem value="us">Estados Unidos</SelectItem>
                      <SelectItem value="mx">México</SelectItem>
                      <SelectItem value="ar">Argentina</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="business">Negocios</SelectItem>
                      <SelectItem value="technology">Tecnología</SelectItem>
                      <SelectItem value="sports">Deportes</SelectItem>
                      <SelectItem value="entertainment">Entretenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case "clock":
        return (
          <>
            <FormField
              control={form.control}
              name="settings.format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formato</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue="24h">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="24h">24 horas</SelectItem>
                      <SelectItem value="12h">12 horas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.showDate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Mostrar fecha</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zona horaria</FormLabel>
                  <FormControl>
                    <Input placeholder="Europe/Madrid" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Widgets Integrados"
        subtitle="Gestiona widgets de clima, noticias, redes sociales y más"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Widget
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-slate-200 rounded"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : widgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="w-12 h-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No hay widgets configurados
            </h3>
            <p className="text-slate-500 text-center mb-4">
              Agrega widgets para mostrar información dinámica en tus pantallas
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets.map((widget) => {
            const IconComponent = getWidgetIcon(widget.type);
            return (
              <Card key={widget.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <IconComponent className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{widget.name}</CardTitle>
                        <CardDescription>{getWidgetLabel(widget.type)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={widget.isEnabled ? "default" : "secondary"}>
                        {widget.isEnabled ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-slate-600">
                    <strong>Posición:</strong> {positions.find(p => p.value === widget.position)?.label}
                  </div>
                  
                  {widget.settings && Object.keys(widget.settings).length > 0 && (
                    <div className="text-sm text-slate-600">
                      <strong>Configuración:</strong>
                      <div className="mt-1 space-y-1">
                        {Object.entries(widget.settings).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-4 border-t">
                    <Switch
                      checked={widget.isEnabled}
                      onCheckedChange={(checked) => 
                        updateMutation.mutate({
                          id: widget.id,
                          data: { isEnabled: checked }
                        })
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(widget.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Widget</DialogTitle>
            <DialogDescription>
              Configura un widget para mostrar información dinámica en tus pantallas
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Widget del clima" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Widget</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedType(value);
                      form.setValue("settings", {});
                    }}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo de widget" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {widgetTypes.map((type) => {
                          const IconComponent = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center space-x-2">
                                <IconComponent className="w-4 h-4" />
                                <div>
                                  <div>{type.label}</div>
                                  <div className="text-xs text-slate-500">{type.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posición en pantalla</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue="top-right">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions.map((position) => (
                          <SelectItem key={position.value} value={position.value}>
                            {position.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedType && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">Configuración específica</h4>
                  {renderWidgetSettings()}
                </div>
              )}

              <FormField
                control={form.control}
                name="isEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Activar widget</FormLabel>
                      <div className="text-sm text-slate-500">
                        El widget se mostrará en las pantallas cuando esté activo
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setSelectedType("");
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear Widget"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}