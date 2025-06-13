import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Monitor } from "lucide-react";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  screens?: any[];
  alert?: any; // For editing existing alerts
}

const durationOptions = [
  { value: 10, label: "10 segundos" },
  { value: 30, label: "30 segundos" },
  { value: 60, label: "1 minuto" },
  { value: 300, label: "5 minutos" },
  { value: 600, label: "10 minutos" },
  { value: 0, label: "Permanente (hasta cerrar manualmente)" },
];

export default function AlertModal({ open, onClose, screens = [], alert }: AlertModalProps) {
  const [message, setMessage] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#ef4444");
  const [textColor, setTextColor] = useState("#ffffff");
  const [duration, setDuration] = useState(30);
  const [isFixed, setIsFixed] = useState(false);
  const [selectedScreens, setSelectedScreens] = useState<number[]>([]);
  const [targetAllScreens, setTargetAllScreens] = useState(true);

  // Initialize state when alert prop changes
  useState(() => {
    if (alert) {
      setMessage(alert.message || "");
      setBackgroundColor(alert.backgroundColor || "#ef4444");
      setTextColor(alert.textColor || "#ffffff");
      setDuration(alert.duration || 30);
      setIsFixed(alert.isFixed || false);
      setSelectedScreens(alert.targetScreens || []);
      setTargetAllScreens(!alert.targetScreens || alert.targetScreens.length === 0);
    }
  });

  const { toast } = useToast();

  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      const endpoint = isFixed ? "/api/alerts/fixed" : "/api/alerts";
      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(alertData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create alert" }));
        throw new Error(error.message || "Failed to create alert");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/fixed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/active"] });
      toast({
        title: `${isFixed ? "Alerta fija" : "Alerta"} creada`,
        description: "La alerta ha sido enviada exitosamente.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la alerta.",
        variant: "destructive",
      });
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      const response = await apiRequest(`/api/alerts/${alert.id}`, {
        method: "PUT",
        body: JSON.stringify(alertData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update alert" }));
        throw new Error(error.message || "Failed to update alert");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/fixed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/active"] });
      toast({
        title: "Alerta actualizada",
        description: "Los cambios han sido guardados exitosamente.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la alerta.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "El mensaje es requerido.",
        variant: "destructive",
      });
      return;
    }

    const alertData = {
      message: message.trim(),
      backgroundColor,
      textColor,
      duration: isFixed ? 0 : duration,
      isFixed,
      targetScreens: targetAllScreens ? [] : selectedScreens,
      isActive: true,
    };

    if (alert) {
      updateAlertMutation.mutate(alertData);
    } else {
      createAlertMutation.mutate(alertData);
    }
  };

  const handleClose = () => {
    if (!alert) {
      setMessage("");
      setBackgroundColor("#ef4444");
      setTextColor("#ffffff");
      setDuration(30);
      setIsFixed(false);
      setSelectedScreens([]);
      setTargetAllScreens(true);
    }
    onClose();
  };

  const toggleScreenSelection = (screenId: number) => {
    setSelectedScreens(prev => 
      prev.includes(screenId) 
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId]
    );
  };

  const isPending = createAlertMutation.isPending || updateAlertMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {alert ? "Editar Alerta" : "Nueva Alerta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert Type */}
          <div className="flex items-center space-x-2">
            <Switch
              checked={isFixed}
              onCheckedChange={setIsFixed}
              disabled={!!alert} // Can't change type when editing
            />
            <Label>
              {isFixed ? "Alerta Fija (permanente)" : "Alerta Temporal"}
            </Label>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Mensaje de la Alerta</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ingresa el mensaje de la alerta..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="backgroundColor">Color de Fondo</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#ef4444"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="textColor">Color del Texto</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          {/* Duration (only for non-fixed alerts) */}
          {!isFixed && (
            <div>
              <Label htmlFor="duration">Duración</Label>
              <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar duración..." />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target Screens */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Switch
                checked={targetAllScreens}
                onCheckedChange={(checked) => {
                  setTargetAllScreens(checked);
                  if (checked) {
                    setSelectedScreens([]);
                  }
                }}
              />
              <Label>Mostrar en todas las pantallas</Label>
            </div>

            {!targetAllScreens && (
              <div>
                <Label>Pantallas específicas</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {screens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay pantallas disponibles
                    </p>
                  ) : (
                    screens.map((screen) => (
                      <div
                        key={screen.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedScreens.includes(screen.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => toggleScreenSelection(screen.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <Monitor className="w-4 h-4" />
                          <span className="font-medium">{screen.name}</span>
                        </div>
                        {screen.location && (
                          <Badge variant="outline" className="text-xs">
                            {screen.location}
                          </Badge>
                        )}
                        <div className="flex-1" />
                        <Badge variant={screen.isOnline ? "default" : "secondary"}>
                          {screen.isOnline ? "En línea" : "Fuera de línea"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
                {selectedScreens.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedScreens.length} pantalla(s) seleccionada(s)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <Label>Vista Previa</Label>
            <div
              className="mt-2 p-4 rounded-lg text-center font-medium"
              style={{
                backgroundColor,
                color: textColor,
              }}
            >
              {message || "Tu mensaje aparecerá aquí..."}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending 
                ? "Guardando..." 
                : alert 
                  ? "Actualizar Alerta" 
                  : `Crear ${isFixed ? "Alerta Fija" : "Alerta"}`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}