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
  Eye, Clock, Play, Check
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
const LAYOUT_ZONES: Record<string, { id: string; title: string }[]> = {
  single_zone: [{ id: 'main', title: 'Contenido Principal' }],
  split_vertical: [{ id: 'left', title: 'Zona Izquierda' }, { id: 'right', title: 'Zona Derecha' }],
  split_horizontal: [{ id: 'top', title: 'Zona Superior' }, { id: 'bottom', title: 'Zona Inferior' }],
  pip_bottom_right: [{ id: 'main', title: 'Principal' }, { id: 'pip', title: 'Picture-in-Picture' }],
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
                        {playlist.layout === 'single_zone' ? 'Completa' :
                         playlist.layout === 'split_vertical' ? 'Vertical' :
                         playlist.layout === 'split_horizontal' ? 'Horizontal' :
                         'PiP'}
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
                <ToggleGroup 
                  type="single" 
                  value={currentLayout} 
                  onValueChange={(val) => val && updateLayoutMutation.mutate(val)}
                  className="justify-start gap-2 mt-2"
                >
                  <ToggleGroupItem value="single_zone" aria-label="Pantalla completa">
                    <Layout className="h-4 w-4 mr-2"/>
                    Completa
                  </ToggleGroupItem>
                  <ToggleGroupItem value="split_vertical" aria-label="División vertical">
                    <SplitSquareVertical className="h-4 w-4 mr-2"/>
                    Vertical
                  </ToggleGroupItem>
                  <ToggleGroupItem value="split_horizontal" aria-label="División horizontal">
                    <SplitSquareHorizontal className="h-4 w-4 mr-2"/>
                    Horizontal
                  </ToggleGroupItem>
                  <ToggleGroupItem value="pip_bottom_right" aria-label="Picture in picture">
                    <PictureInPicture className="h-4 w-4 mr-2"/>
                    PiP
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Zone Management */}
              <div className="flex-1 overflow-y-auto">
                <div className={`grid gap-4 ${
                  currentLayout === 'split_vertical' ? 'grid-cols-2' :
                  currentLayout === 'split_horizontal' ? 'grid-cols-1' :
                  currentLayout === 'pip_bottom_right' ? 'grid-cols-2' :
                  'grid-cols-1'
                }`}>
                  {zones.map(zone => (
                    <Card key={zone.id} className="flex flex-col">
                      <CardHeader className="pb-3 flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            {zone.title}
                            <Badge variant="secondary" className="text-xs">
                              {playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length || 0}
                            </Badge>
                          </CardTitle>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedZoneForContent(zone.id);
                                  setContentLibraryOpen(true);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Agregar contenido
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 overflow-hidden">
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {playlistData?.items
                            ?.filter((item: any) => item.zone === zone.id)
                            ?.sort((a: any, b: any) => a.order - b.order)
                            ?.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                <GripVertical className="w-3 h-3 text-gray-400 cursor-grab flex-shrink-0" />
                                <div className="w-6 h-6 bg-slate-300 rounded flex items-center justify-center flex-shrink-0">
                                  {getContentIcon(item.contentItem?.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate text-sm">{item.contentItem?.title || 'Sin título'}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <DurationInput
                                                itemId={item.id}
                                                initialDuration={item.customDuration || item.contentItem?.duration || 10}
                                                onDurationChange={(duration) => {
                                                  updateItemDurationMutation.mutate({
                                                    itemId: item.id,
                                                    duration: duration
                                                  });
                                                }}
                                              />
                                    <span className="text-xs text-muted-foreground">seg</span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                                  onClick={() => removeItemMutation.mutate(item.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          {(!playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length) && (
                            <div className="text-center py-6 text-sm text-gray-500">
                              Sin contenido en esta zona
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Content Library Modal */}
      <Dialog open={contentLibraryOpen} onOpenChange={setContentLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Biblioteca de Contenido</DialogTitle>
            <CardDescription>
              Selecciona el contenido para agregar a {zones.find(z => z.id === selectedZoneForContent)?.title}
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <Input
              placeholder="Buscar contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Content List */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
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
                          onChange={() => toggleContentSelection(item.id)}
                        />
                        <div className="w-8 h-8 bg-muted rounded-md flex items```python
-center justify-center">
                          {React.cloneElement(IconComponent, { className: `w-4 h-4 ${iconColor}` })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.category || "Sin categoría"}</p>
                        </div>
                        <Badge variant="outline">
                          {item.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(item.duration || 0)}
                        </span>
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
            </ScrollArea>

            <div className="flex items-center justify-between pt-4 border-t">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}