import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  GripVertical, 
  Image, 
  Video, 
  FileText, 
  Globe, 
  Type,
  Trash2,
  Plus,
  Settings
} from "lucide-react";

export function PlaylistEditor() {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const { toast } = useToast();

  const { data: playlists } = useQuery({
    queryKey: ["/api/playlists"],
    queryFn: async () => {
      const response = await apiRequest("/api/playlists");
      return response.json();
    },
    retry: false,
  });

  const { data: playlistData } = useQuery({
    queryKey: ["/api/playlists", selectedPlaylistId],
    queryFn: async () => {
      const response = await apiRequest(`/api/playlists/${selectedPlaylistId}`);
      return response.json();
    },
    enabled: !!selectedPlaylistId,
    retry: false,
  });

  const { data: content } = useQuery({
    queryKey: ["/api/content"],
    queryFn: async () => {
      const response = await apiRequest("/api/content");
      return response.json();
    },
    retry: false,
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, customDuration }: { id: number; customDuration: number }) => {
      const response = await apiRequest(`/api/playlist-items/${id}`, {
        method: "PUT",
        body: JSON.stringify({ customDuration })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (itemOrders: { id: number; order: number }[]) => {
      await apiRequest(`/api/playlists/${selectedPlaylistId}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ itemOrders })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (contentItemId: number) => {
      const order = playlistData?.items?.length || 0;
      const response = await apiRequest(`/api/playlists/${selectedPlaylistId}/items`, {
        method: "POST",
        body: JSON.stringify({ contentItemId, order })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contenido agregado",
        description: "El contenido ha sido agregado a la playlist.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
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

  const calculateTotalDuration = () => {
    if (!playlistData?.items) return 0;
    return playlistData.items.reduce((total: number, item: any) => {
      return total + (item.customDuration || item.contentItem.duration || 0);
    }, 0);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <Card className="border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Editor de Playlist</h3>
          <div className="flex items-center space-x-2">
            <Select value={selectedPlaylistId} onValueChange={setSelectedPlaylistId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar playlist" />
              </SelectTrigger>
              <SelectContent>
                {playlists?.map((playlist: any) => (
                  <SelectItem key={playlist.id} value={playlist.id.toString()}>
                    {playlist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {!selectedPlaylistId ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 mb-2">
              Selecciona una playlist
            </h4>
            <p className="text-slate-600">
              Elige una playlist para comenzar a editar su contenido.
            </p>
          </div>
        ) : !playlistData?.items || playlistData.items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 mb-2">
              Playlist vacía
            </h4>
            <p className="text-slate-600 mb-6">
              Esta playlist no tiene contenido aún. Agrega elementos para comenzar.
            </p>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // Show available content to add
                if (!content || content.length === 0) {
                  toast({
                    title: "No hay contenido",
                    description: "Sube archivos primero desde la sección de Contenido.",
                    variant: "destructive"
                  });
                  return;
                }

                // Find content not already in playlist
                const availableContent = content.filter((c: any) => 
                  !playlistData?.items?.some((item: any) => item.contentItemId === c.id)
                );

                if (availableContent.length === 0) {
                  toast({
                    title: "Sin contenido disponible",
                    description: "Todo el contenido ya está en esta playlist.",
                  });
                  return;
                }

                // Add first available content item for now
                // In a real app, you'd show a selection modal
                addItemMutation.mutate(availableContent[0].id);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Contenido
            </Button>
          </div>
        ) : (
          <>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="playlist-items">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
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

                            <div className="w-16 h-12 bg-slate-300 rounded-lg mr-4 flex items-center justify-center">
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
                                className="w-16 text-center"
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

            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-slate-900">Contenido Disponible</h4>
              {!content || content.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                  <p className="text-slate-500">No hay contenido disponible</p>
                  <p className="text-sm text-slate-400 mt-1">Sube archivos desde la sección de Contenido</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {content
                    .filter((c: any) => !playlistData?.items?.some((item: any) => item.contentItemId === c.id))
                    .map((contentItem: any) => (
                      <div
                        key={contentItem.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                            {getContentIcon(contentItem.type)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{contentItem.title}</p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {contentItem.type}
                              </Badge>
                              <span className="text-sm text-slate-500">
                                {formatDuration(contentItem.duration || 10)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addItemMutation.mutate(contentItem.id)}
                          disabled={addItemMutation.isPending}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  }
                  {content.filter((c: any) => !playlistData?.items?.some((item: any) => item.contentItemId === c.id)).length === 0 && (
                    <div className="text-center py-4 text-slate-500">
                      <p>Todo el contenido ya está en esta playlist</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      {selectedPlaylistId && playlistData?.items && playlistData.items.length > 0 && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Total: <span className="font-medium">
                {playlistData.items.length} elementos • {formatDuration(calculateTotalDuration())}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Cancelar
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Guardar Playlist
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}