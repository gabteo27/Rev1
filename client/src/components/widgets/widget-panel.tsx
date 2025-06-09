
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  CloudRain, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  Plus,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { useState } from "react";

interface Widget {
  id: string;
  name: string;
  type: string;
  icon: any;
  isActive: boolean;
  data?: any;
}

export default function WidgetPanel() {
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: "1",
      name: "Reloj Digital",
      type: "clock",
      icon: Clock,
      isActive: true,
      data: { format: "24h", timezone: "America/Mexico_City" }
    },
    {
      id: "2",
      name: "Estado del Tiempo",
      type: "weather",
      icon: CloudRain,
      isActive: true,
      data: { location: "Ciudad de México", temp: "22°C" }
    },
    {
      id: "3",
      name: "Indicadores",
      type: "metrics",
      icon: TrendingUp,
      isActive: false,
      data: { value: "85%", label: "Satisfacción" }
    },
    {
      id: "4",
      name: "Calendario",
      type: "calendar",
      icon: Calendar,
      isActive: true,
      data: { events: 3 }
    },
    {
      id: "5",
      name: "Mensajes",
      type: "messages",
      icon: MessageSquare,
      isActive: false,
      data: { unread: 2 }
    }
  ]);

  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(widget =>
      widget.id === id
        ? { ...widget, isActive: !widget.isActive }
        : widget
    ));
  };

  const getWidgetValue = (widget: Widget) => {
    switch (widget.type) {
      case "clock":
        return new Date().toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      case "weather":
        return widget.data?.temp || "22°C";
      case "metrics":
        return widget.data?.value || "0%";
      case "calendar":
        return `${widget.data?.events || 0} eventos`;
      case "messages":
        return `${widget.data?.unread || 0} mensajes`;
      default:
        return "N/A";
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Widgets Activos</CardTitle>
            <CardDescription>Información en tiempo real</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Añadir
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {widgets.map((widget) => {
              const IconComponent = widget.icon;
              return (
                <div
                  key={widget.id}
                  className={`p-3 rounded-lg border transition-all ${
                    widget.isActive
                      ? "bg-blue-50 border-blue-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        widget.isActive
                          ? "bg-blue-100"
                          : "bg-slate-200"
                      }`}>
                        <IconComponent className={`w-4 h-4 ${
                          widget.isActive
                            ? "text-blue-600"
                            : "text-slate-500"
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {widget.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {widget.type}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={widget.isActive ? "default" : "secondary"}>
                        {getWidgetValue(widget)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleWidget(widget.id)}
                      >
                        {widget.isActive ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {widget.isActive && (
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Actualizado hace 1 min</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2">
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-slate-500">
            {widgets.filter(w => w.isActive).length} de {widgets.length} activos
          </span>
          <Button size="sm" variant="ghost" className="text-xs">
            Configurar Todo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
