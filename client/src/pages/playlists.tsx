import React, { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, List, FileText, GripVertical, Trash2, Edit, Settings, Layout,
  SplitSquareHorizontal, SplitSquareVertical, PictureInPicture, Image, Video, Globe, Type,
  Eye, Clock, Play, Check,
  Shuffle,
  ScrollText,
  SidebarOpen,
  SidebarClose,
  Rows,
  Grid3X3
} from "lucide-react";

// Tipos para mayor claridad
type Playlist = any;
type PlaylistItem = any;
type ContentItem = any;

// Componente para input de duración con estado local
const DurationInput = ({ itemId, initialDuration, onDurationChange }: { 
  itemId: number; 
  initialDuration: number; 
  onDurationChange: (duration: number) => void;
}) => {
  const [value, setValue] = useState(initialDuration.toString());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setValue(initialDuration.toString());
    }
  }, [initialDuration, isEditing]);

  const handleSubmit = () => {
    let duration = parseInt(value) || 10;

    // Validar que el valor esté en un rango razonable
    if (duration < 1) duration = 1;
    if (duration > 86400) duration = 86400; // Máximo 24 horas

    setValue(duration.toString());
    setIsEditing(false);

    if (duration !== initialDuration) {
      onDurationChange(duration);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setValue(initialDuration.toString());
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Solo permitir números y valores vacíos temporalmente
    if (newValue === '' || /^\d+$/.test(newValue)) {
      setValue(newValue);
    }
  };

  return (
    <Input
      type="number"
      value={value}
      onChange={handleChange}
      onFocus={() => setIsEditing(true)}
      onBlur={handleSubmit}
      onKeyDown={handleKeyDown}
      className="w-16 h-6 text-xs text-center"
      min="1"
      max="86400"
      placeholder="10"
    />
  );
};

// Definición de las zonas para cada layout
const LAYOUT_ZONES = {
  single_zone: [{ id: 'main', title: 'Contenido Principal' }],
  split_vertical: [{ id: 'left', title: 'Zona Izquierda' }, { id: 'right', title: 'Zona Derecha' }],
  split_horizontal: [{ id: 'top', title: 'Zona Superior' }, { id: 'bottom', title: 'Zona Inferior' }],
  pip_bottom_right: [{ id: 'main', title: 'Principal' }, { id: 'pip', title: 'Picture-in-Picture' }],
  carousel: [{ id: 'main', title: 'Carrusel' }],
  web_scroll: [{ id: 'main', title: 'Scroll Web' }],
  grid_2x2: [
    { id: 'top_left', title: 'Superior Izquierda' },
    { id: 'top_right', title: 'Superior Derecha' },
    { id: 'bottom_left', title: 'Inferior Izquierda' },
    { id: 'bottom_right', title: 'Inferior Derecha' }
  ],
  grid_3x3: [
    { id: 'grid_1', title: 'Celda 1' },
    { id: 'grid_2', title: 'Celda 2' },
    { id: 'grid_3', title: 'Celda 3' },
    { id: 'grid_4', title: 'Celda 4' },
    { id: 'grid_5', title: 'Celda 5' },
    { id: 'grid_6', title: 'Celda 6' },
    { id: 'grid_7', title: 'Celda 7' },
    { id: 'grid_8', title: 'Celda 8' },
    { id: 'grid_9', title: 'Celda 9' }
  ],
  sidebar_left: [
    { id: 'sidebar', title: 'Barra Lateral' },
    { id: 'main', title: 'Contenido Principal' }
  ],
  sidebar_right: [
    { id: 'main', title: 'Contenido Principal' },
    { id: 'sidebar', title: 'Barra Lateral' }
  ],
  header_footer: [
    { id: 'header', title: 'Cabecera' },
    { id: 'main', title: 'Contenido Principal' },
    { id: 'footer', title: 'Pie de Página' }
  ],
  triple_vertical: [
    { id: 'left', title: 'Izquierda' },
    { id: 'center', title: 'Centro' },
    { id: 'right', title: 'Derecha' }
  ],
  triple_horizontal: [
    { id: 'top', title: 'Superior' },
    { id: 'middle', title: 'Medio' },
    { id: 'bottom', title: 'Inferior' }
  ],
  custom_layout: [] // Will be populated from custom config
};

export default function Playlists() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [contentLibraryOpen, setContentLibraryOpen] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: "", description: "", layout: "single_zone" });
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);
  const [selectedPlaylistForLayout, setSelectedPlaylistForLayout] = useState<any>(null);
  const [selectedZoneForContent, setSelectedZoneForContent] = useState<string>("");
  const [selectedContent, setSelectedContent] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
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

  const { data: playlistData, refetch: refetchPlaylist } = useQuery({
    queryKey: ["/api/playlists", selectedPlaylistForLayout?.id],
    enabled: !!selectedPlaylistForLayout?.id,
    queryFn: async () => {
      if (!selectedPlaylistForLayout?.id) return null;
      try {
        const response = await apiRequest(`/api/playlists/${selectedPlaylistForLayout.id}`);
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
      const response = await apiRequest(`/api/playlists/${selectedPlaylistForLayout.id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistForLayout.id] });
      refetchPlaylist();
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

  const addMultipleItemsMutation = useMutation({
    mutationFn: async ({ contentIds, zone }: { contentIds: number[], zone: string }) => {
      const currentItems = playlistData?.items?.filter((item: any) => item.zone === zone) || [];
      let order = currentItems.length;

      const promises = contentIds.map(async (contentItemId) => {
        const response = await apiRequest(`/api/playlists/${selectedPlaylistForLayout.id}/items`, {
          method: "POST",
          body: JSON.stringify({ 
            contentItemId, 
            order: order++,
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
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      refetchPlaylist();
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setContentLibraryOpen(false);
      setSelectedContent(new Set());
      toast({
        title: "Contenido agregado",
        description: `Se agregaron ${selectedContent.size} elementos a la playlist.`,
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

  const moveItemMutation = useMutation({
    mutationFn: async ({ itemId, newZone, newOrder }: { itemId: number, newZone: string, newOrder: number }) => {
      const response = await apiRequest(`/api/playlist-items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ zone: newZone, order: newOrder }),
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
        description: error.message || "No se pudo mover el elemento.",
        variant: "destructive",
      });
    },
  });

  const updateItemDurationMutation = useMutation({
    mutationFn: async ({ itemId, duration }: { itemId: number, duration: number }) => {
      // Validar la duración antes de enviar
      if (duration < 1 || duration > 86400) {
        throw new Error("La duración debe estar entre 1 y 86400 segundos");
      }

      const response = await apiRequest(`/api/playlist-items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ customDuration: duration }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: () => {
      refetchPlaylist();
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Duración actualizada",
        description: "La duración del elemento se ha actualizado correctamente.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating duration:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la duración.",
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

  const handleOpenLayoutEditor = (playlist: any) => {
    setSelectedPlaylistForLayout(playlist);
    setLayoutModalOpen(true);
  };

  const handleOpenContentLibrary = (zone: string) => {
    setSelectedZoneForContent(zone);
    setSelectedContent(new Set());
    setContentLibraryOpen(true);
  };

  const handleAddSelectedContent = () => {
    if (selectedContent.size > 0) {
      addMultipleItemsMutation.mutate({ 
        contentIds: Array.from(selectedContent), 
        zone: selectedZoneForContent 
      });
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const itemId = parseInt(draggableId);
    const newZone = destination.droppableId;
    const newOrder = destination.index;

    if (source.droppableId !== destination.droppableId || source.index !== destination.index) {
      moveItemMutation.mutate({ itemId, newZone, newOrder });
    }
  };

  const toggleContentSelection = (contentId: number) => {
    const newSelection = new Set(selectedContent);
    if (newSelection.has(contentId)) {
      newSelection.delete(contentId);
    } else {
      newSelection.add(contentId);
    }
    setSelectedContent(newSelection);
  };

  // --- HELPERS ---
  const getContentIcon = (type: string) => {
    const iconProps = { className: "w-4 h-4" };
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

  const filteredContent = allContent.filter((item: any) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        title="Gestión de Playlists" 
        subtitle="Crea y administra tus listas de reproducción"
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
                      <SelectItem value="carousel">Carrusel</SelectItem>
                      <SelectItem value="web_scroll">Scroll Web</SelectItem>
                      <SelectItem value="grid_2x2">Grilla 2x2</SelectItem>
                      <SelectItem value="grid_3x3">Grilla 3x3</SelectItem>
                      <SelectItem value="sidebar_left">Barra Lateral Izquierda</SelectItem>
                      <SelectItem value="sidebar_right">Barra Lateral Derecha</SelectItem>
                      <SelectItem value="header_footer">Cabecera y Pie</SelectItem>
                      <SelectItem value="triple_vertical">Triple Vertical</SelectItem>
                      <SelectItem value="triple_horizontal">Triple Horizontal</SelectItem>
                      <SelectItem value="custom_layout">Layout Personalizado</SelectItem>
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

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {playlists.length === 0 ? (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <List className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p className="text-lg font-medium mb-2">No hay playlists</p>
                <p className="text-sm">Crea tu primera playlist para comenzar.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlists.map((playlist: any) => (
                <Card key={playlist.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{playlist.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {playlist.description || "Sin descripción"}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPlaylist(playlist)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePlaylist(playlist.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{playlist.totalItems || 0} elementos</span>
                      <span>{Math.floor((playlist.totalDuration || 0) / 60)} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {playlist.layout === "single_zone" ? "Completa" :
                         playlist.layout === "split_vertical" ? "Vertical" :
                         playlist.layout === "split_horizontal" ? "Horizontal" :
                         playlist.layout === "pip_bottom_right" ? "PiP" :
                         playlist.layout === "carousel" ? "Carrusel" :
                         playlist.layout === "web_scroll" ? "Scroll" :
                         playlist.layout === "grid_2x2" ? "Grilla 2x2" :
                         playlist.layout === "grid_3x3" ? "Grilla 3x3" :
                         playlist.layout === "sidebar_left" ? "Sidebar Izq" :
                         playlist.layout === "sidebar_right" ? "Sidebar Der" :
                         playlist.layout === "header_footer" ? "Header/Footer" :
                         playlist.layout === "triple_vertical" ? "Triple V" :
                         playlist.layout === "triple_horizontal" ? "Triple H" :
                         playlist.layout === "custom_layout" ? "Personalizado" : 
                         playlist.layout}
                      </Badge>
                      {playlist.isActive && (
                        <Badge variant="default" className="text-xs">
                          Activa
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleOpenLayoutEditor(playlist)}
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Editar Layout
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
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

      {/* Layout Editor Modal */}
      <Dialog open={layoutModalOpen} onOpenChange={setLayoutModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Editar Layout - {selectedPlaylistForLayout?.name}</DialogTitle>
          </DialogHeader>

          {selectedPlaylistForLayout && (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* Layout Selection */}
              <div className="flex-shrink-0">
                <Label className="text-sm font-medium">Tipo de Layout</Label>
                <div className="flex gap-4 items-center mt-2">
                  <Select value={currentLayout} onValueChange={(val) => val && updateLayoutMutation.mutate(val)}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Selecciona un layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_zone">
                        <div className="flex items-center gap-2">
                          <Layout className="h-4 w-4" />
                          Pantalla Completa
                        </div>
                      </SelectItem>
                      <SelectItem value="split_vertical">
                        <div className="flex items-center gap-2">
                          <SplitSquareVertical className="h-4 w-4" />
                          División Vertical
                        </div>
                      </SelectItem>
                      <SelectItem value="split_horizontal">
                        <div className="flex items-center gap-2">
                          <SplitSquareHorizontal className="h-4 w-4" />
                          División Horizontal
                        </div>
                      </SelectItem>
                      <SelectItem value="pip_bottom_right">
                        <div className="flex items-center gap-2">
                          <PictureInPicture className="h-4 w-4" />
                          Picture-in-Picture
                        </div>
                      </SelectItem>
                      <SelectItem value="carousel">
                        <div className="flex items-center gap-2">
                          <Shuffle className="h-4 w-4" />
                          Carrusel
                        </div>
                      </SelectItem>
                      <SelectItem value="web_scroll">
                        <div className="flex items-center gap-2">
                          <ScrollText className="h-4 w-4" />
                          Scroll Web
                        </div>
                      </SelectItem>
                      <SelectItem value="grid_2x2">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="h-4 w-4" />
                          Grilla 2x2
                        </div>
                      </SelectItem>
                      <SelectItem value="grid_3x3">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="h-4 w-4" />
                          Grilla 3x3
                        </div>
                      </SelectItem>
                      <SelectItem value="sidebar_left">
                        <div className="flex items-center gap-2">
                          <SidebarOpen className="h-4 w-4" />
                          Barra Lateral Izquierda
                        </div>
                      </SelectItem>
                      <SelectItem value="sidebar_right">
                        <div className="flex items-center gap-2">
                          <SidebarClose className="h-4 w-4" />
                          Barra Lateral Derecha
                        </div>
                      </SelectItem>
                      <SelectItem value="header_footer">
                        <div className="flex items-center gap-2">
                          <Rows className="h-4 w-4" />
                          Cabecera y Pie
                        </div>
                      </SelectItem>
                      <SelectItem value="triple_vertical">
                        <div className="flex items-center gap-2">
                          <SplitSquareVertical className="h-4 w-4" />
                          Triple Vertical
                        </div>
                      </SelectItem>
                      <SelectItem value="triple_horizontal">
                        <div className="flex items-center gap-2">
                          <SplitSquareHorizontal className="h-4 w-4" />
                          Triple Horizontal
                        </div>
                      </SelectItem>
                      <SelectItem value="custom_layout">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Layout Personalizado
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {currentLayout === 'custom_layout' && (
                    <Button 
                      onClick={() => {
                        // TODO: Implementar editor de layout personalizado
                        toast({
                          title: "Funcionalidad en desarrollo",
                          description: "El editor de layout personalizado estará disponible pronto.",
                        });
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Personalizar
                    </Button>
                  )}
                </div>
              </div>

              {/* Visual Layout Preview */}
              <div className="flex-1 flex gap-6">
                {/* Layout Visual Preview */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-3">Vista Previa del Layout</h3>
                  <div className="bg-slate-100 rounded-lg p-4 relative" style={{ aspectRatio: '16/9', minHeight: '300px' }}>
                    {currentLayout === 'single_zone' && (
                      <div className="w-full h-full border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                           onClick={() => handleOpenContentLibrary('main')}>
                        <Layout className="w-8 h-8 text-blue-600 mb-2" />
                        <span className="text-sm font-medium text-blue-700">Zona Principal</span>
                        <span className="text-xs text-blue-600 mt-1">
                          {playlistData?.items?.filter((item: any) => item.zone === 'main')?.length || 0} elementos
                        </span>
                        <Button variant="ghost" size="sm" className="mt-2 text-blue-600 hover:bg-blue-200">
                          <Plus className="w-3 h-3 mr-1" />
                          Agregar contenido
                        </Button>
                      </div>
                    )}

                    {currentLayout === 'split_vertical' && (
                      <div className="w-full h-full flex gap-2">
                        {[{id: 'left', title: 'Zona Izquierda'}, {id: 'right', title: 'Zona Derecha'}].map((zone, index) => (
                          <div key={zone.id} className="flex-1 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                               onClick={() => handleOpenContentLibrary(zone.id)}>
                            <SplitSquareVertical className="w-6 h-6 text-blue-600 mb-2" />
                            <span className="text-xs font-medium text-blue-700">{zone.title}</span>
                            <span className="text-xs text-blue-600 mt-1">
                              {playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length || 0} elementos
                            </span>
                            <Button variant="ghost" size="sm" className="mt-2 text-blue-600 hover:bg-blue-200">
                              <Plus className="w-3 h-3 mr-1" />
                              Agregar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentLayout === 'split_horizontal' && (
                      <div className="w-full h-full flex flex-col gap-2">
                        {[{id: 'top', title: 'Zona Superior'}, {id: 'bottom', title: 'Zona Inferior'}].map((zone) => (
                          <div key={zone.id} className="flex-1 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                               onClick={() => handleOpenContentLibrary(zone.id)}>
                            <SplitSquareHorizontal className="w-6 h-6 text-blue-600 mb-2" />
                            <span className="text-xs font-medium text-blue-700">{zone.title}</span>
                            <span className="text-xs text-blue-600 mt-1">
                              {playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length || 0} elementos
                            </span>
                            <Button variant="ghost" size="sm" className="mt-2 text-blue-600 hover:bg-blue-200">
                              <Plus className="w-3 h-3 mr-1" />
                              Agregar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentLayout === 'grid_2x2' && (
                      <div className="w-full h-full grid grid-cols-2 gap-2">
                        {[
                          {id: 'top_left', title: 'Superior Izq.'},
                          {id: 'top_right', title: 'Superior Der.'},
                          {id: 'bottom_left', title: 'Inferior Izq.'},
                          {id: 'bottom_right', title: 'Inferior Der.'}
                        ].map((zone) => (
                          <div key={zone.id} className="border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                               onClick={() => handleOpenContentLibrary(zone.id)}>
                            <Grid3X3 className="w-5 h-5 text-blue-600 mb-1" />
                            <span className="text-xs font-medium text-blue-700">{zone.title}</span>
                            <span className="text-xs text-blue-600 mt-1">
                              {playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length || 0}
                            </span>
                            <Button variant="ghost" size="sm" className="mt-1 text-blue-600 hover:bg-blue-200 text-xs px-2 py-1">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentLayout === 'grid_3x3' && (
                      <div className="w-full h-full grid grid-cols-3 gap-1">
                        {Array.from({length: 9}, (_, i) => ({
                          id: `grid_${i + 1}`,
                          title: `Celda ${i + 1}`
                        })).map((zone) => (
                          <div key={zone.id} className="border-2 border-dashed border-blue-400 rounded bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer text-center p-1"
                               onClick={() => handleOpenContentLibrary(zone.id)}>
                            <Grid3X3 className="w-4 h-4 text-blue-600 mb-1" />
                            <span className="text-xs font-medium text-blue-700">{zone.title}</span>
                            <span className="text-xs text-blue-600">
                              {playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add more layout visualizations as needed */}
                    {!['single_zone', 'split_vertical', 'split_horizontal', 'grid_2x2', 'grid_3x3'].includes(currentLayout) && (
                      <div className="w-full h-full border-2 border-dashed border-gray-400 rounded-lg bg-gray-50 flex flex-col items-center justify-center">
                        <Settings className="w-8 h-8 text-gray-600 mb-2" />
                        <span className="text-sm font-medium text-gray-700">Layout: {currentLayout}</span>
                        <span className="text-xs text-gray-600 mt-1">Vista previa no disponible</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Zone Details Panel */}
                <div className="w-80">
                  <h3 className="text-sm font-medium mb-3">Contenido por Zona</h3>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {zones.map(zone => {
                        const zoneItems = playlistData?.items?.filter((item: any) => item.zone === zone.id) || [];
                        return (
                          <Card key={zone.id} className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm font-medium">{zone.title}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {zoneItems.length}
                                </Badge>
                              </div>
                            </div>
                            
                            {zoneItems.length > 0 ? (
                              <div className="space-y-2">
                                {zoneItems.sort((a: any, b: any) => a.order - b.order).map((item: any) => (
                                  <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                                    <div className="w-4 h-4 bg-slate-300 rounded flex items-center justify-center flex-shrink-0">
                                      {getContentIcon(item.contentItem?.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{item.contentItem?.title || 'Sin título'}</div>
                                      <div className="text-gray-500">{item.customDuration || item.contentItem?.duration || 10}s</div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 p-1 h-auto"
                                      onClick={() => removeItemMutation.mutate(item.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-xs text-gray-500 border-2 border-dashed border-gray-200 rounded">
                                Sin contenido
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Content Library Modal */}
      <Dialog open={contentLibraryOpen} onOpenChange={setContentLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">

          {/* 1. ENCABEZADO: Siempre visible arriba */}
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
            <DialogTitle>Biblioteca de Contenido</DialogTitle>
            <CardDescription>
              Selecciona el contenido para agregar a {zones.find(z => z.id === selectedZoneForContent)?.title || 'la zona seleccionada'}
            </CardDescription>
          </DialogHeader>

          {/* 2. BUSCADOR: Siempre visible debajo del encabezado */}
          <div className="flex-shrink-0 px-6 pt-4 pb-4">
            <Input
              placeholder="Buscar contenido por título o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 3. LISTA DE CONTENIDO: Esta es la única parte que crece y se desplaza */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-6 pt-0 space-y-2">
              {filteredContent.map((item: any) => {
                const IconComponent = getContentIcon(item.type);
                const iconColor = getFileColor(item.type);
                const isSelected = selectedContent.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleContentSelection(item.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleContentSelection(item.id)}
                      />
                      <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                        {React.cloneElement(IconComponent, { className: `w-4 h-4 ${iconColor}` })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.category || "Sin categoría"}</p>
                      </div>
                      <Badge variant="outline">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {filteredContent.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No se encontró contenido</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. BOTONES DE ACCIÓN: Siempre fijos en la parte inferior */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-t bg-background">
            <p className="text-sm text-muted-foreground">
              {selectedContent.size} elemento(s) seleccionado(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setContentLibraryOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAddSelectedContent}
                disabled={selectedContent.size === 0 || addMultipleItemsMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                {addMultipleItemsMutation.isPending ? "Agregando..." : "Agregar contenido"}
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}