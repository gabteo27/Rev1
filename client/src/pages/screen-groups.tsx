
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Screen, Playlist, ScreenGroup } from "@shared/schema";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Users,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Settings,
  Monitor
} from "lucide-react";

const initialGroupForm = {
  name: "",
  description: "",
  screenIds: [] as number[],
  playlistId: null as number | null,
  syncEnabled: true
};

export default function ScreenGroups() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ScreenGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState(initialGroupForm);

  const { toast } = useToast();

  const { data: groups = [], isLoading } = useQuery<ScreenGroup[]>({ 
    queryKey: ["/api/screen-groups"], 
    retry: false 
  });
  
  const { data: screens = [] } = useQuery<Screen[]>({ 
    queryKey: ["/api/screens"], 
    retry: false 
  });
  
  const { data: playlists = [] } = useQuery<Playlist[]>({ 
    queryKey: ["/api/playlists"], 
    retry: false 
  });

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: (data: typeof groupFormData) => 
      apiRequest("/api/screen-groups", { method: "POST", body: JSON.stringify(data) }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Grupo creado exitosamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/screen-groups"] });
      setIsCreateModalOpen(false);
      setGroupFormData(initialGroupForm);
    },
    onError: (error: any) => toast({ 
      title: "Error", 
      description: error.message || "No se pudo crear el grupo", 
      variant: "destructive" 
    })
  });

  const updateGroupMutation = useMutation({
    mutationFn: (group: ScreenGroup) => 
      apiRequest(`/api/screen-groups/${group.id}`, { method: 'PUT', body: JSON.stringify(group) }),
    onSuccess: () => {
      toast({ title: 'Grupo actualizado correctamente' });
      queryClient.invalidateQueries({ queryKey: ['/api/screen-groups'] });
      setEditingGroup(null);
    },
    onError: (error: any) => toast({ 
      title: 'Error', 
      description: error.message || "No se pudo actualizar el grupo", 
      variant: 'destructive' 
    })
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/screen-groups/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Grupo eliminado" });
      queryClient.invalidateQueries({ queryKey: ["/api/screen-groups"] });
    },
    onError: (error: any) => toast({ 
      title: "Error", 
      description: error.message || "No se pudo eliminar el grupo", 
      variant: "destructive" 
    })
  });

  const playGroupMutation = useMutation({
    mutationFn: ({ groupId, action }: { groupId: number, action: 'play' | 'pause' }) => 
      apiRequest(`/api/screen-groups/${groupId}/${action}`, { method: "POST" }),
    onSuccess: (_, { action }) => {
      toast({ title: `Grupo ${action === 'play' ? 'reproduciendo' : 'pausado'}` });
    },
    onError: (error: any) => toast({ 
      title: "Error", 
      description: error.message || "No se pudo ejecutar la acción", 
      variant: "destructive" 
    })
  });

  // Form handlers
  const handleFormChange = (field: string, value: any) => {
    setGroupFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleScreenSelection = (screenId: number, checked: boolean) => {
    setGroupFormData(prev => ({
      ...prev,
      screenIds: checked 
        ? [...prev.screenIds, screenId]
        : prev.screenIds.filter(id => id !== screenId)
    }));
  };

  const handleCreateSubmit = () => {
    if (!groupFormData.name.trim()) {
      toast({ title: "Error", description: "El nombre del grupo es obligatorio", variant: "destructive" });
      return;
    }

    if (groupFormData.screenIds.length === 0) {
      toast({ title: "Error", description: "Debe seleccionar al menos una pantalla", variant: "destructive" });
      return;
    }

    createGroupMutation.mutate(groupFormData);
  };

  const handleEditGroup = (group: ScreenGroup) => {
    setEditingGroup(group);
  };

  const getScreensInGroup = (screenIds: number[] = []) => {
    return screens.filter(screen => screenIds.includes(screen.id));
  };

  const getPlaylistName = (playlistId: number | null) => {
    return playlists.find(p => p.id === playlistId)?.name || "Sin playlist";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Grupos de Pantallas" subtitle="Gestiona grupos para reproducción sincronizada" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando grupos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Grupos de Pantallas"
        subtitle="Gestiona grupos para reproducción sincronizada"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Nuevo Grupo
          </Button>
        }
      />

      {/* Modal para crear grupo */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nombre del Grupo *</Label>
              <Input 
                id="name" 
                value={groupFormData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Ej: Pantallas del Lobby" 
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description"
                value={groupFormData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Descripción del grupo..."
              />
            </div>
            <div>
              <Label htmlFor="playlist">Playlist Asignada</Label>
              <Select 
                value={groupFormData.playlistId?.toString() || 'none'} 
                onValueChange={(value) => handleFormChange('playlistId', value === 'none' ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar playlist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin playlist</SelectItem>
                  {playlists.map((playlist) => (
                    <SelectItem key={playlist.id} value={playlist.id.toString()}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pantallas del Grupo *</Label>
              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="space-y-2">
                  {screens.map((screen) => (
                    <div key={screen.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`screen-${screen.id}`}
                        checked={groupFormData.screenIds.includes(screen.id)}
                        onCheckedChange={(checked) => handleScreenSelection(screen.id, !!checked)}
                      />
                      <Label htmlFor={`screen-${screen.id}`} className="flex-1">
                        <div className="flex items-center justify-between">
                          <span>{screen.name}</span>
                          <span className="text-sm text-slate-500">{screen.location}</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="syncEnabled"
                checked={groupFormData.syncEnabled}
                onCheckedChange={(checked) => handleFormChange('syncEnabled', !!checked)}
              />
              <Label htmlFor="syncEnabled">Reproducción sincronizada</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending ? "Creando..." : "Crear Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para editar grupo */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Nombre</Label>
                <Input 
                  id="edit-name" 
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea 
                  id="edit-description"
                  value={editingGroup.description || ''}
                  onChange={(e) => setEditingGroup({...editingGroup, description: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-playlist">Playlist Asignada</Label>
                <Select 
                  value={editingGroup.playlistId?.toString() || 'none'} 
                  onValueChange={(value) => setEditingGroup({
                    ...editingGroup, 
                    playlistId: value === 'none' ? null : parseInt(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin playlist</SelectItem>
                    {playlists.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => editingGroup && updateGroupMutation.mutate(editingGroup)} 
              disabled={updateGroupMutation.isPending}
            >
              {updateGroupMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista de grupos */}
      <div className="flex-1 px-4 sm:px-6 py-6 overflow-auto">
        {groups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No hay grupos</h3>
              <p className="text-slate-500 mb-4">
                Crea tu primer grupo de pantallas para reproducción sincronizada
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Grupo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {groups.map((group) => {
              const groupScreens = getScreensInGroup(group.screenIds);
              return (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        {group.description && (
                          <p className="text-sm text-slate-600 mt-1">{group.description}</p>
                        )}
                      </div>
                      <Badge variant={group.isActive ? "default" : "secondary"}>
                        {group.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Pantallas ({groupScreens.length})</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {groupScreens.map((screen) => (
                          <Badge key={screen.id} variant="outline" className="text-xs">
                            <Monitor className="w-3 h-3 mr-1" />
                            {screen.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Playlist</Label>
                      <p className="text-sm text-slate-600">{getPlaylistName(group.playlistId)}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => playGroupMutation.mutate({ groupId: group.id, action: 'play' })}
                          disabled={playGroupMutation.isPending}
                          title="Reproducir"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => playGroupMutation.mutate({ groupId: group.id, action: 'pause' })}
                          disabled={playGroupMutation.isPending}
                          title="Pausar"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleEditGroup(group)}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-500 hover:text-red-600" 
                        onClick={() => deleteGroupMutation.mutate(group.id)}
                        disabled={deleteGroupMutation.isPending}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
