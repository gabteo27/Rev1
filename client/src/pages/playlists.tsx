import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { 
  Plus, 
  List, 
  Play, 
  Clock, 
  FileText,
  Trash2,
  GripVertical,
  X
} from "lucide-react";

export default function Playlists() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);
  const [newPlaylist, setNewPlaylist] = useState({
    name: "",
    description: ""
  });
  const { toast } = useToast();

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["/api/playlists"],
  });

  const { data: content = [] } = useQuery({
    queryKey: ["/api/content"],
  });

  const { data: selectedPlaylistData } = useQuery({
    queryKey: ["/api/playlists", selectedPlaylist],
    enabled: !!selectedPlaylist,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/playlists", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setCreateModalOpen(false);
      setNewPlaylist({ name: "", description: "" });
      toast({
        title: "Playlist creada",
        description: "La playlist se ha creado exitosamente.",
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ playlistId, contentItemId }: { playlistId: number; contentItemId: number }) => {
      return await apiRequest(`/api/playlists/${playlistId}/items`, {
        method: "POST",
        body: JSON.stringify({ 
          contentItemId,
          order: (selectedPlaylistData && Array.isArray(selectedPlaylistData.items) ? selectedPlaylistData.items.length : 0) + 1
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylist] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Elemento agregado",
        description: "El contenido se ha agregado a la playlist.",
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest(`/api/playlist-items/${itemId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylist] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Elemento eliminado",
        description: "El contenido se ha removido de la playlist.",
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

  const handleAddContent = (contentItemId: number) => {
    if (!selectedPlaylist) {
      toast({
        title: "Error",
        description: "Selecciona una playlist primero.",
        variant: "destructive",
      });
      return;
    }
    addItemMutation.mutate({ playlistId: selectedPlaylist, contentItemId });
  };

  const handleRemoveItem = (itemId: number) => {
    removeItemMutation.mutate(itemId);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="Playlists" subtitle="Gestiona tus listas de reproducción" />
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Playlists"
        subtitle="Gestiona tus listas de reproducción"
        actions={
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
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
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre de la playlist"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción opcional"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreatePlaylist} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creando..." : "Crear"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlists List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Playlists ({Array.isArray(playlists) ? playlists.length : 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!Array.isArray(playlists) || playlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <List className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay playlists</p>
                <p className="text-sm">Crea tu primera playlist</p>
              </div>
            ) : (
              playlists.map((playlist: any) => (
                <div
                  key={playlist.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                    selectedPlaylist === playlist.id ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => setSelectedPlaylist(playlist.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{playlist.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {playlist.totalItems || 0} elementos
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {formatDuration(playlist.totalDuration || 0)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Playlist Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Contenido de Playlist
            </CardTitle>
            <CardDescription>
              {selectedPlaylist ? 
                `Elementos en "${Array.isArray(playlists) ? playlists.find((p: any) => p.id === selectedPlaylist)?.name : ''}"` :
                "Selecciona una playlist para ver su contenido"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedPlaylist ? (
              <div className="text-center py-8 text-muted-foreground">
                <Play className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Selecciona una playlist</p>
              </div>
            ) : !selectedPlaylistData || !Array.isArray(selectedPlaylistData.items) || selectedPlaylistData.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Playlist vacía</p>
                <p className="text-sm">Agrega contenido desde la biblioteca</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedPlaylistData.items.map((item: any, index: number) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.contentItem.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.contentItem.type} • {formatDuration(item.contentItem.duration || 0)}
                      </p>
                    </div>
                    <Badge variant="outline">#{index + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )) || []}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Library */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Biblioteca de Contenido
            </CardTitle>
            <CardDescription>
              Arrastra contenido para agregar a la playlist
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!Array.isArray(content) || content.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay contenido</p>
                <p className="text-sm">Sube archivos primero</p>
              </div>
            ) : (
              content.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => handleAddContent(item.id)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.type} • {formatDuration(item.duration || 0)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}