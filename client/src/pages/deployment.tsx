import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  version: z.string().min(1, "La versión es requerida"),
  targetDevices: z.array(z.string()).optional(),
  buildUrl: z.string().optional(),
  status: z.string().default('pending'),
});

type DeploymentFormData = z.infer<typeof deploymentFormSchema>;

export default function Deployment() {
  const { toast } = useToast();
  const [deploymentProgress, setDeploymentProgress] = useState(0);

  const form = useForm<DeploymentFormData>({
    resolver: zodResolver(deploymentFormSchema),
    defaultValues: {
      version: "1.0.0",
      targetDevices: [],
      status: 'pending',
    },
  });

  const { data: deployments = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/deployments"],
    queryFn: () => apiRequest("/api/deployments").then(res => res.json()),
    retry: 1,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const buildingDeployment = deployments.find((d: any) => d.status === 'building');
      if (buildingDeployment) {
        refetch();
      }
    }, 5000); // Refetch every 5 seconds if a build is in progress

    return () => clearInterval(interval);
  }, [deployments, refetch]);


  const createMutation = useMutation({
    mutationFn: async (data: DeploymentFormData) => {
      const response = await apiRequest("/api/deployments", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (newDeployment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      buildMutation.mutate(newDeployment.id);
      toast({
        title: "Iniciando despliegue",
        description: "La compilación de la aplicación ha comenzado.",
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.requiresAndroidSdk 
        ? "APK generation requires Android SDK. This feature is not available in the current environment."
        : "Failed to create deployment";

      toast({
        title: "Error",
        description: message,
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
    onError: (error: Error) => {
      toast({
        title: "Error en la compilación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DeploymentFormData) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-4 h-4 mr-2" />Listo</Badge>;
      case 'building':
        return <Badge className="bg-blue-500 text-white"><Clock className="w-4 h-4 mr-2 animate-spin" />Compilando</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-4 h-4 mr-2" />Fallido</Badge>;
      default:
        return <Badge variant="secondary"><Package className="w-4 h-4 mr-2" />Pendiente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Generación y Despliegue"
        subtitle="Crea y despliega aplicaciones para diferentes plataformas"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Nueva Compilación
              </CardTitle>
              <CardDescription>
                Configura los parámetros para generar una nueva versión de la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Versión de la Aplicación</FormLabel>
                        <FormControl>
                          <Input placeholder="1.0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={createMutation.isPending || buildMutation.isPending}>
                    <Rocket className="w-4 h-4 mr-2" />
                    {createMutation.isPending || buildMutation.isPending ? "Generando..." : "Generar y Compilar APK"}
                  </Button>
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
                Historial de Compilaciones
              </CardTitle>
              <CardDescription>
                Versiones generadas recientemente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p>Cargando...</p>
              ) : !Array.isArray(deployments) || deployments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay compilaciones disponibles.</p>
                </div>
              ) : (
                deployments.map((deployment: any) => (
                  <Card key={deployment.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Versión {deployment.version}</span>
                        </div>
                        {getStatusBadge(deployment.status)}
                      </div>

                      {deployment.status === 'ready' && deployment.buildUrl && (
                        <a href={deployment.buildUrl} download>
                          <Button size="sm" variant="outline" className="w-full">
                            <Download className="h-3 w-3 mr-1" />
                            Descargar APK
                          </Button>
                        </a>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}