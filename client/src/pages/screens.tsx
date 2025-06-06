import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Tv, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Clock,
  MapPin,
  Settings,
  Trash2,
  Edit
} from "lucide-react";

export default function Screens() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newScreen, setNewScreen] = useState({
    name: "",
    description: "",
    location: "",
    playlistId: ""
  });
  const { toast } = useToast();

  const { data: screens = [], isLoading } = useQuery({
    queryKey: ["/api/screens"],
    retry: false,
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ["/api/playlists"],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/screens", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          playlistId: data.playlistId ? parseInt(data.playlistId) : null
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Pantalla creada",
        description: "La pantalla ha sido creada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
      setCreateModalOpen(false);
      setNewScreen({ name: "", description: "", location: "", playlistId: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la pantalla.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/screens/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Pantalla eliminada",
        description: "La pantalla ha sido eliminada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la pantalla.",
        variant: "destructive",
      });
    },
  });

  const handleCreateScreen = () => {
    if (!newScreen.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la pantalla es requerido.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newScreen);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (isOnline: boolean, lastSeen?: string) => {
    if (isOnline) {
      return <Badge className="bg-green-100 text-green-800">En línea</Badge>;
    }
    
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      const diffInHours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        return <Badge className="bg-yellow-100 text-yellow-800">Desconectada</Badge>;
      } else if (diffInHours < 24) {
        return <Badge className="bg-orange-100 text-orange-800">Inactiva</Badge>;
      }
    }
    
    return <Badge className="bg-red-100 text-red-800">Sin conexión</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Pantallas" subtitle="Gestiona tus dispositivos de visualización" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando pantallas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Pantallas"
        subtitle="Gestiona tus dispositivos de visualización"
        actions={
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Pantalla
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nueva Pantalla</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newScreen.name}
                    onChange={(e) => setNewScreen({ ...newScreen, name: e.target.value })}
                    placeholder="Ej: Pantalla Principal Recepción"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={newScreen.location}
                    onChange={(e) => setNewScreen({ ...newScreen, location: e.target.value })}
                    placeholder="Ej: Recepción - Planta Baja"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newScreen.description}
                    onChange={(e) => setNewScreen({ ...newScreen, description: e.target.value })}
                    placeholder="Descripción opcional"
                  />
                </div>
                <div>
                  <Label htmlFor="playlist">Playlist Asignada</Label>
                  <Select value={newScreen.playlistId} onValueChange={(value) => setNewScreen({ ...newScreen, playlistId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar playlist (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin playlist</SelectItem>
                      {playlists.map((playlist: any) => (
                        <SelectItem key={playlist.id} value={playlist.id.toString()}>
                          {playlist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateScreen}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creando..." : "Crear Pantalla"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 px-6 py-6 overflow-auto">
        {!screens || screens.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No tienes pantallas registradas
              </h3>
              <p className="text-slate-600 mb-6">
                Agrega tus dispositivos de visualización para poder gestionar el contenido que se muestra.
              </p>
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primera Pantalla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="content-grid">
            {screens.map((screen: any) => (
              <Card key={screen.id} className="border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Screen Header */}
                  <div className="p-4 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Tv className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {screen.name}
                          </h4>
                          {screen.location && (
                            <div className="flex items-center text-sm text-slate-500 mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {screen.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {screen.isOnline ? (
                          <Wifi className="w-5 h-5 text-green-600" />
                        ) : (
                          <WifiOff className="w-5 h-5 text-red-600" />
                        )}
                        {getStatusBadge(screen.isOnline, screen.lastSeen)}
                      </div>
                    </div>
                  </div>

                  {/* Screen Info */}
                  <div className="p-4">
                    {screen.description && (
                      <p className="text-sm text-slate-600 mb-4">
                        {screen.description}
                      </p>
                    )}

                    {/* Assigned Playlist */}
                    <div className="mb-4">
                      <Label className="text-xs text-slate-500">PLAYLIST ASIGNADA</Label>
                      {screen.playlistId ? (
                        <div className="mt-1 flex items-center space-x-2">
                          <Badge variant="outline">
                            {playlists?.find((p: any) => p.id === screen.playlistId)?.name || "Playlist no encontrada"}
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 mt-1">Sin playlist asignada</p>
                      )}
                    </div>

                    {/* Status Info */}
                    <div className="space-y-2 text-xs text-slate-500 mb-4">
                      <div className="flex items-center justify-between">
                        <span>Creada:</span>
                        <span>{formatDate(screen.createdAt)}</span>
                      </div>
                      {screen.lastSeen && (
                        <div className="flex items-center justify-between">
                          <span>Última conexión:</span>
                          <span>{formatDate(screen.lastSeen)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="h-8 px-2">
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 text-red-600 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(screen.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        className="h-8 px-3 text-xs"
                        disabled={!screen.isOnline}
                      >
                        <Monitor className="w-3 h-3 mr-1" />
                        {screen.isOnline ? "Gestionar" : "Sin conexión"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
