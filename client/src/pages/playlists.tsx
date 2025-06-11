import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  List, 
  Play, 
  FileText, 
  GripVertical, 
  Trash2,
  Clock,
  Image,
  Video,
  FileSpreadsheet
} from "lucide-react";

export default function Playlists() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: "", description: "" });
  const { toast } = useToast();

  // Fetch data
  const { data: playlists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists"],
  });

  const { data: selectedPlaylistData } = useQuery({
    queryKey: ["/api/playlists", selectedPlaylist],
    enabled: !!selectedPlaylist,
  });

  const { data: content = [] } = useQuery({
    queryKey: ["/api/content"],
  });

  // Create playlist mutation
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

  // Add content to playlist mutation
  const addContentMutation = useMutation({
    mutationFn: async ({ playlistId, contentItemId }: { playlistId: number, contentItemId: number }) => {
      const currentItems = selectedPlaylistData?.items || [];
      return await apiRequest(`/api/playlists/${playlistId}/items`, {
        method: "POST",
        body: JSON.stringify({ 
          contentItemId,
          order: currentItems.length + 1
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylist] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Contenido agregado",
        description: "El elemento se ha agregado a la playlist.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo agregar el contenido a la playlist.",
        variant: "destructive",
      });
    }
  });

  // Remove item from playlist mutation
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
        description: "El elemento se ha eliminado de la playlist.",
      });
    },
  });

  // Delete playlist mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: async (playlistId: number) => {
      return await apiRequest(`/api/playlists/${playlistId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setSelectedPlaylist(null);
      toast({
        title: "Playlist eliminada",
        description: "La playlist se ha eliminado correctamente.",
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
    addContentMutation.mutate({ playlistId: selectedPlaylist, contentItemId });
  };

  const handleRemoveItem = (itemId: number) => {
    removeItemMutation.mutate(itemId);
  };

  const handleDeletePlaylist = (playlistId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta playlist?")) {
      deletePlaylistMutation.mutate(playlistId);
    }
  };

  const getFileIcon = (type: string) => {
    if (type?.startsWith('image/')) return Image;
    if (type?.startsWith('video/')) return Video;
    return FileSpreadsheet;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (playlistsLoading) {
    return (
      <div className="space-y-6">
        <Header title="Playlists" subtitle="Gestión de listas de reproducción" />
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
        subtitle="Gestión de listas de reproducción para señalización digital"
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
                    rows={3}
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{playlist.name}</h3>
                      {playlist.description && (
                        <p className="text-sm text-muted-foreground mt-1">{playlist.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{playlist.totalItems || 0} elementos</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor((playlist.totalDuration || 0) / 60)}m
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
          <CardContent className="space-y-3">
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
                {selectedPlaylistData.items.map((item: any, index: number) => {
                  const IconComponent = getFileIcon(item.contentItem?.type);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <IconComponent className="h-8 w-8 text-blue-500" />
                      <div className="flex-1">
                        <h4 className="font-medium">{item.contentItem?.name || 'Contenido'}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>#{index + 1}</span>
                          <span>{formatFileSize(item.contentItem?.size || 0)}</span>
                          <span>{formatDuration(item.customDuration || item.contentItem?.duration || 0)}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
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
              content.map((item: any) => {
                const IconComponent = getFileIcon(item.type);
                const isInPlaylist = selectedPlaylistData?.items?.some((pItem: any) => pItem.contentItemId === item.id);
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      isInPlaylist 
                        ? 'bg-muted border-muted-foreground/20' 
                        : 'hover:bg-accent cursor-pointer'
                    }`}
                    onClick={() => !isInPlaylist && handleAddContent(item.id)}
                  >
                    <IconComponent className="h-8 w-8 text-blue-500" />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(item.size || 0)}</span>
                        <span>{formatDuration(item.duration || 0)}</span>
                      </div>
                    </div>
                    {isInPlaylist && (
                      <Badge variant="secondary" className="text-xs">
                        En playlist
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}