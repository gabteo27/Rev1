
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  User, 
  Monitor, 
  Globe, 
  Shield,
  Bell,
  Palette
} from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState({
    companyName: "Mi Empresa",
    defaultPlaylistDuration: "30",
    autoUpdate: true,
    notifications: true,
    theme: "light",
    language: "es",
    timezone: "America/Mexico_City"
  });
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los cambios han sido guardados exitosamente.",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Configuración"
        subtitle="Gestiona las preferencias del sistema"
      />

      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="w-5 h-5" />
                <span>Configuración General</span>
              </CardTitle>
              <CardDescription>
                Configuración básica del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">Nombre de la Empresa</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="defaultDuration">Duración por Defecto (segundos)</Label>
                <Input
                  id="defaultDuration"
                  type="number"
                  value={settings.defaultPlaylistDuration}
                  onChange={(e) => setSettings({ ...settings, defaultPlaylistDuration: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="language">Idioma</Label>
                <Select value={settings.language} onValueChange={(value) => setSettings({ ...settings, language: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5" />
                <span>Configuración de Pantallas</span>
              </CardTitle>
              <CardDescription>
                Configuración para dispositivos de visualización
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Actualización Automática</Label>
                  <p className="text-sm text-slate-500">
                    Actualizar contenido automáticamente en las pantallas
                  </p>
                </div>
                <Switch
                  checked={settings.autoUpdate}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoUpdate: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificaciones</Label>
                  <p className="text-sm text-slate-500">
                    Recibir notificaciones del sistema
                  </p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Apariencia</span>
              </CardTitle>
              <CardDescription>
                Personaliza la apariencia de la interfaz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="theme">Tema</Label>
                <Select value={settings.theme} onValueChange={(value) => setSettings({ ...settings, theme: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Guardar Cambios
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
