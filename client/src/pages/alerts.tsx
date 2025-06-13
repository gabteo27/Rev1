import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Eye, EyeOff, Edit, Trash2, Plus } from "lucide-react";
import AlertModal from "@/components/alerts/alert-modal";

export default function Alerts() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: () => apiRequest("/api/alerts").then(res => res.json()),
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/alerts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        // Don't throw error if alert was already deleted
        if (response.status === 404) {
          return null; // Silently ignore if already deleted
        }
        const error = await response.json().catch(() => ({ message: "Failed to delete alert" }));
        throw new Error(error.message || "Failed to delete alert");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      // Only show success message if the alert was actually deleted (not 404)
      if (data !== null) {
        toast({ title: "Alerta eliminada" });
      }
    },
    onError: (error: any) => {
      console.error("Error deleting alert:", error);
      toast({ 
        title: "Error al eliminar alerta",
        description: error.message || "No se pudo eliminar la alerta",
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

  // Auto-delete alerts when their duration expires
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;

    const activeAlerts = alerts.filter((alert: any) => alert.isActive && alert.duration > 0);
    const timeouts: NodeJS.Timeout[] = [];

    activeAlerts.forEach((alert: any) => {
      const createdTime = new Date(alert.createdAt).getTime();
      const currentTime = Date.now();
      const elapsedTime = (currentTime - createdTime) / 1000;
      const remainingTime = Math.max(0, alert.duration - elapsedTime);

      if (remainingTime > 0) {
        const timeoutId = setTimeout(() => {
          // Only delete if the component is still mounted and the alert still exists
          queryClient.getQueryData(["/api/alerts"])?.then((currentAlertsData: any) => {
            const stillExists = currentAlertsData?.find((a: any) => a.id === alert.id && a.isActive);
            if (stillExists) {
              deleteAlertMutation.mutate(alert.id);
            }
          }).catch(() => {
            // Ignore errors when checking current alerts
          });
        }, remainingTime * 1000);

        timeouts.push(timeoutId);
      } else if (elapsedTime >= alert.duration) {
        // Alert should have already expired, delete it immediately
        setTimeout(() => {
          deleteAlertMutation.mutate(alert.id);
        }, 100);
      }
    });

    // Cleanup all timeouts when component unmounts or alerts change
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [alerts, deleteAlertMutation, queryClient]);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "Manual";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  const getRemainingTime = (alert: any) => {
    if (!alert.isActive || alert.duration === 0) return null;

    const createdTime = new Date(alert.createdAt).getTime();
    const currentTime = Date.now();
    const elapsedTime = (currentTime - createdTime) / 1000;
    const remainingTime = Math.max(0, alert.duration - elapsedTime);

    if (remainingTime <= 0) return "Expirando...";

    if (remainingTime < 60) return `${Math.ceil(remainingTime)}s restantes`;
    return `${Math.ceil(remainingTime / 60)}m restantes`;
  };

  if (isLoading) {
    return <div className="p-6">Cargando alertas...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Alertas</h1>
          <p className="text-muted-foreground">
            Gestiona las alertas que se muestran en tus pantallas
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Alerta
        </Button>
      </div>

      <div className="grid gap-4">
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay alertas</h3>
              <p className="text-muted-foreground text-center mb-4">
                Las alertas te permiten mostrar mensajes importantes en todas tus pantallas de forma inmediata.
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Alerta
              </Button>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert: any) => {
            const remainingTime = getRemainingTime(alert);
            return (
              <Card key={alert.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: alert.backgroundColor }}
                      />
                      <div>
                        <CardTitle className="text-lg">{alert.message}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span>Duración: {formatDuration(alert.duration)}</span>
                          <Badge variant={alert.isActive ? "default" : "secondary"}>
                            {alert.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                          {remainingTime && (
                            <Badge variant="outline">{remainingTime}</Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAlertMutation.mutate({ 
                          id: alert.id, 
                          isActive: !alert.isActive 
                        })}
                        disabled={toggleAlertMutation.isPending}
                      >
                        {alert.isActive ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Activar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAlertMutation.mutate(alert.id)}
                        disabled={deleteAlertMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div
                    className="p-4 rounded-lg text-center font-medium"
                    style={{
                      backgroundColor: alert.backgroundColor,
                      color: alert.textColor,
                    }}
                  >
                    {alert.message}
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>Creada: {new Date(alert.createdAt).toLocaleString()}</p>
                    {alert.targetScreens?.length > 0 && (
                      <p>Pantallas objetivo: {alert.targetScreens.length}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AlertModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}