
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Clock, 
  Monitor,
  Play,
  Users,
  Calendar,
  Download
} from "lucide-react";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics", timeRange],
    retry: false,
  });

  // Mock data for demonstration
  const mockStats = {
    totalViews: 1234,
    activeScreens: 5,
    contentPlayed: 89,
    avgSessionTime: "4m 32s",
    topContent: [
      { name: "Promoción Verano", views: 245, duration: "30s" },
      { name: "Noticias Corporativas", views: 198, duration: "45s" },
      { name: "Menú del Día", views: 156, duration: "60s" }
    ],
    screenActivity: [
      { name: "Recepción Principal", status: "online", lastActive: "Hace 2 min" },
      { name: "Cafetería", status: "online", lastActive: "Hace 5 min" },
      { name: "Sala de Espera", status: "offline", lastActive: "Hace 2 horas" }
    ]
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Analíticas" subtitle="Métricas y estadísticas de rendimiento" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando analíticas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Analíticas"
        subtitle="Métricas y estadísticas de rendimiento"
        actions={
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Último día</SelectItem>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="90d">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        }
      />

      <div className="flex-1 px-6 py-6 overflow-auto">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Visualizaciones</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.totalViews.toLocaleString()}</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12% vs período anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pantallas Activas</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.activeScreens}</div>
              <div className="text-xs text-slate-500">de 6 totales</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contenido Reproducido</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.contentPlayed}</div>
              <div className="text-xs text-slate-500">piezas únicas</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.avgSessionTime}</div>
              <div className="text-xs text-slate-500">por sesión</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Contenido Más Visto</span>
              </CardTitle>
              <CardDescription>
                Los contenidos con mayor número de reproducciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockStats.topContent.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-slate-500">Duración: {item.duration}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{item.views}</p>
                      <p className="text-xs text-slate-500">vistas</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Screen Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5" />
                <span>Actividad de Pantallas</span>
              </CardTitle>
              <CardDescription>
                Estado actual de tus dispositivos de visualización
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockStats.screenActivity.map((screen, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <p className="font-medium">{screen.name}</p>
                        <p className="text-sm text-slate-500">{screen.lastActive}</p>
                      </div>
                    </div>
                    <Badge className={screen.status === "online" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {screen.status === "online" ? "En línea" : "Desconectada"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for charts */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tendencias de Visualización</CardTitle>
            <CardDescription>
              Gráfico de visualizaciones a lo largo del tiempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500">Gráfico de tendencias próximamente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
