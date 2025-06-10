
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  GripVertical, 
  Image, 
  Video, 
  FileText, 
  Globe, 
  Type,
  Trash2,
  Plus,
  Save,
  ArrowLeft,
  Clock,
  List
} from "lucide-react";

export default function PlaylistDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const playlistId = params.id;
  const [isEditing, setIsEditing] = useState(false);
  const [addContentModalOpen, setAddContentModalOpen] = useState(false);
  const [playlistData, setPlaylistData] = useState<any>(null);
  const { toast } = useToast();

  const { data: playlist, isLoading } = useQuery({
    queryKey: ["/api/playlists", playlistId],
    enabled: !!playlistId,
    retry: false,
  });

  const { data: content } = useQuery({
    queryKey: ["/api/content"],
    retry: false,
  });

  useEffect(() => {
    if (playlist) {
      setPlaylistData(playlist);
    }
  }, [playlist]);

  const updatePlaylistMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/playlists/${playlistId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Playlist actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la playlist.",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, customDuration }: { id: number; customDuration: number }) => {
      const response = await apiRequest(`/api/playlist-items/${id}`, {
        method: "PUT",
        body: JSON.stringify({ customDuration }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/playlist-items/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({
        title: "Elemento eliminado",
        description: "El elemento ha sido eliminado de la playlist.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (itemOrders: { id: number; order: number }[]) => {
      await apiRequest(`/api/playlists/${playlistId}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ itemOrders }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (contentItemId: number) => {
      const order = playlistData?.items?.length || 0;
      const response = await apiRequest(`/api/playlists/${playlistId}/items`, {
        method: "POST",
        body: JSON.stringify({ contentItemId, order }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contenido agregado",
        description: "El contenido ha sido agregado a la playlist.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId] });
      setAddContentModalOpen(false);
    },
  });

  const getContentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-5 h-5 text-blue-600" />;
      case "video":
        return <Video className="w-5 h-5 text-green-600" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-purple-600" />;
      case "webpage":
        return <Globe className="w-5 h-5 text-orange-600" />;
      case "text":
        return <Type className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !playlistData?.items) return;

    const items = Array.from(playlistData.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately
    setPlaylistData({
      ...playlistData,
      items,
    });

    const itemOrders = items.map((item, index) => ({
      id: item.id,
      order: index,
    }));

    reorderMutation.mutate(itemOrders);
  };

  const handleDurationChange = (itemId: number, duration: string) => {
    const customDuration = parseInt(duration) || 0;
    if (customDuration > 0) {
      updateItemMutation.mutate({ id: itemId, customDuration });
    }
  };

  const handleSavePlaylist = () => {
    if (!playlistData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la playlist es requerido.",
        variant: "destructive",
      });
      return;
    }

    updatePlaylistMutation.mutate({
      name: playlistData.name,
      description: playlistData.description,
      isActive: playlistData.isActive,
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const calculateTotalDuration = () => {
    if (!playlistData?.items) return 0;
    return playlistData.items.reduce((total: number, item: any) => {
      return total + (item.customDuration || item.contentItem.duration || 0);
    }, 0);
  };

  const availableContent = content?.filter((item: any) => 
    !playlistData?.items?.some((playlistItem: any) => 
      playlistItem.contentItem.id === item.id
    )
  ) || [];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Cargando..." subtitle="Obteniendo datos de la playlist" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando playlist...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!playlistData) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Error" subtitle="Playlist no encontrada" />
        <div className="flex-1 flex items-center justify-center">
          <Button onClick={() => setLocation("/playlists")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Playlists
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={playlistData.name}
        subtitle={`${playlistData.items?.length || 0} elementos • ${formatDuration(calculateTotalDuration())}`}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setLocation("/playlists")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setPlaylistData(playlist);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSavePlaylist}
                  disabled={updatePlaylistMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updatePlaylistMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Editar Playlist
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Playlist Info */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Nombre de la Playlist</Label>
                  <Input
                    id="name"
                    value={playlistData.name}
                    onChange={(e) => setPlaylistData({ ...playlistData, name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={playlistData.isActive}
                    onCheckedChange={(checked) => setPlaylistData({ ...playlistData, isActive: checked })}
                    disabled={!isEditing}
                  />
                  <Label>Playlist activa</Label>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={playlistData.description || ""}
                  onChange={(e) => setPlaylistData({ ...playlistData, description: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Descripción de la playlist..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Playlist Items */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Contenido de la Playlist</h3>
                <Dialog open={addContentModalOpen} onOpenChange={setAddContentModalOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Contenido
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Agregar Contenido a la Playlist</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-auto">
                      {availableContent.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">
                          No hay contenido disponible para agregar
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {availableContent.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                              onClick={() => addItemMutation.mutate(item.id)}
                            >
                              <div className="w-12 h-12 bg-slate-100 rounded-lg mr-3 flex items-center justify-center">
                                {getContentIcon(item.type)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{item.title}</h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {item.type}
                                  </Badge>
                                  <span className="text-sm text-slate-500">
                                    {formatDuration(item.duration || 0)}
                                  </span>
                                </div>
                              </div>
                              <Plus className="w-5 h-5 text-blue-600" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {!playlistData.items || playlistData.items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <List className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">
                    Playlist vacía
                  </h4>
                  <p className="text-slate-600 mb-6">
                    Esta playlist no tiene contenido aún. Agrega elementos para comenzar.
                  </p>
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
                        {playlistData.items.map((item: any, index: number) => (
                          <Draggable
                            key={item.id}
                            draggableId={item.id.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors ${
                                  snapshot.isDragging ? "shadow-lg" : ""
                                }`}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="flex items-center justify-center w-8 h-8 bg-slate-200 rounded cursor-grab mr-4 hover:bg-slate-300"
                                >
                                  <GripVertical className="w-4 h-4 text-slate-400" />
                                </div>

                                <div className="w-12 h-12 bg-slate-300 rounded-lg mr-4 flex items-center justify-center">
                                  {getContentIcon(item.contentItem.type)}
                                </div>

                                <div className="flex-1">
                                  <h4 className="font-medium text-slate-900">
                                    {item.contentItem.title}
                                  </h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {item.contentItem.type}
                                    </Badge>
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="text-sm text-slate-500">
                                      {formatDuration(item.customDuration || item.contentItem.duration || 0)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    value={item.customDuration || item.contentItem.duration || 0}
                                    onChange={(e) => handleDurationChange(item.id, e.target.value)}
                                    className="w-20 text-center"
                                    min="1"
                                  />
                                  <span className="text-sm text-slate-500">seg</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 p-2"
                                    onClick={() => deleteItemMutation.mutate(item.id)}
                                    disabled={deleteItemMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
