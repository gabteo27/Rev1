
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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Palette, Monitor, Clock, Zap, Move, Type, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

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
    isFixed: false,
    alertType: "banner", // banner, popup, ticker
    position: "top", // top, bottom, center, left, right
    animationType: "slide", // slide, fade, bounce, none
    fontSize: 16,
    fontWeight: "normal",
    opacity: 100,
    borderRadius: 8,
    padding: 16,
    margin: 0,
    showIcon: false,
    iconType: "info", // info, warning, error, success
    autoHide: true,
    priority: "normal", // low, normal, high, urgent
    tickerSpeed: 50, // for ticker alerts
    zIndex: 1000
  });

  useEffect(() => {
    if (alert) {
      setFormData({
        message: alert.message || "",
        backgroundColor: alert.backgroundColor || "#ef4444",
        textColor: alert.textColor || "#ffffff",
        duration: alert.duration || 30,
        targetScreens: Array.isArray(alert.targetScreens) ? alert.targetScreens : [],
        isFixed: alert.isFixed || false,
        alertType: alert.alertType || "banner",
        position: alert.position || "top",
        animationType: alert.animationType || "slide",
        fontSize: alert.fontSize || 16,
        fontWeight: alert.fontWeight || "normal",
        opacity: alert.opacity || 100,
        borderRadius: alert.borderRadius || 8,
        padding: alert.padding || 16,
        margin: alert.margin || 0,
        showIcon: alert.showIcon || false,
        iconType: alert.iconType || "info",
        autoHide: alert.autoHide !== undefined ? alert.autoHide : true,
        priority: alert.priority || "normal",
        tickerSpeed: alert.tickerSpeed || 50,
        zIndex: alert.zIndex || 1000
      });
    } else {
      setFormData({
        message: "",
        backgroundColor: "#ef4444",
        textColor: "#ffffff",
        duration: 30,
        targetScreens: [],
        isFixed: false,
        alertType: "banner",
        position: "top",
        animationType: "slide",
        fontSize: 16,
        fontWeight: "normal",
        opacity: 100,
        borderRadius: 8,
        padding: 16,
        margin: 0,
        showIcon: false,
        iconType: "info",
        autoHide: true,
        priority: "normal",
        tickerSpeed: 50,
        zIndex: 1000
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
        const error = await response.json().catch(() => ({ message: "Failed to save alert" }));
        throw new Error(error.message || "Failed to save alert");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: alert ? "Alerta actualizada" : "Alerta creada",
        description: `La alerta ${formData.alertType} se ha ${alert ? 'actualizado' : 'creado'} exitosamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/fixed"] });
      onClose();
    },
    onError: (error: any) => {
      console.error("Error creating alert:", error);
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

  const alertTypes = [
    { value: "banner", label: "Banner", description: "Franja horizontal en la pantalla" },
    { value: "popup", label: "Popup", description: "Ventana emergente centrada" },
    { value: "ticker", label: "Ticker", description: "Texto en movimiento horizontal" },
    { value: "sidebar", label: "Sidebar", description: "Panel lateral fijo" },
    { value: "overlay", label: "Overlay", description: "Capa superpuesta completa" }
  ];

  const positions = [
    { value: "top", label: "Superior", icon: ArrowUp },
    { value: "bottom", label: "Inferior", icon: ArrowDown },
    { value: "left", label: "Izquierda", icon: ArrowLeft },
    { value: "right", label: "Derecha", icon: ArrowRight },
    { value: "center", label: "Centro", icon: Move }
  ];

  const animations = [
    { value: "slide", label: "Deslizar" },
    { value: "fade", label: "Desvanecer" },
    { value: "bounce", label: "Rebotar" },
    { value: "zoom", label: "Zoom" },
    { value: "none", label: "Sin animación" }
  ];

  const priorities = [
    { value: "low", label: "Baja", color: "bg-gray-100 text-gray-800" },
    { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-800" },
    { value: "high", label: "Alta", color: "bg-orange-100 text-orange-800" },
    { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-800" }
  ];

  // Ensure screens is always an array
  const safeScreens = Array.isArray(screens) ? screens : [];

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">Contenido</TabsTrigger>
              <TabsTrigger value="appearance">Apariencia</TabsTrigger>
              <TabsTrigger value="behavior">Comportamiento</TabsTrigger>
              <TabsTrigger value="targets">Destino</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              {/* Alert Type Toggle */}
              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <Switch
                  checked={formData.isFixed}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      isFixed: checked,
                      duration: checked ? 0 : 30
                    }));
                  }}
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

              {/* Alert Type */}
              <div className="space-y-2">
                <Label>Tipo de Alerta</Label>
                <Select value={formData.alertType} onValueChange={(value) => setFormData(prev => ({ ...prev, alertType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {alertTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              {/* Priority */}
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <Badge className={priority.color}>{priority.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
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
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          backgroundColor: preset.bg,
                          textColor: preset.text
                        }));
                      }}
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

              {/* Typography */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tamaño de Fuente</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[formData.fontSize]}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fontSize: value[0] }))}
                      min={8}
                      max={72}
                      step={1}
                    />
                    <div className="text-sm text-muted-foreground">{formData.fontSize}px</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Peso de Fuente</Label>
                  <Select value={formData.fontWeight} onValueChange={(value) => setFormData(prev => ({ ...prev, fontWeight: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Negrita</SelectItem>
                      <SelectItem value="lighter">Ligera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Layout */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Opacidad</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[formData.opacity]}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, opacity: value[0] }))}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <div className="text-sm text-muted-foreground">{formData.opacity}%</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Radio del Borde</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[formData.borderRadius]}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, borderRadius: value[0] }))}
                      min={0}
                      max={50}
                      step={2}
                    />
                    <div className="text-sm text-muted-foreground">{formData.borderRadius}px</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Relleno</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[formData.padding]}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, padding: value[0] }))}
                      min={0}
                      max={50}
                      step={2}
                    />
                    <div className="text-sm text-muted-foreground">{formData.padding}px</div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Vista Previa</Label>
                <div
                  className="p-4 rounded-lg text-center font-medium border transition-all"
                  style={{
                    backgroundColor: formData.backgroundColor,
                    color: formData.textColor,
                    fontSize: `${formData.fontSize}px`,
                    fontWeight: formData.fontWeight,
                    opacity: formData.opacity / 100,
                    borderRadius: `${formData.borderRadius}px`,
                    padding: `${formData.padding}px`,
                  }}
                >
                  {formData.message || "Tu mensaje aparecerá aquí..."}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4">
              {/* Position */}
              <div className="space-y-2">
                <Label>Posición</Label>
                <div className="grid grid-cols-5 gap-2">
                  {positions.map((position) => {
                    const IconComponent = position.icon;
                    return (
                      <button
                        key={position.value}
                        type="button"
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          formData.position === position.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, position: position.value }))}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span className="text-xs">{position.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Animation */}
              <div className="space-y-2">
                <Label>Animación</Label>
                <Select value={formData.animationType} onValueChange={(value) => setFormData(prev => ({ ...prev, animationType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {animations.map(animation => (
                      <SelectItem key={animation.value} value={animation.value}>
                        {animation.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ticker Speed (only for ticker alerts) */}
              {formData.alertType === "ticker" && (
                <div className="space-y-2">
                  <Label>Velocidad del Ticker</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[formData.tickerSpeed]}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, tickerSpeed: value[0] }))}
                      min={10}
                      max={200}
                      step={10}
                    />
                    <div className="text-sm text-muted-foreground">{formData.tickerSpeed}px/s</div>
                  </div>
                </div>
              )}

              {/* Auto Hide */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.autoHide}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoHide: checked }))}
                />
                <Label>Ocultar automáticamente</Label>
              </div>

              {/* Z-Index */}
              <div className="space-y-2">
                <Label>Nivel de superposición (Z-Index)</Label>
                <Input
                  type="number"
                  value={formData.zIndex}
                  onChange={(e) => setFormData(prev => ({ ...prev, zIndex: parseInt(e.target.value) || 1000 }))}
                  min="1"
                  max="9999"
                />
              </div>
            </TabsContent>

            <TabsContent value="targets" className="space-y-4">
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
            </TabsContent>
          </Tabs>

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
