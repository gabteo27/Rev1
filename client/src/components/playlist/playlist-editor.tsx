
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  GripVertical, 
  Image, 
  Video, 
  FileText, 
  Globe, 
  Type, 
  Trash2, 
  Plus, 
  Settings,
  List,
  Edit,
  Eye,
  Clock
} from "lucide-react";

interface PlaylistEditorProps {
  playlistId?: number | null;
  onPlaylistChange?: (playlistId: number | null) => void;
}

export function PlaylistEditor({ playlistId, onPlaylistChange }: PlaylistEditorProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(playlistId?.toString() || "");
  const { toast } = useToast();

  // Get all playlists for the selector
  const { data: playlists = [] } = useQuery({
    queryKey: ["/api/playlists"],
    retry: 1,
  });

  // Get all available content
  const { data: content = [] } = useQuery({
    queryKey: ["/api/content"],
    retry: 1,
  });

  // Get selected playlist data
  const { data: playlistData, isLoading } = useQuery({
    queryKey: ["/api/playlists", selectedPlaylistId],
    queryFn: async () => {
      if (!selectedPlaylistId) return null;
      const response = await apiRequest(`/api/playlists/${selectedPlaylistId}`);
      return response.json();
    },
    enabled: !!selectedPlaylistId,
  });

  // Add content to playlist mutation
  const addItemMutation = useMutation({
    mutationFn: async (contentItemId: number) => {
      const currentItems = playlistData?.items || [];
      return await apiRequest(`/api/playlists/${selectedPlaylistId}/items`, {
        method: "POST",
        body: JSON.stringify({ 
          contentItemId,
          order: currentItems.length
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Contenido agregado",
        description: "El elemento se ha agregado a la playlist.",
      });
    },
  });

  // Update item duration mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, customDuration }: { id: number; customDuration: number }) => {
      await apiRequest(`/api/playlist-items/${id}`, {
        method: "PUT",
        body: JSON.stringify({ customDuration })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] }),
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/playlist-items/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Elemento eliminado" });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
    },
  });

  // Reorder items mutation
  const reorderMutation = useMutation({
    mutationFn: async (itemOrders: { id: number; order: number }[]) => {
      await apiRequest(`/api/playlists/${selectedPlaylistId}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ itemOrders })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] }),
  });

  const handlePlaylistChange = (value: string) => {
    setSelectedPlaylistId(value);
    const playlistIdNum = value ? parseInt(value) : null;
    onPlaylistChange?.(playlistIdNum);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !playlistData?.items) return;

    const items = Array.from(playlistData.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const itemOrders = items.map((item, index) => ({ id: item.id, order: index }));
    reorderMutation.mutate(itemOrders);
  };

  const handleDurationChange = (itemId: number, duration: string) => {
    const customDuration = parseInt(duration) || 0;
    if (customDuration > 0) {
      updateItemMutation.mutate({ id: itemId, customDuration });
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case "image":
        return Image;
      case "video":
        return Video;
      case "pdf":
        return FileText;
      case "webpage":
        return Globe;
      case "text":
        return Type;
      default:
        return FileText;
    }
  };

  const getContentIconColor = (type: string) => {
    switch (type) {
      case "image":
        return "text-blue-600";
      case "video":
        return "text-green-600";
      case "pdf":
        return "text-purple-600";
      case "webpage":
        return "text-orange-600";
      case "text":
        return "text-yellow-600";
      default:
        return "text-slate-600";
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
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Available content that's not in the current playlist
  const availableContent = content.filter((c: any) => 
    !playlistData?.items?.some((item: any) => item.contentItemId === c.id)
  );

  if (!selectedPlaylistId) {
    return (
      <Card className="flex items-center justify-center h-full">
        <div className="text-center text-slate-500">
          <List className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p>Selecciona una playlist para comenzar a editar.</p>
          <div className="mt-4">
            <Select value={selectedPlaylistId} onValueChange={handlePlaylistChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Seleccionar playlist" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(playlists) && playlists.map((playlist: any) => (
                  <SelectItem key={playlist.id} value={playlist.id.toString()}>
                    {playlist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editor de Playlist
            </CardTitle>
            <CardDescription>
              Editando: "{playlists.find((p: any) => p.id.toString() === selectedPlaylistId)?.name}"
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={selectedPlaylistId} onValueChange={handlePlaylistChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar playlist" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(playlists) && playlists.map((playlist: any) => (
                  <SelectItem key={playlist.id} value={playlist.id.toString()}>
                    {playlist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!playlistData?.items || playlistData.items.length === 0 ? (
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
            {availableContent.length > 0 && (
              <Button
                onClick={() => {
                  if (availableContent.length > 0) {
                    addItemMutation.mutate(availableContent[0].id);
                  }
                }}
                disabled={addItemMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Elemento
              </Button>
            )}
          </div>
        ) : (
          <>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="playlist-items">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {playlistData.items.map((item: any, index: number) => {
                      const IconComponent = getContentIcon(item.contentItem.type);
                      const iconColor = getContentIconColor(item.contentItem.type);
                      
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
                                <h4 className="font-medium truncate">
                                  {item.contentItem.title || item.contentItem.name}
                                </h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {item.contentItem.type}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
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
                                <span className="text-sm text-muted-foreground">seg</span>
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
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Available Content */}
            {availableContent.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-slate-900 mb-3">Contenido Disponible</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableContent.map((contentItem: any) => {
                    const IconComponent = getContentIcon(contentItem.type);
                    const iconColor = getContentIconColor(contentItem.type);
                    
                    return (
                      <div
                        key={contentItem.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-background rounded-md flex items-center justify-center">
                            <IconComponent className={`w-4 h-4 ${iconColor}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{contentItem.title || contentItem.name}</p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {contentItem.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
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
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Footer with stats */}
      {selectedPlaylistId && playlistData?.items && playlistData.items.length > 0 && (
        <div className="px-6 py-4 bg-muted/50 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {playlistData.items.length} elementos
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(calculateTotalDuration())}
              </span>
            </div>
            <Badge variant="secondary">
              Guardado automáticamente
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
}
