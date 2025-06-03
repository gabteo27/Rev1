import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, Smartphone, Tv, Package, Settings, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertDeploymentSchema, type Deployment, type Screen } from "@shared/schema";
import Header from "@/components/layout/header";

const deploymentFormSchema = insertDeploymentSchema.extend({
  targetDevices: z.array(z.string()).min(1, "Selecciona al menos un dispositivo"),
});

type DeploymentFormData = z.infer<typeof deploymentFormSchema>;

const deviceTypes = [
  { value: "fire-tv", label: "Amazon Fire TV Stick", icon: Tv },
  { value: "android-tv", label: "Android TV", icon: Tv },
  { value: "chromecast", label: "Chromecast", icon: Package },
  { value: "android-tablet", label: "Tablet Android", icon: Smartphone },
  { value: "roku", label: "Roku", icon: Package },
];

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  building: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  deployed: "bg-purple-100 text-purple-800",
  failed: "bg-red-100 text-red-800",
};

const statusIcons = {
  pending: Clock,
  building: Settings,
  ready: CheckCircle,
  deployed: CheckCircle,
  failed: XCircle,
};

export default function Deployment() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: deployments = [], isLoading } = useQuery<Deployment[]>({
    queryKey: ["/api/deployments"],
  });

  const { data: screens = [] } = useQuery<Screen[]>({
    queryKey: ["/api/screens"],
  });

  const form = useForm<DeploymentFormData>({
    resolver: zodResolver(deploymentFormSchema),
    defaultValues: {
      version: "",
      targetDevices: [],
      status: "pending",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DeploymentFormData) => {
      await apiRequest("/api/deployments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Despliegue iniciado",
        description: "El proceso de generación de APK ha comenzado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const buildMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/deployments/${id}/build`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      toast({
        title: "Compilación iniciada",
        description: "El APK está siendo generado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deployMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/deployments/${id}/deploy`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      toast({
        title: "Despliegue completado",
        description: "La aplicación ha sido desplegada en los dispositivos seleccionados.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DeploymentFormData) => {
    createMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons] || AlertTriangle;
    return IconComponent;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Pendiente",
      building: "Compilando",
      ready: "Listo",
      deployed: "Desplegado",
      failed: "Fallido",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getDeviceLabel = (deviceType: string) => {
    const device = deviceTypes.find(d => d.value === deviceType);
    return device?.label || deviceType;
  };

  return (
    <div className="space-y-6">
      <Header
        title="Generación de APK y Despliegue"
        subtitle="Genera aplicaciones para Amazon Fire TV Stick y otros dispositivos"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Package className="w-4 h-4 mr-2" />
            Nuevo Despliegue
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Despliegues</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deployments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compilando</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deployments.filter(d => d.status === "building").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desplegados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deployments.filter(d => d.status === "deployed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-slate-200 rounded"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : deployments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No hay despliegues configurados
            </h3>
            <p className="text-slate-500 text-center mb-4">
              Crea tu primer despliegue para generar APKs para dispositivos Android
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Package className="w-4 h-4 mr-2" />
              Crear Despliegue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deployments.map((deployment) => {
            const StatusIcon = getStatusIcon(deployment.status);
            return (
              <Card key={deployment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Versión {deployment.version}</CardTitle>
                    <Badge className={statusColors[deployment.status as keyof typeof statusColors]}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {getStatusLabel(deployment.status)}
                    </Badge>
                  </div>
                  <CardDescription>
                    {deployment.targetDevices.length} dispositivo(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Dispositivos objetivo:</h4>
                    <div className="space-y-1">
                      {deployment.targetDevices.map((device, index) => (
                        <div key={index} className="text-sm text-slate-600">
                          {getDeviceLabel(device)}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {deployment.buildUrl && (
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(deployment.buildUrl!, "_blank")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar APK
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-4 border-t">
                    {deployment.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => buildMutation.mutate(deployment.id)}
                        disabled={buildMutation.isPending}
                      >
                        Compilar
                      </Button>
                    )}
                    
                    {deployment.status === "ready" && (
                      <Button
                        size="sm"
                        onClick={() => deployMutation.mutate(deployment.id)}
                        disabled={deployMutation.isPending}
                      >
                        Desplegar
                      </Button>
                    )}
                    
                    <div className="text-xs text-slate-500">
                      {new Date(deployment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Despliegue</DialogTitle>
            <DialogDescription>
              Configura un nuevo despliegue para generar APKs para dispositivos Android
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Versión</FormLabel>
                    <FormControl>
                      <Input placeholder="1.0.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetDevices"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipos de dispositivos objetivo</FormLabel>
                    <div className="grid grid-cols-1 gap-3">
                      {deviceTypes.map((device) => {
                        const IconComponent = device.icon;
                        return (
                          <div key={device.value} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <Checkbox
                              id={`device-${device.value}`}
                              checked={field.value.includes(device.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, device.value]);
                                } else {
                                  field.onChange(field.value.filter(d => d !== device.value));
                                }
                              }}
                            />
                            <IconComponent className="w-5 h-5 text-slate-500" />
                            <label
                              htmlFor={`device-${device.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                            >
                              {device.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Información del despliegue</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Se generará un APK optimizado para cada tipo de dispositivo</li>
                  <li>• La aplicación incluirá el contenido y configuración actual</li>
                  <li>• Los dispositivos se sincronizarán automáticamente</li>
                  <li>• El proceso puede tardar varios minutos en completarse</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear Despliegue"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}