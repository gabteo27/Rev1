import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CloudSun, 
  Rss, 
  Share2,
  Settings,
  Plus
} from "lucide-react";

const defaultWidgets = [
  {
    type: "clock",
    name: "Reloj y Fecha",
    description: "Esquina superior derecha",
    icon: Clock,
    color: "text-blue-600",
    isDefault: true,
  },
  {
    type: "weather",
    name: "Clima",
    description: "Madrid, España",
    icon: CloudSun,
    color: "text-yellow-600",
    isDefault: true,
  },
  {
    type: "rss",
    name: "Noticias RSS",
    description: "El País - Tecnología",
    icon: Rss,
    color: "text-orange-600",
    isDefault: true,
  },
  {
    type: "social",
    name: "Redes Sociales",
    description: "Twitter/X Feed",
    icon: Share2,
    color: "text-purple-600",
    isDefault: true,
  },
];

export default function WidgetPanel() {
  const { toast } = useToast();

  const { data: widgets = [] } = useQuery({
    queryKey: ["/api/widgets"],
    retry: false,
  });

  const createWidgetMutation = useMutation({
    mutationFn: async (widgetData: any) => {
      const response = await apiRequest("POST", "/api/widgets", widgetData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Widget creado",
        description: "El widget ha sido agregado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el widget.",
        variant: "destructive",
      });
    },
  });

  const updateWidgetMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: number; isEnabled: boolean }) => {
      const response = await apiRequest("PUT", `/api/widgets/${id}`, { isEnabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el widget.",
        variant: "destructive",
      });
    },
  });

  const handleCreateDefaultWidget = (widgetType: any) => {
    const widgetData = {
      type: widgetType.type,
      name: widgetType.name,
      isEnabled: true,
      position: "top-right",
      settings: {
        description: widgetType.description,
      },
    };

    createWidgetMutation.mutate(widgetData);
  };

  const handleToggleWidget = (widget: any, enabled: boolean) => {
    updateWidgetMutation.mutate({ id: widget.id, isEnabled: enabled });
  };

  // Merge default widgets with user widgets
  const allWidgets = defaultWidgets.map(defaultWidget => {
    const userWidget = widgets.find((w: any) => w.type === defaultWidget.type);
    return {
      ...defaultWidget,
      ...userWidget,
      isEnabled: userWidget?.isEnabled || false,
      hasUserVersion: !!userWidget,
    };
  });

  return (
    <Card className="border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Widgets Activos</h3>
          <Button size="sm" variant="ghost">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4 space-y-3">
        {allWidgets.map((widget, index) => (
          <div key={widget.type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <widget.icon className={`w-5 h-5 ${widget.color}`} />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {widget.name}
                </p>
                <p className="text-xs text-slate-500">
                  {widget.description}
                </p>
                {widget.isEnabled && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Activo
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                className="p-1 h-auto text-slate-400 hover:text-slate-600"
              >
                <Settings className="w-4 h-4" />
              </Button>
              
              <div className="switch">
                <input
                  type="checkbox"
                  checked={widget.isEnabled}
                  onChange={(e) => {
                    if (widget.hasUserVersion) {
                      handleToggleWidget(widget, e.target.checked);
                    } else if (e.target.checked) {
                      handleCreateDefaultWidget(widget);
                    }
                  }}
                  disabled={updateWidgetMutation.isPending || createWidgetMutation.isPending}
                />
                <span className="slider"></span>
              </div>
            </div>
          </div>
        ))}

        {/* Add Custom Widget */}
        <Button
          variant="outline"
          className="w-full mt-4 py-3 border-dashed border-2 border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600"
          onClick={() => {
            toast({
              title: "Funcionalidad en desarrollo",
              description: "La creación de widgets personalizados estará disponible pronto.",
            });
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Widget Personalizado
        </Button>
      </CardContent>
    </Card>
  );
}
