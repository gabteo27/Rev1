import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import AlertModal from "@/components/alerts/alert-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  AlertTriangle, 
  Clock, 
  Monitor,
  Trash2,
  Edit,
  Send
} from "lucide-react";

export default function Alerts() {
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["/api/alerts"],
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/alerts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Alerta eliminada",
        description: "La alerta ha sido eliminada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la alerta.",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/alerts/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado de la alerta ha sido actualizado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la alerta.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Alertas" subtitle="Gestiona notificaciones urgentes" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando alertas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Alertas"
        subtitle="Gestiona notificaciones urgentes"
        actions={
          <Button 
            onClick={() => setAlertModalOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerta Urgente
          </Button>
        }
      />

      <div className="flex-1 px-6 py-6 overflow-auto">
        {!alerts || alerts.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No tienes alertas creadas
              </h3>
              <p className="text-slate-600 mb-6">
                Las alertas te permiten mostrar mensajes urgentes que se superponen al contenido actual en todas las pantallas.
              </p>
              <Button 
                onClick={() => setAlertModalOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Crear Primera Alerta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert: any) => (
              <Card key={alert.id} className="border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div 
                          className="w-4 h-4 rounded-full border-2"
                          style={{ 
                            backgroundColor: alert.backgroundColor,
                            borderColor: alert.backgroundColor 
                          }}
                        ></div>
                        <div className="flex items-center space-x-2">
                          {alert.isActive && (
                            <Badge className="bg-red-100 text-red-800">
                              Activa
                            </Badge>
                          )}
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDuration(alert.duration)}
                          </Badge>
                        </div>
                      </div>

                      <div 
                        className="p-4 rounded-lg mb-4"
                        style={{ 
                          backgroundColor: alert.backgroundColor,
                          color: alert.textColor 
                        }}
                      >
                        <p className="font-medium">{alert.message}</p>
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-slate-600">
                        <div className="flex items-center">
                          <Monitor className="w-4 h-4 mr-1" />
                          <span>
                            {alert.targetScreens?.length > 0 
                              ? `${alert.targetScreens.length} pantallas`
                              : "Todas las pantallas"
                            }
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>Creada: {formatDate(alert.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 ml-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-600">
                          {alert.isActive ? "Activa" : "Inactiva"}
                        </span>
                        <Switch
                          checked={alert.isActive}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: alert.id, isActive: checked })
                          }
                          disabled={toggleActiveMutation.isPending}
                        />
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(alert.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertModal 
        open={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
      />
    </div>
  );
}
