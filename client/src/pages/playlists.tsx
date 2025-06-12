
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, List, FileText, GripVertical, Trash2, Edit, Settings, Layout,
  SplitSquareHorizontal, SplitSquareVertical, PictureInPicture, Image, Video, Globe, Type,
  Eye, Clock, Play
} from "lucide-react";

// Tipos para mayor claridad
type Playlist = any;
type PlaylistItem = any;
type ContentItem = any;
type FullPlaylistItem = PlaylistItem & { contentItem: ContentItem };

// Definición de las zonas para cada layout
const LAYOUT_ZONES: Record<string, { id: string; title: string }[]> = {
  single_zone: [{ id: 'main', title: 'Contenido Principal' }],
  split_vertical: [{ id: 'left', title: 'Zona Izquierda' }, { id: 'right', title: 'Zona Derecha' }],
  split_horizontal: [{ id: 'top', title: 'Zona Superior' }, { id: 'bottom', title: 'Zona Inferior' }],
  pip_bottom_right: [{ id: 'main', title: 'Principal' }, { id: 'pip', title: 'Picture-in-Picture' }],
};

export default function Playlists() {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: "", description: "", layout: "single_zone" });
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);
  const { toast } = useToast();

  // --- QUERIES ---
  const { data: playlists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/playlists");
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching playlists:', error);
        return [];
      }
    },
    retry: 1,
  });

  const { data: allContent = [] } = useQuery({
    queryKey: ["/api/content"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/content");
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching content:', error);
        return [];
      }
    },
    retry: 1,
  });

  const { data: playlistData, isLoading: playlistLoading, refetch: refetchPlaylist } = useQuery({
    queryKey: ["/api/playlists", selectedPlaylistId],
    enabled: !!selectedPlaylistId,
    queryFn: async () => {
      if (!selectedPlaylistId) return null;
      try {
        const response = await apiRequest(`/api/playlists/${selectedPlaylistId}`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching playlist:', error);
        throw error;
      }
    },
    retry: 1,
  });

  // --- MUTATIONS ---
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/playlists", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setCreateModalOpen(false);
      setNewPlaylist({ name: "", description: "", layout: "single_zone" });
      toast({
        title: "Playlist creada",
        description: "La playlist se ha creado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la playlist.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/playlists/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la playlist.",
        variant: "destructive",
      });
    },
  });

  const updateLayoutMutation = useMutation({
    mutationFn: async (layout: string) => {
      const response = await apiRequest(`/api/playlists/${selectedPlaylistId}`, {
        method: "PUT",
        body: JSON.stringify({ layout }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId] });
      toast({
        title: "Layout actualizado",
        description: "El layout de la playlist se ha cambiado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el layout.",
        variant: "destructive",
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ contentItemId, zone }: { contentItemId: number, zone: string }) => {
      const currentItems = playlistData?.items?.filter((item: any) => item.zone === zone) || [];
      const response = await apiRequest(`/api/playlists/${selectedPlaylistId}/items`, {
        method: "POST",
        body: JSON.stringify({ 
          contentItemId, 
          order: currentItems.length,
          zone: zone || 'main'
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      refetchPlaylist();
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Contenido agregado",
        description: "El elemento se ha agregado a la playlist.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el contenido.",
        variant: "destructive",
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest(`/api/playlist-items/${itemId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response;
    },
    onSuccess: () => {
      refetchPlaylist();
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Elemento eliminado",
        description: "El elemento se ha eliminado de la playlist.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el elemento.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      await Promise.all(itemIds.map(async id => {
        const response = await apiRequest(`/api/playlist-items/${id}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(`Error deleting item ${id}`);
        }
        return response;
      }));
    },
    onSuccess: () => {
      toast({ title: "Elementos eliminados" });
      setSelectedItems(new Set());
      refetchPlaylist();
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron eliminar algunos elementos.",
        variant: "destructive",
      });
    },
  });

  const updateItemDurationMutation = useMutation({
    mutationFn: async ({ itemId, duration }: { itemId: number, duration: number }) => {
      const response = await apiRequest(`/api/playlist-items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ customDuration: duration }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      refetchPlaylist();
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la duración.",
        variant: "destructive",
      });
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async (playlistId: number) => {
      const response = await apiRequest(`/api/playlists/${playlistId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setSelectedPlaylistId(null);
      toast({
        title: "Playlist eliminada",
        description: "La playlist se ha eliminado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la playlist.",
        variant: "destructive",
      });
    },
  });

  // --- HANDLERS ---
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

  const handleDeletePlaylist = (playlistId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta playlist?")) {
      deletePlaylistMutation.mutate(playlistId);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    // Por ahora, solo mostramos un mensaje de que la funcionalidad está en desarrollo
    toast({ 
      title: "Funcionalidad en desarrollo", 
      description: "El reordenamiento entre zonas estará disponible pronto."
    });
  };

  const toggleItemSelected = (itemId: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) newSelection.delete(itemId);
    else newSelection.add(itemId);
    setSelectedItems(newSelection);
  };

  // --- HELPERS ---
  const getContentIcon = (type: string) => {
    const iconProps = { className: "w-5 h-5" };
    switch (type) {
      case "image": return <Image {...iconProps} />;
      case "video": return <Video {...iconProps} />;
      case "webpage": return <Globe {...iconProps} />;
      case "pdf": return <FileText {...iconProps} />;
      case "text": return <Type {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
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

  // Allow content to be used multiple times in different zones
  const currentLayout = playlistData?.layout || 'single_zone';
  const zones = LAYOUT_ZONES[currentLayout as keyof typeof LAYOUT_ZONES] || [];

  if (playlistsLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Header title="Playlists" subtitle="Gestión de listas de reproducción" />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header 
        title="Editor de Playlists" 
        subtitle="Crea y gestiona layouts y secuencias de contenido"
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
                <div>
                  <Label htmlFor="layout">Layout</Label>
                  <Select value={newPlaylist.layout} onValueChange={(value) => setNewPlaylist(prev => ({ ...prev, layout: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_zone">Pantalla Completa</SelectItem>
                      <SelectItem value="split_vertical">División Vertical</SelectItem>
                      <SelectItem value="split_horizontal">División Horizontal</SelectItem>
                      <SelectItem value="pip_bottom_right">Picture-in-Picture</SelectItem>
                    </SelectContent>
                  </Select>
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
      
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-6 gap-4 p-4 min-h-0">

        {/* COLUMNA 1: LISTA DE PLAYLISTS */}
        <Card className="xl:col-span-1 flex flex-col max-h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <List className="h-4 w-4" />
              Playlists ({playlists.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {playlists.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <List className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No hay playlists</p>
              </div>
            ) : (
              playlists.map((playlist: any) => (
                <div
                  key={playlist.id}
                  className={`p-2 border rounded-md cursor-pointer transition-all text-xs ${
                    selectedPlaylistId === playlist.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate text-sm">{playlist.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{playlist.totalItems || 0} items</span>
                        <span>{Math.floor((playlist.totalDuration || 0) / 60)}m</span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPlaylist(playlist);
                        }}
                        className="h-5 w-5 p-0"
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
                        className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
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

        {/* COLUMNAS 2-4: EDITOR VISUAL */}
        <div className="xl:col-span-4 flex flex-col gap-4 overflow-hidden">
          {selectedPlaylistId ? (
            <>
              {/* Controles de Layout */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Layout className="h-4 w-4" />
                        Layout: {playlistData?.name || 'Cargando...'}
                      </CardTitle>
                      <CardDescription className="text-xs">Selecciona la distribución de zonas</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPreviewModalOpen(true)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <ToggleGroup 
                    type="single" 
                    value={currentLayout} 
                    onValueChange={(val) => val && updateLayoutMutation.mutate(val)}
                    className="justify-start gap-1"
                  >
                    <ToggleGroupItem value="single_zone" aria-label="Pantalla completa" className="text-xs px-2 py-1">
                      <Layout className="h-3 w-3 mr-1"/>
                      Completa
                    </ToggleGroupItem>
                    <ToggleGroupItem value="split_vertical" aria-label="División vertical" className="text-xs px-2 py-1">
                      <SplitSquareVertical className="h-3 w-3 mr-1"/>
                      Vertical
                    </ToggleGroupItem>
                    <ToggleGroupItem value="split_horizontal" aria-label="División horizontal" className="text-xs px-2 py-1">
                      <SplitSquareHorizontal className="h-3 w-3 mr-1"/>
                      Horizontal
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pip_bottom_right" aria-label="Picture-in-Picture" className="text-xs px-2 py-1">
                      <PictureInPicture className="h-3 w-3 mr-1"/>
                      PiP
                    </ToggleGroupItem>
                  </ToggleGroup>
                </CardContent>
              </Card>

              {/* Editor de Zonas */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {playlistLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {selectedItems.size > 0 && (
                      <div className="p-3 bg-primary/10 rounded-md mb-4 flex items-center gap-3 sticky top-0 z-10 border border-primary/20">
                        <Checkbox 
                          checked={selectedItems.size > 0}
                          onCheckedChange={() => setSelectedItems(new Set())}
                        />
                        <p className="text-sm font-medium">{selectedItems.size} elementos seleccionados</p>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => bulkDeleteMutation.mutate([...selectedItems])}
                          disabled={bulkDeleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2"/> 
                          Eliminar
                        </Button>
                      </div>
                    )}
                    
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <div className={`grid gap-3 ${
                        currentLayout === 'split_vertical' ? 'grid-cols-2' : 
                        currentLayout === 'split_horizontal' ? 'grid-rows-2 h-96' : 
                        currentLayout === 'pip_bottom_right' ? 'grid-cols-3 grid-rows-2' :
                        'grid-cols-1'
                      }`}>
                        {zones.map((zone, zoneIndex) => (
                          <Droppable key={zone.id} droppableId={zone.id}>
                            {(provided, snapshot) => (
                              <Card className={`${
                                snapshot.isDraggingOver ? 'border-primary bg-primary/5' : ''
                              } ${
                                currentLayout === 'pip_bottom_right' && zone.id === 'main' ? 'col-span-3 row-span-1' :
                                currentLayout === 'pip_bottom_right' && zone.id === 'pip' ? 'col-span-1 row-span-1' :
                                ''
                              }`}>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-xs font-medium flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${zone.id === 'main' ? 'bg-blue-500' : zone.id === 'left' ? 'bg-green-500' : zone.id === 'right' ? 'bg-orange-500' : zone.id === 'top' ? 'bg-purple-500' : zone.id === 'bottom' ? 'bg-pink-500' : 'bg-red-500'}`}></div>
                                    {zone.title}
                                    <Badge variant="secondary" className="ml-auto text-xs px-1 py-0">
                                      {playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length || 0}
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent ref={provided.innerRef} {...provided.droppableProps} className="min-h-[120px] space-y-1">
                                  {playlistData?.items?.filter((item: any) => item.zone === zone.id)
                                    .sort((a: any, b: any) => a.order - b.order)
                                    .map((item: any, index: number) => {
                                      const IconComponent = getContentIcon(item.contentItem?.type || 'unknown');
                                      const iconColor = getFileColor(item.contentItem?.type || 'unknown');
                                      
                                      return (
                                        <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              className={`flex items-center gap-2 p-2 bg-background border rounded-md transition-all text-xs ${
                                                snapshot.isDragging ? 'shadow-lg bg-accent' : 'hover:bg-accent/50'
                                              }`}
                                            >
                                              <Checkbox 
                                                checked={selectedItems.has(item.id)} 
                                                onCheckedChange={() => toggleItemSelected(item.id)} 
                                                className="scale-75"
                                              />
                                              <div
                                                {...provided.dragHandleProps}
                                                className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground cursor-grab"
                                              >
                                                <GripVertical className="w-3 h-3" />
                                              </div>
                                              <div className="w-6 h-6 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                                {React.cloneElement(IconComponent, { className: `w-3 h-3 ${iconColor}` })}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-xs truncate">{item.contentItem?.title || 'Sin título'}</h4>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                                    {item.contentItem?.type || 'unknown'}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <Input
                                                  type="number"
                                                  value={item.customDuration || item.contentItem?.duration || 0}
                                                  onChange={(e) => {
                                                    const newDuration = parseInt(e.target.value) || 0;
                                                    if (newDuration > 0) {
                                                      updateItemDurationMutation.mutate({ 
                                                        itemId: item.id, 
                                                        duration: newDuration 
                                                      });
                                                    }
                                                  }}
                                                  className="w-12 text-xs h-6 px-1 text-center"
                                                  min="1"
                                                />
                                                <span className="text-xs text-muted-foreground">s</span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeItemMutation.mutate(item.id)}
                                                  disabled={removeItemMutation.isPending}
                                                  className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      );
                                    })}
                                  {provided.placeholder}
                                  {(!playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length) && (
                                    <div className="text-center py-4 text-muted-foreground">
                                      <Play className="h-6 w-6 mx-auto mb-1 opacity-20" />
                                      <p className="text-xs">Arrastra aquí</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </Droppable>
                        ))}
                      </div>
                    </DragDropContext>
                  </>
                )}
              </div>
            </>
          ) : (
            <Card className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <List className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p className="text-lg font-medium mb-2">Selecciona una playlist</p>
                <p className="text-sm">Elige una playlist para comenzar a editar su contenido y layout.</p>
              </div>
            </Card>
          )}
        </div>

        {/* COLUMNA 6: BIBLIOTECA DE CONTENIDO */}
        <Card className="xl:col-span-1 flex flex-col max-h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Biblioteca
            </CardTitle>
            <CardDescription className="text-xs">Haz clic para agregar a zona específica</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {allContent.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No hay contenido</p>
              </div>
            ) : (
              allContent.map((item: any) => {
                const IconComponent = getContentIcon(item.type);
                const iconColor = getFileColor(item.type);
                
                return (
                  <div
                    key={item.id}
                    className="group border rounded-lg transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2 p-2">
                      <div className="w-6 h-6 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        {React.cloneElement(IconComponent, { className: `w-3 h-3 ${iconColor}` })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-xs truncate">{item.title}</h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-xs px-1 py-0 h-3">
                            {item.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDuration(item.duration || 0)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Zone Selection Buttons */}
                    {selectedPlaylistId && (
                      <div className="border-t p-1 space-y-1">
                        {zones.map(zone => (
                          <Button
                            key={zone.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => addItemMutation.mutate({ contentItemId: item.id, zone: zone.id })}
                            disabled={addItemMutation.isPending}
                            className="w-full justify-start h-6 text-xs px-2"
                          >
                            <div className={`w-2 h-2 rounded-full mr-1 ${zone.id === 'main' ? 'bg-blue-500' : zone.id === 'left' ? 'bg-green-500' : zone.id === 'right' ? 'bg-orange-500' : zone.id === 'top' ? 'bg-purple-500' : zone.id === 'bottom' ? 'bg-pink-500' : 'bg-red-500'}`}></div>
                            {zone.title}
                          </Button>
                        ))}
                      </div>
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
          {selectedPlaylistId && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe 
                src={`/screen-player?playlistId=${selectedPlaylistId}&preview=true`} 
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
