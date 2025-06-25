import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Plus,
  GripVertical,
  Trash2,
  Image,
  Video,
  FileText,
  Globe,
  Type,
  Layout,
  Component as WidgetIcon,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";

export default function PlaylistDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [playlistData, setPlaylistData] = useState<any>(null);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);

  const playlistId = parseInt(params.id || "0");

  const { data: playlist, isLoading, error: playlistError } = useQuery({
    queryKey: ["/api/playlists", playlistId],
    enabled: !!playlistId,
    retry: false,
  });

  const { data: availableContent, error: contentError } = useQuery({
    queryKey: ["/api/content"],
    retry: false,
  });

  const { data: allWidgets = [] } = useQuery({
    queryKey: ["/api/widgets"],
    queryFn: () => apiRequest("/api/widgets").then(res => res.json()),
    retry: false,
  });

  const { data: playlistWidgets = [] } = useQuery({
    queryKey: ["/api/playlists", playlistId, "widgets"],
    queryFn: () => apiRequest(`/api/playlists/${playlistId}/widgets`).then(res => res.json()),
    enabled: !!playlistId,
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
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Playlist actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la playlist.",
        variant: "destructive",
      });
    },
  });

  const addContentMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const order = playlistData?.items?.length || 0;
      const response = await apiRequest(`/api/playlists/${playlistId}/items`, {
        method: "POST",
        body: JSON.stringify({
          contentItemId: contentId,
          order: order
        })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contenido agregado",
        description: "El contenido ha sido agregado a la playlist.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId] });
      setShowAddContentModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el contenido.",
        variant: "destructive",
      });
    },
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el elemento.",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (itemOrders: { id: number; order: number }[]) => {
      await apiRequest(`/api/playlists/${playlistId}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ itemOrders })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId] });
    },
  });

  const addWidgetMutation = useMutation({
    mutationFn: async ({ widgetId, position }: { widgetId: number; position: string }) => {
      const response = await apiRequest(`/api/playlists/${playlistId}/widgets`, {
        method: "POST",
        body: JSON.stringify({ widgetId, position })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Widget agregado",
        description: "El widget ha sido agregado a la playlist.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId, "widgets"] });
      setShowAddWidgetModal(false);
    },
  });

  const removeWidgetMutation = useMutation({
    mutationFn: async (widgetId: number) => {
      await apiRequest(`/api/playlists/${playlistId}/widgets/${widgetId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Widget eliminado",
        description: "El widget ha sido eliminado de la playlist.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId, "widgets"] });
    },
  });

  const handleSavePlaylist = () => {
    if (!playlistData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la playlist es requerido.",
        variant: "destructive",
      });
      return;
    }
    
    // Solo enviar los campos que pueden ser actualizados
    const updateData: any = {
      name: playlistData.name.trim(),
      description: playlistData.description || null,
      isActive: playlistData.isActive,
      layout: playlistData.layout || 'single_zone'
    };
    
    // Solo agregar configuraciones específicas si están definidas
    if (playlistData.layout === 'carousel' && playlistData.carouselDuration) {
      updateData.carouselDuration = parseInt(playlistData.carouselDuration.toString()) || 5;
    }
    
    if (playlistData.layout === 'web_scroll' && playlistData.scrollSpeed) {
      updateData.scrollSpeed = parseInt(playlistData.scrollSpeed.toString()) || 50;
    }
    
    updatePlaylistMutation.mutate(updateData);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !playlistData?.items) return;

    const items = Array.from(playlistData.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const itemOrders = items.map((item: any, index: number) => ({
      id: item.id,
      order: index,
    }));

    setPlaylistData({
      ...playlistData,
      items: items
    });

    reorderMutation.mutate(itemOrders);
  };

  const handleDurationChange = (itemId: number, duration: string) => {
    const customDuration = parseInt(duration) || 0;
    if (customDuration > 0) {
      updateItemMutation.mutate({ id: itemId, customDuration });
    }
  };

  const getCurrentLayoutItems = () => {
    if (!playlistData?.items) return [];
    
    const layout = playlistData.layout || 'single_zone';
    let validZones = ['main'];
    
    switch (layout) {
      case 'split_vertical':
        validZones = ['left', 'right', 'main'];
        break;
      case 'split_horizontal':
        validZones = ['top', 'bottom', 'main'];
        break;
      case 'pip_bottom_right':
        validZones = ['main', 'pip'];
        break;
      case 'carousel':
        validZones = ['main'];
        break;
      case 'web_scroll':
        validZones = ['main'];
        break;
      case 'single_zone':
      default:
        validZones = ['main'];
        break;
    }
    
    // Filter items by zone, defaulting to 'main' for items without zone
    // Also handle legacy items that might not have a zone set
    return playlistData.items.filter((item: any) => {
      const itemZone = item.zone || 'main';
      return validZones.includes(itemZone);
    });
  };

  const calculateTotalDuration = () => {
    const currentItems = getCurrentLayoutItems();
    return currentItems.reduce((total: number, item: any) => {
      return total + (item.customDuration || item.contentItem?.duration || 0);
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

  const layoutOptions = [
    { value: 'single_zone', label: 'Completa', description: 'Una sola zona de contenido' },
    { value: 'split_vertical', label: 'Vertical', description: 'División vertical en dos zonas' },
    { value: 'split_horizontal', label: 'Horizontal', description: 'División horizontal en dos zonas' },
    { value: 'pip_bottom_right', label: 'PiP', description: 'Picture in Picture inferior derecha' },
    { value: 'carousel', label: 'Carrusel', description: 'Presentación de imágenes en bucle' },
    { value: 'web_scroll', label: 'Web Scroll', description: 'Página web con scroll automático' }
  ];

  const getAvailableContent = () => {
    if (!availableContent || !playlistData?.items) return availableContent || [];

    const usedContentIds = playlistData.items.map((item: any) => item.contentItem.id);
    return availableContent.filter((content: any) => !usedContentIds.includes(content.id));
  };

  if (playlistError) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Error" subtitle="No se pudo cargar la playlist" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error al cargar la playlist</p>
            <Button onClick={() => setLocation("/playlists")}>
              Volver a playlists
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !playlistData) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Cargando..." subtitle="Obteniendo información de la playlist" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando playlist...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={playlistData.name}
        subtitle={`${getCurrentLayoutItems().length} elementos • ${formatDuration(calculateTotalDuration())}`}
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
                <div className="space-y-2">
                  <Label htmlFor="layout">Tipo de Layout</Label>
                  <Select
                    value={playlistData.layout || 'single_zone'}
                    onValueChange={(value) => setPlaylistData({ ...playlistData, layout: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar layout..." />
                    </SelectTrigger>
                    <SelectContent>
                      {layoutOptions.map((layout) => (
                        <SelectItem key={layout.value} value={layout.value}>
                          <div className="flex items-center gap-2">
                            <Layout className="w-4 h-4" />
                            <div>
                              <div className="font-medium">{layout.label}</div>
                              <div className="text-xs text-muted-foreground">{layout.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={playlistData.isActive}
                    onCheckedChange={(checked) => setPlaylistData({ ...playlistData, isActive: checked })}
                    disabled={!isEditing}
                  />
                  <Label>Playlist activa</Label>
                </div>
                
                {/* Configuraciones específicas por layout */}
                {playlistData.layout === 'carousel' && (
                  <div className="space-y-2">
                    <Label htmlFor="carousel-duration">Duración por imagen (segundos)</Label>
                    <Input
                      id="carousel-duration"
                      type="number"
                      min="1"
                      max="60"
                      value={playlistData.carouselDuration || 5}
                      onChange={(e) => setPlaylistData({ 
                        ...playlistData, 
                        carouselDuration: parseInt(e.target.value) || 5 
                      })}
                      disabled={!isEditing}
                      placeholder="5"
                    />
                  </div>
                )}
                
                {playlistData.layout === 'web_scroll' && (
                  <div className="space-y-2">
                    <Label htmlFor="scroll-speed">Velocidad de scroll (px/segundo)</Label>
                    <Input
                      id="scroll-speed"
                      type="number"
                      min="10"
                      max="200"
                      value={playlistData.scrollSpeed || 50}
                      onChange={(e) => setPlaylistData({ 
                        ...playlistData, 
                        scrollSpeed: parseInt(e.target.value) || 50 
                      })}
                      disabled={!isEditing}
                      placeholder="50"
                    />
                  </div>
                )}
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

          <Card>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Contenido de la Playlist</h3>
                <Dialog open={showAddContentModal} onOpenChange={setShowAddContentModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Contenido
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Contenido a la Playlist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {getAvailableContent().length === 0 ? (
                        <p className="text-center text-slate-500 py-8">
                          No hay contenido disponible para agregar
                        </p>
                      ) : (
                        getAvailableContent().map((content: any) => (
                          <div
                            key={content.id}
                            className="flex items-center p-3 border border-slate-200 rounded-lg hover:border-slate-300 cursor-pointer"
                            onClick={() => addContentMutation.mutate(content.id)}
                          >
                            <div className="w-12 h-12 bg-slate-100 rounded-lg mr-3 flex items-center justify-center">
                              {getContentIcon(content.type)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900">{content.title}</h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {content.type}
                                </Badge>
                                <span className="text-sm text-slate-500">
                                  {formatDuration(content.duration || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <CardContent className="p-6">
              {getCurrentLayoutItems().length === 0 ? (
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
                  <Button onClick={() => setShowAddContentModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Contenido
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="playlist-items">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-4"
                      >
                        {getCurrentLayoutItems()
                          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                          .map((item: any, index: number) => (
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
                                  {getContentIcon(item.contentItem?.type)}
                                </div>

                                <div className="flex-1">
                                  <h4 className="font-medium text-slate-900">
                                    {item.contentItem?.title}
                                  </h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {item.contentItem?.type}
                                    </Badge>
                                    <span className="text-sm text-slate-500">
                                      {formatDuration(item.customDuration || item.contentItem?.duration || 0)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    value={item.customDuration || item.contentItem?.duration || 0}
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
              )}
            </CardContent>
          </Card>

          {/* Widgets Section */}
          <Card>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Widgets de la Playlist</h3>
                <Dialog open={showAddWidgetModal} onOpenChange={setShowAddWidgetModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <WidgetIcon className="w-4 h-4 mr-2" />
                      Agregar Widget
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Widget a la Playlist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {allWidgets
                        .filter((widget: any) => !playlistWidgets.some((pw: any) => pw.widget.id === widget.id))
                        .map((widget: any) => (
                          <div
                            key={widget.id}
                            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-slate-300"
                          >
                            <div className="flex items-center space-x-3">
                              <WidgetIcon className="w-5 h-5 text-blue-600" />
                              <div>
                                <h4 className="font-medium text-slate-900">{widget.name}</h4>
                                <p className="text-sm text-slate-500">{widget.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Select
                                onValueChange={(position) => {
                                  addWidgetMutation.mutate({ widgetId: widget.id, position });
                                }}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Posición" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="top-left">Superior Izquierda</SelectItem>
                                  <SelectItem value="top-right">Superior Derecha</SelectItem>
                                  <SelectItem value="bottom-left">Inferior Izquierda</SelectItem>
                                  <SelectItem value="bottom-right">Inferior Derecha</SelectItem>
                                  <SelectItem value="center">Centro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      {allWidgets.filter((widget: any) => !playlistWidgets.some((pw: any) => pw.widget.id === widget.id)).length === 0 && (
                        <p className="text-center text-slate-500 py-8">
                          Todos los widgets disponibles ya están agregados a esta playlist
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <CardContent className="p-6">
              {playlistWidgets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <WidgetIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">
                    Sin widgets
                  </h4>
                  <p className="text-slate-600 mb-6">
                    Esta playlist no tiene widgets configurados. Agrega widgets para mejorar la experiencia.
                  </p>
                  <Button onClick={() => setShowAddWidgetModal(true)}>
                    <WidgetIcon className="w-4 h-4 mr-2" />
                    Agregar Widget
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {playlistWidgets.map((playlistWidget: any) => (
                    <div
                      key={playlistWidget.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center space-x-3">
                        <WidgetIcon className="w-5 h-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-slate-900">{playlistWidget.widget.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {playlistWidget.widget.type}
                            </Badge>
                            <span className="text-sm text-slate-500">
                              {playlistWidget.position}
                            </span>
                            {playlistWidget.isEnabled ? (
                              <Badge variant="default" className="text-xs">
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Inactivo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWidgetMutation.mutate(playlistWidget.widget.id)}
                          disabled={removeWidgetMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}