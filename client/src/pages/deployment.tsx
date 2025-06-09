import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Package, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Rocket,
  Settings,
  FileText,
  Play
} from "lucide-react";

const deploymentFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  targetPlatform: z.enum(["firetv", "android", "web", "all"]),
  appVersion: z.string().min(1, "La versión es requerida"),
  packageName: z.string().min(1, "El nombre del paquete es requerido"),
  enableOfflineMode: z.boolean().default(true),
  compressionLevel: z.enum(["low", "medium", "high"]).default("medium"),
  includeAnalytics: z.boolean().default(true),
  autoUpdate: z.boolean().default(false),
  screenOrientation: z.enum(["portrait", "landscape", "auto"]).default("landscape"),
});

type DeploymentFormData = z.infer<typeof deploymentFormSchema>;

export default function Deployment() {
  const { toast } = useToast();
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);

  const form = useForm<DeploymentFormData>({
    resolver: zodResolver(deploymentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      targetPlatform: "firetv",
      appVersion: "1.0.0",
      packageName: "com.xcientv.signage",
      enableOfflineMode: true,
      compressionLevel: "medium",
      includeAnalytics: true,
      autoUpdate: false,
      screenOrientation: "landscape",
    },
  });

  const { data: deployments = [], isLoading } = useQuery({
    queryKey: ["/api/deployments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: DeploymentFormData) => {
      setIsDeploying(true);
      setDeploymentProgress(0);

      // Simulate deployment progress
      const progressSteps = [
        { step: "Preparando archivos", progress: 20 },
        { step: "Compilando aplicación", progress: 40 },
        { step: "Optimizando recursos", progress: 60 },
        { step: "Generando APK", progress: 80 },
        { step: "Finalizando", progress: 100 },
      ];

      for (const { step, progress } of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDeploymentProgress(progress);
        toast({
          title: step,
          description: `Progreso: ${progress}%`,
        });
      }

      const response = await apiRequest("/api/deployments", {
        method: "POST",
        body: JSON.stringify(data),
      });

      setIsDeploying(false);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      form.reset();
      toast({
        title: "Despliegue completado",
        description: "La aplicación se ha generado exitosamente.",
      });
    },
    onError: (error: Error) => {
      setIsDeploying(false);
      setDeploymentProgress(0);
      toast({
        title: "Error en el despliegue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DeploymentFormData) => {
    createMutation.mutate(data);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "firetv":
        return <Monitor className="h-4 w-4" />;
      case "android":
        return <Smartphone className="h-4 w-4" />;
      case "web":
        return <FileText className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case "firetv":
        return "Amazon Fire TV";
      case "android":
        return "Android";
      case "web":
        return "Web App";
      case "all":
        return "Todas las plataformas";
      default:
        return platform;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "building":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "building":
        return <Clock className="h-4 w-4" />;
      case "failed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header
          title="Generación y Despliegue"
          subtitle="Crea y despliega aplicaciones para diferentes plataformas"
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
        title="Generación y Despliegue"
        subtitle="Crea y despliega aplicaciones para diferentes plataformas"
        actions={
          <Button 
            onClick={() => form.handleSubmit(onSubmit)()}
            disabled={isDeploying}
          >
            <Rocket className="w-4 h-4 mr-2" />
            {isDeploying ? "Generando..." : "Generar Aplicación"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración de Despliegue
              </CardTitle>
              <CardDescription>
                Configura los parámetros para generar tu aplicación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Aplicación</FormLabel>
                          <FormControl>
                            <Input placeholder="XcienTV Signage" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="appVersion"
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
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Aplicación de señalización digital..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetPlatform"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plataforma Objetivo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="firetv">Amazon Fire TV</SelectItem>
                              <SelectItem value="android">Android</SelectItem>
                              <SelectItem value="web">Web App</SelectItem>
                              <SelectItem value="all">Todas las plataformas</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="packageName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Paquete</FormLabel>
                          <FormControl>
                            <Input placeholder="com.xcientv.signage" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="compressionLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nivel de Compresión</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Bajo</SelectItem>
                              <SelectItem value="medium">Medio</SelectItem>
                              <SelectItem value="high">Alto</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="screenOrientation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orientación de Pantalla</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="portrait">Vertical</SelectItem>
                              <SelectItem value="landscape">Horizontal</SelectItem>
                              <SelectItem value="auto">Automática</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="enableOfflineMode"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Modo Sin Conexión</FormLabel>
                            <FormDescription>
                              Permite que la aplicación funcione sin conexión a internet
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeAnalytics"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Incluir Analíticas</FormLabel>
                            <FormDescription>
                              Habilita el seguimiento de uso y métricas
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="autoUpdate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Actualización Automática</FormLabel>
                            <FormDescription>
                              Permite que la aplicación se actualice automáticamente
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {isDeploying && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progreso del despliegue</span>
                            <span>{deploymentProgress}%</span>
                          </div>
                          <Progress value={deploymentProgress} />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Deployment History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Historial de Despliegues
              </CardTitle>
              <CardDescription>
                Aplicaciones generadas recientemente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!Array.isArray(deployments) || deployments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay despliegues disponibles</p>
                  <p className="text-sm">Genera tu primera aplicación</p>
                </div>
              ) : (
                deployments.map((deployment: any) => (
                  <Card key={deployment.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(deployment.targetPlatform)}
                          <span className="font-medium">{deployment.name}</span>
                        </div>
                        <Badge variant="secondary">
                          v{deployment.appVersion}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(deployment.status)}`} />
                        <span className="text-sm text-muted-foreground">
                          {getPlatformLabel(deployment.targetPlatform)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          {getStatusIcon(deployment.status)}
                          <span>
                            {deployment.status === "completed" ? "Completado" :
                             deployment.status === "building" ? "Generando" :
                             deployment.status === "failed" ? "Fallido" : "Pendiente"}
                          </span>
                        </div>
                        
                        {deployment.status === "completed" && (
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3 mr-1" />
                            Descargar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Play className="h-4 w-4 mr-2" />
                Vista Previa en Simulador
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Descargar Última Versión
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Ver Documentación
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}