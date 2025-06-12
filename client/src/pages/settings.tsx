import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Monitor, 
  Bell, 
  Shield, 
  Database,
  Wifi,
  Save
} from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [dataRetention, setDataRetention] = useState("30");
  const [maxScreens, setMaxScreens] = useState("50");
  const [apiRefreshRate, setApiRefreshRate] = useState("30");

  const handleSaveSettings = () => {
    toast({
      title: "Configuración guardada",
      description: "Las configuraciones se han actualizado correctamente.",
    });
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Configuración"
        subtitle="Personaliza XcienTV según tus preferencias"
        actions={
          <Button onClick={handleSaveSettings}>
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </Button>
        }
      />

      <div className="flex-1 main-content-scroll px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Apariencia
            </CardTitle>
            <CardDescription>
              Personaliza la apariencia de la interfaz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Tema</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {getThemeIcon()}
                      <span className="capitalize">
                        {theme === "system" ? "Sistema" : theme === "dark" ? "Oscuro" : "Claro"}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Claro
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Oscuro
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Sistema
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura cómo recibes las notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notificaciones push</Label>
                <p className="text-sm text-muted-foreground">
                  Recibe alertas en tiempo real
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Sistema
            </CardTitle>
            <CardDescription>
              Configuraciones del sistema y rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoSync">Sincronización automática</Label>
                <p className="text-sm text-muted-foreground">
                  Sincroniza datos automáticamente
                </p>
              </div>
              <Switch
                id="autoSync"
                checked={autoSync}
                onCheckedChange={setAutoSync}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="apiRefresh">Tasa de actualización API (segundos)</Label>
              <Input
                id="apiRefresh"
                type="number"
                value={apiRefreshRate}
                onChange={(e) => setApiRefreshRate(e.target.value)}
                min="10"
                max="300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxScreens">Máximo de pantallas</Label>
              <Input
                id="maxScreens"
                type="number"
                value={maxScreens}
                onChange={(e) => setMaxScreens(e.target.value)}
                min="1"
                max="1000"
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Gestión de Datos
            </CardTitle>
            <CardDescription>
              Configuraciones de almacenamiento y retención
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataRetention">Retención de datos (días)</Label>
              <Select value={dataRetention} onValueChange={setDataRetention}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 días</SelectItem>
                  <SelectItem value="30">30 días</SelectItem>
                  <SelectItem value="90">90 días</SelectItem>
                  <SelectItem value="365">1 año</SelectItem>
                  <SelectItem value="-1">Indefinido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Configuraciones de seguridad y acceso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado de la sesión</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span>Conectado - Sesión activa</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Última actividad</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleString()}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-start">
              <Button variant="outline" onClick={() => window.location.href = "/api/logout"}>
                Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}