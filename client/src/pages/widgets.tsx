import { useState } from "react";
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
  Trash2
} from "lucide-react";

const widgetTypes = [
  { value: "clock", label: "Reloj", icon: Clock, description: "Muestra la hora actual" },
  { value: "weather", label: "Clima", icon: Thermometer, description: "Información meteorológica" },
  { value: "news", label: "Noticias", icon: Rss, description: "Feed de noticias RSS" },
  { value: "text", label: "Texto", icon: Type, description: "Texto personalizado" },
  { value: "image", label: "Imagen", icon: Image, description: "Imagen estática" },
  { value: "calendar", label: "Calendario", icon: Calendar, description: "Eventos del calendario" },
];

export default function Widgets() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
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
      config: JSON.stringify(config)
    });
  };

  const handleDeleteWidget = (id: number) => {
    deleteMutation.mutate(id);
  };

  const getWidgetIcon = (type: string) => {
    const widgetType = widgetTypes.find(w => w.value === type);
    return widgetType ? widgetType.icon : Settings;
  };

  const getWidgetConfig = (type: string) => {
    switch (type) {
      case "clock":
        return { format: "24h", timezone: "America/Mexico_City" };
      case "weather":
        return { city: "Mexico City", units: "metric" };
      case "news":
        return { rssUrl: "https://feeds.example.com/news", maxItems: 5 };
      case "text":
        return { text: "Texto personalizado", fontSize: "16px", color: "#000000" };
      case "image":
        return { url: "", alt: "Imagen", width: "100px", height: "100px" };
      case "calendar":
        return { source: "google", maxEvents: 3 };
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
        title="Widgets"
        subtitle="Personaliza elementos interactivos para tus pantallas"
        actions={
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
                  <Label htmlFor="position">Posición</Label>
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
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateWidget} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creando..." : "Crear"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Available Widget Types */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Widgets</CardTitle>
            <CardDescription>
              Widgets disponibles para agregar a tus pantallas
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
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Widgets */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widgets Activos ({Array.isArray(widgets) ? widgets.length : 0})</CardTitle>
              <CardDescription>
                Widgets configurados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!Array.isArray(widgets) || widgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay widgets activos</p>
                  <p className="text-sm">Crea tu primer widget</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {widgets.map((widget: any) => {
                    const IconComponent = getWidgetIcon(widget.type);
                    return (
                      <div key={widget.id} className="border rounded-lg p-4">
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
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{widget.position}</Badge>
                            <Badge variant="secondary">
                              {widget.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          
                          {widget.config && (
                            <div className="bg-muted rounded p-2">
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(JSON.parse(widget.config || "{}"), null, 2)}
                              </pre>
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
    </div>
  );
}