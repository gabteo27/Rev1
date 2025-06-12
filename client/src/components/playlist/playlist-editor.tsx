import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const LAYOUT_ZONES = {
  single_zone: [{ id: 'main', title: 'Contenido Principal' }],
  split_vertical: [{ id: 'left', title: 'Zona Izquierda' }, { id: 'right', title: 'Zona Derecha' }],
  split_horizontal: [{ id: 'top', title: 'Zona Superior' }, { id: 'bottom', title: 'Zona Inferior' }],
  pip_bottom_right: [{ id: 'main', title: 'Principal' }, { id: 'pip', title: 'Picture-in-Picture' }],
};

export function PlaylistEditor({ playlistId }: { playlistId: number | null }) {
  const { data: playlistData, isLoading } = useQuery({
    queryKey: ['/api/playlists', playlistId],
    queryFn: () => apiRequest(`/api/playlists/${playlistId}`).then(res => res.json()),
    enabled: !!playlistId
  });

  const { data: contentItems = [] } = useQuery({
    queryKey: ['/api/content'],
    queryFn: () => apiRequest('/api/content').then(res => res.json())
  });

  // Estado para gestionar los items seleccionados
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();

  // Mutaciones para mover, eliminar, etc.
  const moveItemMutation = useMutation({
    mutationFn: async ({ itemId, newZone, newOrder }: { itemId: string, newZone: string, newOrder: number }) => {
      return apiRequest(`/api/playlist-items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ zone: newZone, order: newOrder })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/playlists', playlistId] });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      await Promise.all(itemIds.map(id => 
        apiRequest(`/api/playlist-items/${id}`, { method: 'DELETE' })
      ));
    },
    onSuccess: () => {
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/playlists', playlistId] });
      toast({ title: "Elementos eliminados" });
    }
  });

  const addContentMutation = useMutation({
    mutationFn: async ({ contentId, zone }: { contentId: number, zone: string }) => {
      return apiRequest(`/api/playlists/${playlistId}/items`, {
        method: 'POST',
        body: JSON.stringify({ 
          contentItemId: contentId, 
          zone,
          order: playlistData?.items?.filter(item => item.zone === zone)?.length || 0
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/playlists', playlistId] });
      toast({ title: "Contenido agregado" });
    }
  });

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    // Lógica para mover items entre zonas
    // source.droppableId es la zona de origen
    // destination.droppableId es la zona de destino
    moveItemMutation.mutate({
      itemId: result.draggableId,
      newZone: destination.droppableId,
      newOrder: destination.index,
    });
  };

  const toggleItemSelected = (itemId: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const currentLayout = playlistData?.layout || 'single_zone';
  const zones = LAYOUT_ZONES[currentLayout];

  const filteredContent = contentItems.filter((item: any) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContentIcon = (type: string) => {
    switch (type) {
      case "image": return <Image className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "pdf": return <FileText className="w-4 h-4" />;
      case "webpage": return <Globe className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getContentBadgeColor = (type: string) => {
    switch (type) {
      case "image": return "bg-blue-100 text-blue-800";
      case "video": return "bg-purple-100 text-purple-800";
      case "pdf": return "bg-red-100 text-red-800";
      case "webpage": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!playlistId) {
    return <div className="p-4 text-center text-gray-500">Selecciona una playlist para editar</div>;
  }

  if (isLoading) {
    return <div className="p-4 text-center">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Botón para agregar contenido */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Editor de Playlist</h3>
        <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Contenido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Biblioteca de Contenido</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Búsqueda */}
              <Input
                placeholder="Buscar contenido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Lista de zonas para agregar contenido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {zones.map(zone => (
                  <div key={zone.id} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">{zone.title}</h4>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {filteredContent.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {getContentIcon(item.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.title}</p>
                                <p className="text-xs text-gray-500">{item.category || "Sin categoría"}</p>
                              </div>
                              <Badge className={getContentBadgeColor(item.type)}>
                                {item.type}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                addContentMutation.mutate({ contentId: item.id, zone: zone.id });
                              }}
                              disabled={addContentMutation.isPending}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Botones de acción para multi-selección */}
        {selectedItems.size > 0 && (
          <div className="p-2 bg-slate-100 rounded-md mb-4 flex items-center gap-2">
            <p>{selectedItems.size} elementos seleccionados</p>
            <Button variant="destructive" size="sm" onClick={() => bulkDeleteMutation.mutate([...selectedItems])}>
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </div>
        )}

      {/* Renderizado de las zonas del layout */}
      <div className={`grid gap-4 ${currentLayout === 'split_vertical' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {zones.map(zone => (
          <Droppable key={zone.id} droppableId={zone.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`p-4 border-2 border-dashed rounded-lg ${snapshot.isDraggingOver ? 'border-blue-500' : 'border-slate-300'}`}
              >
                <h3 className="font-bold mb-2">{zone.title}</h3>
                {playlistData?.items
                  .filter(item => item.zone === zone.id)
                  .sort((a,b) => a.order - b.order)
                  .map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="flex items-center gap-2 p-2 bg-white rounded-md mb-2 shadow-sm"
                        >
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleItemSelected(item.id)}
                          />
                          <p className="flex-grow">{item.contentItem.title}</p>
                          {/* ... input de duración, etc. ... */}
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
        </div>
      </DragDropContext>
    </div>
  );
}