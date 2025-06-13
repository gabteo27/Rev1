import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Palette, Monitor, Clock, Zap } from "lucide-react";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  screens: any[];
  alert?: any;
}

export default function AlertModal({ open, onClose, screens = [], alert }: AlertModalProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    message: "",
    backgroundColor: "#ef4444",
    textColor: "#ffffff",
    duration: 30,
    targetScreens: [] as number[],
    isFixed: false
  });

  useEffect(() => {
    if (alert) {
      setFormData({
        message: alert.message || "",
        backgroundColor: alert.backgroundColor || "#ef4444",
        textColor: alert.textColor || "#ffffff",
        duration: alert.duration || 30,
        targetScreens: Array.isArray(alert.targetScreens) ? alert.targetScreens : [],
        isFixed: alert.isFixed || false
      });
    } else {
      setFormData({
        message: "",
        backgroundColor: "#ef4444",
        textColor: "#ffffff",
        duration: 30,
        targetScreens: [],
        isFixed: false
      });
    }
  }, [alert, open]);

  const createAlertMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = data.isFixed ? "/api/alerts/fixed" : "/api/alerts";
      const method = alert ? "PUT" : "POST";
      const url = alert ? `/api/alerts/${alert.id}` : endpoint;

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save alert");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: alert ? "Alerta actualizada" : "Alerta creada",
        description: `La alerta ${formData.isFixed ? 'fija' : 'temporal'} se ha ${alert ? 'actualizado' : 'creado'} exitosamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/fixed"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `No se pudo ${alert ? 'actualizar' : 'crear'} la alerta.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      toast({
        title: "Error",
        description: "El mensaje de la alerta es requerido.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.isFixed && (formData.duration < 1 || formData.duration > 3600)) {
      toast({
        title: "Error",
        description: "La duración debe estar entre 1 y 3600 segundos.",
        variant: "destructive",
      });
      return;
    }

    createAlertMutation.mutate(formData);
  };

  const handleScreenToggle = (screenId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      targetScreens: checked 
        ? [...prev.targetScreens, screenId]
        : prev.targetScreens.filter(id => id !== screenId)
    }));
  };

  const colorPresets = [
    { name: "Rojo", bg: "#ef4444", text: "#ffffff" },
    { name: "Naranja", bg: "#f97316", text: "#ffffff" },
    { name: "Amarillo", bg: "#eab308", text: "#000000" },
    { name: "Verde", bg: "#22c55e", text: "#ffffff" },
    { name: "Azul", bg: "#3b82f6", text: "#ffffff" },
    { name: "Púrpura", bg: "#a855f7", text: "#ffffff" },
    { name: "Gris", bg: "#6b7280", text: "#ffffff" },
    { name: "Negro", bg: "#000000", text: "#ffffff" }
  ];

  // Ensure screens is always an array
  const safeScreens = Array.isArray(screens) ? screens : [];

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.isFixed ? (
              <Zap className="w-5 h-5 text-yellow-600" />
            ) : (
              <Clock className="w-5 h-5 text-blue-600" />
            )}
            {alert ? "Editar Alerta" : "Nueva Alerta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alert Type Toggle */}
          <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
            <Switch
              checked={formData.isFixed}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                isFixed: checked,
                duration: checked ? 0 : 30
              }))}
            />
            <div className="flex-1">
              <Label className="text-sm font-medium">
                {formData.isFixed ? "Alerta Fija" : "Alerta Temporal"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {formData.isFixed 
                  ? "Se muestra permanentemente hasta ser desactivada" 
                  : "Se muestra por un tiempo determinado"
                }
              </p>
            </div>
            {formData.isFixed ? (
              <Zap className="w-4 h-4 text-yellow-600" />
            ) : (
              <Clock className="w-4 h-4 text-blue-600" />
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje de la Alerta</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Ingresa el mensaje de la alerta..."
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Duration (only for temporal alerts) */}
          {!formData.isFixed && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duración (segundos)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="3600"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Entre 1 segundo y 1 hora (3600 segundos)
              </p>
            </div>
          )}

          {/* Color Presets */}
          <div className="space-y-3">
            <Label>Colores Predefinidos</Label>
            <div className="grid grid-cols-4 gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className="p-3 rounded-lg border-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: preset.bg,
                    color: preset.text,
                    borderColor: 
                      formData.backgroundColor === preset.bg && formData.textColor === preset.text
                        ? "#000"
                        : "transparent"
                  }}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    backgroundColor: preset.bg,
                    textColor: preset.text
                  }))}
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Color de Fondo</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  className="w-16 h-10 p-1 rounded"
                />
                <Input
                  type="text"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  className="flex-1"
                  placeholder="#ef4444"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textColor">Color del Texto</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="textColor"
                  type="color"
                  value={formData.textColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                  className="w-16 h-10 p-1 rounded"
                />
                <Input
                  type="text"
                  value={formData.textColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                  className="flex-1"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Vista Previa</Label>
            <div
              className="p-4 rounded-lg text-center font-medium border"
              style={{
                backgroundColor: formData.backgroundColor,
                color: formData.textColor,
              }}
            >
              {formData.message || "Tu mensaje aparecerá aquí..."}
            </div>
          </div>

          {/* Target Screens */}
          <div className="space-y-3">
            <Label>Pantallas de Destino</Label>
            <div className="text-sm text-muted-foreground">
              Si no seleccionas ninguna pantalla, la alerta se enviará a todas las pantallas.
            </div>

            {safeScreens.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {safeScreens.map((screen) => (
                  <div key={screen.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`screen-${screen.id}`}
                      checked={formData.targetScreens.includes(screen.id)}
                      onCheckedChange={(checked) => handleScreenToggle(screen.id, checked as boolean)}
                    />
                    <Label htmlFor={`screen-${screen.id}`} className="flex items-center space-x-2 cursor-pointer">
                      <Monitor className="w-4 h-4" />
                      <span>{screen.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {screen.location || "Sin ubicación"}
                      </Badge>
                      <Badge variant={screen.isOnline ? "default" : "secondary"} className="text-xs">
                        {screen.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No hay pantallas disponibles
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createAlertMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createAlertMutation.isPending}
              className="min-w-[120px]"
            >
              {createAlertMutation.isPending 
                ? "Guardando..." 
                : alert 
                  ? "Actualizar" 
                  : "Crear Alerta"
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}