import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, X, Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  screens: any[];
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
  { value: 900, label: "15 minutos" },
  { value: 0, label: "Alerta fija (hasta cerrar manualmente)" },
];

export default function AlertModal({ open, onClose, screens = [] }: AlertModalProps) {
  const [message, setMessage] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#ef4444");
  const [textColor, setTextColor] = useState("#ffffff");
  const [duration, setDuration] = useState(30);
  const [allScreens, setAllScreens] = useState(true);
  const [selectedScreens, setSelectedScreens] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      const endpoint = alertData.isFixed ? "/api/alerts/fixed" : "/api/alerts";
      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(alertData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create alert");
      }
      
      return response.json();
    },
    onSuccess: (alertData) => {
      const alertType = alertData.isFixed ? "fija" : "temporal";
      toast({
        title: "Alerta creada",
        description: `La alerta ${alertType} ha sido enviada a las pantallas seleccionadas. ${
          alertData.duration > 0 
            ? `Se eliminará automáticamente en ${alertData.duration} segundos.`
            : 'Permanecerá hasta ser cerrada manualmente.'
        }`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setIsSubmitting(false);
      handleClose();
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: "Error al crear alerta",
        description: error.message || "Verifica que todos los campos estén completos y que tengas pantallas disponibles.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (isSubmitting) return;

    if (!message.trim()) {
      toast({
        title: "Error",
        description: "El mensaje de alerta es requerido.",
        variant: "destructive",
      });
      return;
    }

    if (!allScreens && selectedScreens.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos una pantalla o enviar a todas.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const alertData = {
      message: message.trim(),
      backgroundColor,
      textColor,
      duration,
      isActive: true,
      targetScreens: allScreens ? [] : selectedScreens,
      isFixed: duration === 0
    };

    createAlertMutation.mutate(alertData);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    setMessage("");
    setBackgroundColor("#ef4444");
    setTextColor("#ffffff");
    setDuration(30);
    setAllScreens(true);
    setSelectedScreens([]);
    setIsSubmitting(false);
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

  const handleSubmit = () => {
    const finalDuration = duration === -1 ? 0 : duration;

    const alertData = {
      message: message.trim(),
      backgroundColor,
      textColor,
      duration: finalDuration,
      isActive: true,
      targetScreens: allScreens ? [] : selectedScreens,
    };

    createAlertMutation.mutate(alertData);
  };

  const handleScreenToggle = (screenId: number) => {
    setSelectedScreens(prev => 
      prev.includes(screenId)
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId]
    );
  };

  const onlineScreens = screens.filter((screen: any) => screen.isOnline);
  const offlineScreens = screens.filter((screen: any) => !screen.isOnline);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Nueva Alerta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje de la Alerta</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ingresa el mensaje que se mostrará en las pantallas..."
              className="min-h-20"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Color de Fondo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-16 h-10 p-1 rounded"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#ef4444"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="textColor">Color de Texto</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-16 h-10 p-1 rounded"
                />
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
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

          {/* Screen Selection */}
          <div className="space-y-4">
            <Label>Pantallas Destino</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allScreens"
                checked={allScreens}
                onCheckedChange={(checked) => {
                  setAllScreens(!!checked);
                  if (checked) {
                    setSelectedScreens([]);
                  }
                }}
              />
              <Label htmlFor="allScreens" className="text-sm font-normal">
                Enviar a todas las pantallas
              </Label>
            </div>

            {!allScreens && (
              <div className="space-y-4">
                <Label className="text-sm text-muted-foreground">
                  Selecciona las pantallas específicas:
                </Label>

                <ScrollArea className="h-48 border rounded-lg p-4">
                  <div className="space-y-3">
                    {onlineScreens.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-600 mb-2">
                          Pantallas En Línea ({onlineScreens.length})
                        </h4>
                        {onlineScreens.map((screen: any) => (
                          <div key={screen.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                            <Checkbox
                              id={`screen-${screen.id}`}
                              checked={selectedScreens.includes(screen.id)}
                              onCheckedChange={() => handleScreenToggle(screen.id)}
                            />
                            <Monitor className="w-4 h-4 text-green-500" />
                            <Label htmlFor={`screen-${screen.id}`} className="text-sm font-normal flex-1">
                              {screen.name}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              {screen.location || 'Sin ubicación'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {offlineScreens.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">
                          Pantallas Desconectadas ({offlineScreens.length})
                        </h4>
                        {offlineScreens.map((screen: any) => (
                          <div key={screen.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded opacity-60">
                            <Checkbox
                              id={`screen-${screen.id}`}
                              checked={selectedScreens.includes(screen.id)}
                              onCheckedChange={() => handleScreenToggle(screen.id)}
                            />
                            <Monitor className="w-4 h-4 text-gray-400" />
                            <Label htmlFor={`screen-${screen.id}`} className="text-sm font-normal flex-1">
                              {screen.name}
                            </Label>
                            <Badge variant="secondary" className="text-xs">
                              Desconectada
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {screens.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay pantallas disponibles</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {!allScreens && selectedScreens.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{selectedScreens.length} pantalla(s) seleccionada(s)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {message.trim() && (
            <div className="space-y-2">
              <Label>Vista Previa</Label>
              <Card>
                <CardContent className="p-4">
                  <div
                    className="p-4 rounded-lg text-center font-medium"
                    style={{
                      backgroundColor,
                      color: textColor,
                    }}
                  >
                    {message}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!message.trim() || isSubmitting}
          >
            {isSubmitting ? "Enviando..." : duration === 0 ? "Crear Alerta Fija" : "Enviar Alerta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}