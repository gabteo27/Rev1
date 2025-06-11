import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
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
  FileSpreadsheet,
  Globe,
  Type,
  Eye,
  Edit,
  Settings
} from "lucide-react";

export default function Playlists() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: "", description: "" });
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);
  const { toast } = useToast();

  // Fetch data
  const { data: playlists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists"],
  });

  const { data: selectedPlaylistData, refetch: refetchPlaylist } = useQuery({
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

  // Update playlist mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/playlists/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setEditModalOpen(false);
      setEditingPlaylist(null);
      toast({
        title: "Playlist actualizada",
        description: "Los cambios se han guardado correctamente.",
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
          order: currentItems.length
        })
      });
    },
    onSuccess: () => {
      refetchPlaylist();
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Contenido agregado",
        description: "El elemento se ha agregado a la playlist.",
      });
    },
  });

  // Remove item from playlist mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest(`/api/playlist-items/${itemId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      refetchPlaylist();
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

  // Reorder items mutation
  const reorderMutation = useMutation({
    mutationFn: async (itemOrders: { id: number; order: number }[]) => {
      await apiRequest(`/api/playlists/${selectedPlaylist}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ itemOrders })
      });
    },
    onSuccess: () => {
      refetchPlaylist();
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

  const handleEditPlaylist = (playlist: any) => {
    setEditingPlaylist({ ...playlist });
    setEditModalOpen(true);
  };

  const handleUpdatePlaylist = () => {
    if (!editingPlaylist?.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la playlist es requerido.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(editingPlaylist);
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

  const handleDragEnd = (result: any) => {
    if (!result.destination || !selectedPlaylistData?.items) return;

    const items = Array.from(selectedPlaylistData.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const itemOrders = items.map((item, index) => ({
      id: item.id,
      order: index,
    }));

    reorderMutation.mutate(itemOrders);
  };

  const getFileIcon = (type: string) => {
    if (type?.startsWith('image') || type === 'image') return Image;
    if (type?.startsWith('video') || type === 'video') return Video;
    if (type === 'webpage') return Globe;
    if (type === 'text') return Type;
    return FileSpreadsheet;
  };

  const getFileColor = (type: string) => {
    if (type?.startsWith('image') || type === 'image') return 'text-blue-600';
    if (type?.startsWith('video') || type === 'video') return 'text-green-600';
    if (type === 'webpage') return 'text-orange-600';
    if (type === 'text') return 'text-purple-600';
    return 'text-slate-600';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  function AvailableContentLibrary({ playlistId, onAdd }: { playlistId: number, onAdd: (contentId: number) => void }) {
    const { data: allContent = [] } = useQuery({ queryKey: ['/api/content'] });
    const { data: playlistData } = useQuery({ 
      queryKey: ['/api/playlists', playlistId],
      enabled: !!playlistId 
    });

    const contentInPlaylist = new Set(playlistData?.items?.map((item: any) => item.contentItemId) || []);

    const availableContent = allContent.filter((item: any) => !contentInPlaylist.has(item.id));

    return (
      <div className="space-y-2">
        {availableContent.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between p-2 hover:bg-accent rounded">
            <span className="text-sm">{item.title || item.name}</span>
            <Button size="sm" onClick={() => onAdd(item.id)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    );
  }

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
        subtitle="Gestión visual de listas de reproducción para señalización digital"
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Playlists List */}
        <Card className="lg:col-span-1">
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
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedPlaylist === playlist.id ? 'bg-primary/10 border-primary shadow-sm' : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedPlaylist(playlist.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{playlist.name}</h3>
                      {playlist.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{playlist.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {playlist.totalItems || 0} elementos
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor((playlist.totalDuration || 0) / 60)}m
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPlaylist(playlist);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(playlist.id);
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Playlist Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Editor de Playlist
                </CardTitle>
                <CardDescription>
                  {selectedPlaylist ? 
                    `Editando: "${Array.isArray(playlists) ? playlists.find((p: any) => p.id === selectedPlaylist)?.name : ''}"` :
                    "Selecciona una playlist para editar"
                  }
                </CardDescription>
              </div>
              {selectedPlaylist && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPreviewModalOpen(true)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPlaylist ? (
              <div className="text-center py-12">
                <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h4 className="text-lg font-medium mb-2">Selecciona una playlist</h4>
                <p className="text-muted-foreground">Elige una playlist para comenzar a editar su contenido.</p>
              </div>
            ) : !selectedPlaylistData || !Array.isArray(selectedPlaylistData.items) || selectedPlaylistData.items.length === 0 ? (
              <div className="text-center py-12">
                <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h4 className="text-lg font-medium mb-2">Playlist vacía</h4>
                <p className="text-muted-foreground mb-4">Esta playlist no tiene contenido aún.</p>
                <p className="text-sm text-muted-foreground">Arrastra contenido desde la biblioteca o usa los botones de agregar.</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="playlist-items">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {selectedPlaylistData.items.map((item: any, index: number) => {
                        const IconComponent = getFileIcon(item.contentItem?.type);
                        const iconColor = getFileColor(item.contentItem?.type);

                        return (
                          <Draggable
                            key={item.id}
                            draggableId={item.id.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-3 p-4 bg-card border rounded-lg transition-all ${
                                  snapshot.isDragging ? "shadow-lg bg-accent" : "hover:bg-accent/50"
                                }`}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-foreground cursor-grab"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>

                                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                  <IconComponent className={`w-6 h-6 ${iconColor}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">{item.contentItem?.title || item.contentItem?.name}</h4>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                    <Badge variant="outline" className="text-xs px-2 py-0">
                                      {item.contentItem?.type}
                                    </Badge>
                                    <span>{formatDuration(item.customDuration || item.contentItem?.duration || 0)}</span>
                                    {item.contentItem?.fileSize && (
                                      <span>{formatFileSize(item.contentItem.fileSize)}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground font-mono">#{index + 1}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveItem(item.id)}
                                    disabled={removeItemMutation.isPending}
                                    className="text-red-500 hover:text-red-600 p-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </CardContent>

          {selectedPlaylist && selectedPlaylistData?.items?.length > 0 && (
            <div className="px-6 py-4 bg-muted/50 border-t">
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  Total: <span className="font-medium text-foreground">
                    {selectedPlaylistData.items.length} elementos • {formatDuration(
                      selectedPlaylistData.items.reduce((total: number, item: any) => 
                        total + (item.customDuration || item.contentItem?.duration || 0), 0
                      )
                    )}
                  </span>
                </div>
                <Badge variant="secondary">
                  Lista guardada automáticamente
                </Badge>
              </div>
            </div>
          )}
        </Card>

        {/* Content Library */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Biblioteca
            </CardTitle>
            <CardDescription>
              Haz clic para agregar a la playlist
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
                const iconColor = getFileColor(item.type);
                const isInPlaylist = selectedPlaylistData?.items?.some((pItem: any) => pItem.contentItemId === item.id);

                return (
                  <div
                    key={item.id}
                    className={`group flex items-center gap-3 p-3 border rounded-lg transition-all ${
                      isInPlaylist 
                        ? 'bg-muted/50 border-muted-foreground/20 opacity-60' 
                        : 'hover:bg-accent cursor-pointer hover:shadow-sm'
                    }`}
                    onClick={() => !isInPlaylist && selectedPlaylist && handleAddContent(item.id)}
                  >
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.title || item.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{formatDuration(item.duration || 0)}</span>
                        {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
                      </div>
                    </div>
                    {isInPlaylist ? (
                      <Badge variant="secondary" className="text-xs">
                        Agregado
                      </Badge>
                    ) : selectedPlaylist ? (
                      <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Playlist Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Playlist</DialogTitle>
          </DialogHeader>
          {editingPlaylist && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={editingPlaylist.name}
                  onChange={(e) => setEditingPlaylist(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre de la playlist"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={editingPlaylist.description || ''}
                  onChange={(e) => setEditingPlaylist(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción opcional"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdatePlaylist} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista Previa de Playlist</DialogTitle>
          </DialogHeader>
          {selectedPlaylist && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe 
                src={`/screen-player?playlistId=${selectedPlaylist}`} 
                className="w-full h-full" 
                frameBorder="0"
                title="Vista previa de la playlist"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}