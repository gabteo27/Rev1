
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { FunctionalWidget } from "./functional-widget";
import type { Widget } from "@shared/schema";
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

export function WidgetPanel() {
  const { data: widgets = [], isLoading } = useQuery<Widget[]>({
    queryKey: ["/api/widgets"],
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case "clock":
        return Clock;
      case "weather":
        return CloudRain;
      case "news":
        return MessageSquare;
      case "rss":
        return TrendingUp;
      default:
        return Settings;
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
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : widgets.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">No hay widgets configurados</p>
            <p className="text-xs text-slate-500 mt-1">Ve a la sección Widgets para agregar algunos</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-80">
              <div className="space-y-3">
                {widgets.slice(0, 3).map((widget) => (
                  <FunctionalWidget 
                    key={widget.id} 
                    widget={widget}
                    className="w-full"
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-slate-500">
                {widgets.filter(w => w.isEnabled).length} de {widgets.length} activos
              </span>
              <Button size="sm" variant="ghost" className="text-xs">
                Ver Todos
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
