import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, X } from "lucide-react";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
}

const colorOptions = [
  { value: "#ef4444", label: "Rojo", class: "bg-red-500" },
  { value: "#f59e0b", label: "Amarillo", class: "bg-yellow-500" },
  { value: "#3b82f6", label: "Azul", class: "bg-blue-500" },
  { value: "#10b981", label: "Verde", class: "bg-green-500" },
  { value: "#8b5cf6", label: "Púrpura", class: "bg-purple-500" },
  { value: "#f97316", label: "Naranja", class: "bg-orange-500" },
];

const durationOptions = [
  { value: 10, label: "10 segundos" },
  { value: 30, label: "30 segundos" },
  { value: 60, label: "1 minuto" },
  { value: 300, label: "5 minutos" },
  { value: -1, label: "Hasta cerrar manualmente" },
];

export default function AlertModal({ open, onClose }: AlertModalProps) {
  const [message, setMessage] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#ef4444");
  const [textColor, setTextColor] = useState("#ffffff");
  const [duration, setDuration] = useState(30);
  const [allScreens, setAllScreens] = useState(true);
  const [mainScreensOnly, setMainScreensOnly] = useState(false);
  
  const { toast } = useToast();

  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      await apiRequest("/api/alerts", {
        method: "POST",
        body: JSON.stringify(alertData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Alerta creada",
        description: "La alerta ha sido enviada a las pantallas seleccionadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear alerta",
        description: error.message || "Verifica que todos los campos estén completos y que tengas pantallas disponibles.",
        variant: "destructive",
      });
    },
  });

  const handleCreateAlert = () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "El mensaje de alerta es requerido.",
        variant: "destructive",
      });
      return;
    }

    const alertData = {
      message: message.trim(),
      backgroundColor,
      textColor,
      duration: duration === -1 ? 0 : duration, // 0 means manual close
      isActive: true,
      targetScreens: allScreens ? [] : [], // Empty array means all screens
    };

    createAlertMutation.mutate(alertData);
  };

  const handleClose = () => {
    setMessage("");
    setBackgroundColor("#ef4444");
    setTextColor("#ffffff");
    setDuration(30);
    setAllScreens(true);
    setMainScreensOnly(false);
    onClose();
  };

  const getTextColorForBackground = (bgColor: string) => {
    // Simple contrast check - in production you'd want a more sophisticated algorithm
    const darkColors = ["#ef4444", "#8b5cf6", "#3b82f6"];
    return darkColors.includes(bgColor) ? "#ffffff" : "#000000";
  };

  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color);
    setTextColor(getTextColorForBackground(color));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Crear Alerta Urgente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Input */}
          <div>
            <Label htmlFor="message">Mensaje de Alerta *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ingresa el mensaje de alerta urgente..."
              rows={3}
              className="resize-none"
              maxLength={200}
            />
            <div className="text-xs text-slate-500 mt-1">
              {message.length}/200 caracteres
            </div>
          </div>

          {/* Preview */}
          {message && (
            <div>
              <Label>Vista Previa</Label>
              <div 
                className="p-4 rounded-lg mt-2 text-center font-medium"
                style={{ 
                  backgroundColor,
                  color: textColor 
                }}
              >
                {message}
              </div>
            </div>
          )}

          {/* Color and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Color de Fondo</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleBackgroundColorChange(color.value)}
                    className={`w-8 h-8 rounded border-2 transition-all ${color.class} ${
                      backgroundColor === color.value
                        ? "border-slate-900 scale-110"
                        : "border-slate-300 hover:border-slate-400"
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="duration">Duración</Label>
              <Select 
                value={duration.toString()} 
                onValueChange={(value) => setDuration(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
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
          </div>

          {/* Target Screens */}
          <div>
            <Label>Pantallas Objetivo</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-screens"
                  checked={allScreens}
                  onCheckedChange={(checked) => {
                    setAllScreens(checked as boolean);
                    if (checked) {
                      setMainScreensOnly(false);
                    }
                  }}
                />
                <Label htmlFor="all-screens" className="text-sm">
                  Todas las pantallas
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="main-screens"
                  checked={mainScreensOnly}
                  onCheckedChange={(checked) => {
                    setMainScreensOnly(checked as boolean);
                    if (checked) {
                      setAllScreens(false);
                    }
                  }}
                />
                <Label htmlFor="main-screens" className="text-sm">
                  Solo pantallas principales
                </Label>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Alerta Urgente</p>
                <p>Esta alerta se mostrará inmediatamente en las pantallas seleccionadas, interrumpiendo el contenido actual.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAlert}
              disabled={createAlertMutation.isPending || !message.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {createAlertMutation.isPending ? "Enviando..." : "Enviar Alerta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
