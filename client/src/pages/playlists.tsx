import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  List, 
  Play, 
  Pause, 
  Clock, 
  FileText,
  Trash2,
  Edit,
  Copy
} from "lucide-react";

export default function Playlists() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    name: "",
    description: "",
    isActive: false
  });
  const { toast } = useToast();

  const { data: playlists, isLoading } = useQuery({
    queryKey: ["/api/playlists"],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/playlists", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Playlist creada",
        description: "La playlist ha sido creada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setCreateModalOpen(false);
      setNewPlaylist({ name: "", description: "", isActive: false });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la playlist.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/playlists/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Playlist eliminada",
        description: "La playlist ha sido eliminada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la playlist.",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/playlists/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la playlist.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlaylist = () => {
    if (!newPlaylist.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la playlist es requerido.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newPlaylist);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Playlists" subtitle="Gestiona tus secuencias de contenido" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando playlists...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Playlists"
        subtitle="Gestiona tus secuencias de contenido"
        actions={
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Playlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newPlaylist.name}
                    onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                    placeholder="Nombre de la playlist"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                    placeholder="Descripción opcional"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={newPlaylist.isActive}
                    onCheckedChange={(checked) => setNewPlaylist({ ...newPlaylist, isActive: checked })}
                  />
                  <Label htmlFor="active">Activar inmediatamente</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreatePlaylist}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creando..." : "Crear Playlist"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 px-6 py-6 overflow-auto">
        {!playlists || playlists.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <List className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No tienes playlists aún
              </h3>
              <p className="text-slate-600 mb-6">
                Crea tu primera playlist para organizar y secuenciar tu contenido digital.
              </p>
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Playlist
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="content-grid">
            {playlists.map((playlist: any) => (
              <Card key={playlist.id} className="border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Playlist Header */}
                  <div className="p-4 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-slate-900 truncate">
                            {playlist.name}
                          </h4>
                          {playlist.isActive && (
                            <Badge className="bg-green-100 text-green-800">
                              Activa
                            </Badge>
                          )}
                        </div>
                        {playlist.description && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {playlist.description}
                          </p>
                        )}
                      </div>
                      <div className="ml-2">
                        <Switch
                          checked={playlist.isActive}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: playlist.id, isActive: checked })
                          }
                          disabled={toggleActiveMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Playlist Stats */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">
                          {playlist.totalItems || 0}
                        </div>
                        <div className="text-xs text-slate-500">Elementos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">
                          {formatDuration(playlist.totalDuration || 0)}
                        </div>
                        <div className="text-xs text-slate-500">Duración</div>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-2 text-xs text-slate-500 mb-4">
                      <div className="flex items-center justify-between">
                        <span>Creada:</span>
                        <span>{formatDate(playlist.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Modificada:</span>
                        <span>{formatDate(playlist.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="h-8 px-2">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-2">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2 text-red-600 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(playlist.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Link href={`/playlist/${playlist.id}`}>
                        <Button size="sm" className="h-8 px-3 text-xs">
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      </Link>
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
