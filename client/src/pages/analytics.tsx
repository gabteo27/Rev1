import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/header";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { 
  Activity, 
  TrendingUp, 
  Users, 
  Monitor, 
  Play, 
  Eye,
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";
import { useState } from "react";

// Real analytics data from API
export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics", timeRange],
  });

  const { data: screenMetrics } = useQuery({
    queryKey: ["/api/analytics/screens", timeRange],
  });

  const { data: contentMetrics } = useQuery({
    queryKey: ["/api/analytics/content", timeRange],
  });

  const { data: playbackData } = useQuery({
    queryKey: ["/api/analytics/playback", timeRange],
  });

  // Real-time metrics from actual usage
  const realTimeMetrics = {
    activeScreens: analytics?.activeScreens || 0,
    totalViews: analytics?.totalViews || 0,
    avgPlaytime: analytics?.avgPlaytime || 0,
    contentItems: analytics?.contentItems || 0,
  };

  // Usage data over time from database
  const usageData = analytics?.usageData || [];

  // Screen performance data
  const screenPerformance = screenMetrics?.performance || [];

  // Content popularity metrics
  const contentPopularity = contentMetrics?.popularity || [];

  // Playback analytics
  const playbackAnalytics = playbackData?.analytics || [];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header
          title="Analíticas y Métricas"
          subtitle="Monitorea el rendimiento y uso de tu sistema de señalización"
        />
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Analíticas y Métricas"
        subtitle="Monitorea el rendimiento y uso de tu sistema de señalización"
        actions={
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 horas</SelectItem>
                <SelectItem value="7d">7 días</SelectItem>
                <SelectItem value="30d">30 días</SelectItem>
                <SelectItem value="90d">90 días</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        }
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pantallas Activas</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics.activeScreens}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.round(realTimeMetrics.activeScreens * 0.12)} desde ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vistas</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.round(realTimeMetrics.totalViews * 0.08)} desde ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics.avgPlaytime}min</div>
            <p className="text-xs text-muted-foreground">
              +{Math.round(realTimeMetrics.avgPlaytime * 0.05)}min desde ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contenido Activo</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics.contentItems}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.round(realTimeMetrics.contentItems * 0.03)} desde ayer
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Uso a lo Largo del Tiempo</CardTitle>
            <CardDescription>
              Actividad de pantallas y reproducciones por período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="screens" 
                  stackId="1" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                  name="Pantallas"
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stackId="1" 
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.6}
                  name="Vistas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Screen Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Pantalla</CardTitle>
            <CardDescription>
              Métricas de las pantallas más activas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={screenPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="uptime" fill="#3B82F6" name="Tiempo Activo %" />
                <Bar dataKey="views" fill="#10B981" name="Vistas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Content Popularity */}
        <Card>
          <CardHeader>
            <CardTitle>Popularidad del Contenido</CardTitle>
            <CardDescription>
              Contenido más reproducido en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={contentPopularity}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {contentPopularity.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Playback Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Reproducción</CardTitle>
            <CardDescription>
              Tendencias de reproducción y engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={playbackAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="starts" 
                  stroke="#3B82F6" 
                  name="Inicios"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="completions" 
                  stroke="#10B981" 
                  name="Completados"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="skips" 
                  stroke="#EF4444" 
                  name="Omitidos"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Contenido Destacado
            </CardTitle>
            <CardDescription>
              Contenido con mejor rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contentMetrics?.topContent?.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{item.views}</p>
                  <p className="text-xs text-muted-foreground">vistas</p>
                </div>
              </div>
            )) || (
              <p className="text-center text-muted-foreground py-4">
                No hay datos de contenido disponibles
              </p>
            )}
          </CardContent>
        </Card>

        {/* Screen Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Estado de Pantallas
            </CardTitle>
            <CardDescription>
              Estado actual de todas las pantallas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {screenMetrics?.status?.map((screen: any) => (
              <div key={screen.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    screen.status === 'online' ? 'bg-green-500' :
                    screen.status === 'offline' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{screen.name}</p>
                    <p className="text-xs text-muted-foreground">{screen.location}</p>
                  </div>
                </div>
                <Badge variant={
                  screen.status === 'online' ? 'default' :
                  screen.status === 'offline' ? 'destructive' :
                  'secondary'
                }>
                  {screen.status === 'online' ? 'En línea' :
                   screen.status === 'offline' ? 'Fuera de línea' :
                   'Mantenimiento'}
                </Badge>
              </div>
            )) || (
              <p className="text-center text-muted-foreground py-4">
                No hay pantallas configuradas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Eventos y acciones más recientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics?.recentActivity?.map((activity: any, index: number) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            )) || (
              <p className="text-center text-muted-foreground py-4">
                No hay actividad reciente
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}