import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Eye, EyeOff, Edit, Trash2, Plus, Monitor, Clock, Zap } from "lucide-react";
import AlertModal from "@/components/alerts/alert-modal";

export default function Alerts() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const { toast } = useToast();

  const { data: alerts = [], isLoading, error: alertsError } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      const response = await apiRequest("/api/alerts");
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 5000,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: screens = [] } = useQuery({
    queryKey: ["/api/screens"],
    queryFn: async () => {
      const response = await apiRequest("/api/screens");
      if (!response.ok) {
        throw new Error(`Failed to fetch screens: ${response.status}`);
      }
      return response.json();
    },
  });

  const { data: fixedAlerts = [], error: fixedAlertsError } = useQuery({
    queryKey: ["/api/alerts/fixed"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/alerts/fixed");
        if (!response.ok) {
          if (response.status === 500) {
            console.warn("Fixed alerts endpoint error, returning empty array");
            return [];
          }
          throw new Error(`Failed to fetch fixed alerts: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.warn("Error fetching fixed alerts:", error);
        return [];
      }
    },
    refetchInterval: 5000,
    retry: 1,
    retryDelay: 2000,
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/alerts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        if (response.status === 404) {
          // Alert already deleted, just refresh the list
          queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/alerts/fixed"] });
          return { success: true, alreadyDeleted: true };
        }
        const error = await response.json().catch(() => ({ message: "Failed to delete alert" }));
        throw new Error(error.message || "Failed to delete alert");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/fixed"] });
      if (!data?.alreadyDeleted) {
        toast({ title: "Alerta eliminada exitosamente" });
      }
    },
    onError: (error: any) => {
      console.error("Error deleting alert:", error);
      // Don't show error for 404s since the alert is already gone
      if (!error.message?.includes("404") && !error.message?.includes("not found")) {
        toast({ 
          title: "Error al eliminar alerta",
          description: error.message || "No se pudo eliminar la alerta",
          variant: "destructive"
        });
      }
    },
  });

  const deactivateFixedAlertMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/alerts/fixed/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to deactivate alert" }));
        throw new Error(error.message || "Failed to deactivate alert");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/fixed"] });
      toast({ title: "Alerta fija desactivada exitosamente" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al desactivar alerta",
        description: error.message || "No se pudo desactivar la alerta fija",
        variant: "destructive"
      });
    },
  });

  const toggleAlertMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest(`/api/alerts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Estado de alerta actualizado" });
    },
  });

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "Manual";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  const getRemainingTime = (alert: any) => {
    if (!alert.isActive || alert.duration === 0 || alert.isFixed) return null;

    const createdTime = new Date(alert.createdAt).getTime();
    const currentTime = Date.now();
    const elapsedTime = (currentTime - createdTime) / 1000;
    const remainingTime = Math.max(0, alert.duration - elapsedTime);

    if (remainingTime <= 0) return "Expirando...";

    if (remainingTime < 60) return `${Math.ceil(remainingTime)}s restantes`;
    return `${Math.ceil(remainingTime / 60)}m restantes`;
  };

  const getTargetScreensText = (alert: any) => {
    if (!alert.targetScreens || alert.targetScreens.length === 0) {
      return "Todas las pantallas";
    }
    return `${alert.targetScreens.length} pantalla(s) específica(s)`;
  };

  const handleEditAlert = (alert: any) => {
    setEditingAlert(alert);
    setCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingAlert(null);
    setCreateModalOpen(false);
  };

  // Show error state if there are critical errors
  if (alertsError && !alerts?.length) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-600 mb-2">
            Error al cargar las alertas
          </h3>
          <p className="text-gray-600 mb-6">
            {alertsError.message || "No se pudieron cargar las alertas. Intenta nuevamente."}
          </p>
          <Button onClick={() => window.location.reload()}>
            Recargar página
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Separate alerts by type
  const regularAlerts = alerts.filter((alert: any) => !alert.isFixed);
  const fixedAlertsActive = fixedAlerts.filter((alert: any) => alert.isActive);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Alertas</h1>
          <p className="text-muted-foreground">
            Administra alertas temporales y fijas para tus pantallas
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Alerta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Bell className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Alertas</p>
                <p className="text-2xl font-bold">{regularAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Eye className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Activas</p>
                <p className="text-2xl font-bold">
                  {regularAlerts.filter((a: any) => a.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Zap className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Alertas Fijas</p>
                <p className="text-2xl font-bold">{fixedAlertsActive.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Monitor className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Pantallas</p>
                <p className="text-2xl font-bold">{screens.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Alerts Section */}
      {fixedAlertsActive.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-600" />
            Alertas Fijas Activas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixedAlertsActive.map((alert: any) => (
              <Card key={alert.id} className="border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Zap className="w-3 h-3 mr-1" />
                      Fija
                    </Badge>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAlert(alert)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deactivateFixedAlertMutation.mutate(alert.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className="p-3 rounded-lg text-center font-medium mb-3"
                    style={{
                      backgroundColor: alert.backgroundColor,
                      color: alert.textColor,
                    }}
                  >
                    {alert.message}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📅 {new Date(alert.createdAt).toLocaleString()}</p>
                    <p>🎯 {getTargetScreensText(alert)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Regular Alerts Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-blue-600" />
          Alertas Temporales
        </h2>

        {regularAlerts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No hay alertas temporales
                </h3>
                <p className="text-muted-foreground mb-6">
                  Crea tu primera alerta para notificar a tus pantallas
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Alerta
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularAlerts.map((alert: any) => {
              const remainingTime = getRemainingTime(alert);
              const isExpiring = remainingTime === "Expirando...";

              return (
                <Card 
                  key={alert.id} 
                  className={`${
                    alert.isActive 
                      ? isExpiring 
                        ? "border-orange-200 bg-orange-50" 
                        : "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant={alert.isActive ? "default" : "secondary"}>
                          {alert.isActive ? (
                            <><Eye className="w-3 h-3 mr-1" /> Activa</>
                          ) : (
                            <><EyeOff className="w-3 h-3 mr-1" /> Inactiva</>
                          )}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDuration(alert.duration)}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAlert(alert)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAlertMutation.mutate({ 
                            id: alert.id, 
                            isActive: !alert.isActive 
                          })}
                          className="h-8 w-8 p-0"
                        >
                          {alert.isActive ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAlertMutation.mutate(alert.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="p-3 rounded-lg text-center font-medium mb-3"
                      style={{
                        backgroundColor: alert.backgroundColor,
                        color: alert.textColor,
                      }}
                    >
                      {alert.message}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>📅 {new Date(alert.createdAt).toLocaleString()}</p>
                      <p>🎯 {getTargetScreensText(alert)}</p>
                      {remainingTime && (
                        <p className={isExpiring ? "text-orange-600 font-medium" : ""}>
                          ⏱️ {remainingTime}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertModal
        open={createModalOpen}
        onClose={handleCloseModal}
        screens={screens}
        alert={editingAlert}
      />
    </div>
  );
}