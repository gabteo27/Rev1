
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { wsManager } from "@/lib/websocket";

import { useToast } from "@/hooks/use-toast";
import type { Screen, Playlist } from "@shared/schema";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Tv,
  Plus,
  Trash2,
  Monitor,
  Edit,
  Eye,
  EyeOff,
  Users,
  Wifi,
  WifiOff,
  Activity
} from "lucide-react";
import { ScreenPreview } from "@/components/screen/ScreenPreview";
import ScreenGroups from "./screen-groups";

const initialPairFormState = { pairingCode: "", name: "", location: "", playlistId: "" };

export default function Screens() {
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [livePreviewScreenId, setLivePreviewScreenId] = useState<number | null>(null);
  const [pairFormData, setPairFormData] = useState(initialPairFormState);
  const [visiblePreviews, setVisiblePreviews] = useState<Record<number, boolean>>({});
  const [screenStatuses, setScreenStatuses] = useState<Record<number, { isOnline: boolean; lastSeen?: string }>>({});

  const { toast } = useToast();

  const { data: screens = [], isLoading } = useQuery<Screen[]>({ 
    queryKey: ["/api/screens"], 
    retry: false,
    refetchInterval: 120000, // Reduce to every 2 minutes
    staleTime: 90000, // Consider data fresh for 90 seconds
    refetchOnWindowFocus: false // Don't refetch on window focus
  });
  
  const { data: playlists = [] } = useQuery<Playlist[]>({ 
    queryKey: ["/api/playlists"], 
    retry: false 
  });

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];

    // Initialize screen statuses
    if (screens.length > 0) {
      const initialStatuses: Record<number, { isOnline: boolean; lastSeen?: string }> = {};
      screens.forEach(screen => {
        initialStatuses[screen.id] = {
          isOnline: screen.isOnline || false,
          lastSeen: screen.lastSeen ? new Date(screen.lastSeen).toISOString() : undefined
        };
      });
      setScreenStatuses(initialStatuses);
    }

    // Wait for WebSocket connection
    const setupSubscriptions = () => {
      if (!wsManager.isConnected()) {
        setTimeout(setupSubscriptions, 1000);
        return;
      }

      // Subscribe to screen deletion
      unsubscribeFunctions.push(
        wsManager.subscribe('screen-deleted', (data) => {
          console.log('Screen deleted via WebSocket:', data);
          toast({
            title: "Pantalla Eliminada",
            description: `La pantalla ha sido eliminada`,
            variant: "destructive"
          });
          queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
        })
      );

      // Subscribe to screen status changes (heartbeat updates)
      unsubscribeFunctions.push(
        wsManager.subscribe('screen-status-changed', (data) => {
          console.log('Screen status changed:', data);
          
          setScreenStatuses(prev => ({
            ...prev,
            [data.screenId]: {
              isOnline: data.isOnline,
              lastSeen: data.lastSeen || new Date().toISOString()
            }
          }));
          
          const statusText = data.isOnline ? 'se conectó' : 'se desconectó';
          toast({
            title: `Pantalla ${statusText}`,
            description: `${data.screenName || 'Una pantalla'} ${statusText}`,
            variant: data.isOnline ? "default" : "destructive"
          });
        })
      );

      // Subscribe to screen updates
      unsubscribeFunctions.push(
        wsManager.subscribe('screen-update', (data) => {
          console.log('Screen updated via WebSocket:', data);
          queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
        })
      );
    };

    setupSubscriptions();

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from WebSocket event:', error);
        }
      });
    };
  }, [toast, screens]);

  // --- MUTACIONES ---

  const completePairingMutation = useMutation({
    mutationFn: (data: typeof pairFormData) => {
      const payload = { ...data, playlistId: data.playlistId && data.playlistId !== 'none' ? parseInt(data.playlistId, 10) : null };
      return apiRequest("/api/screens/complete-pairing", { method: "POST", body: JSON.stringify(payload) }).then(res => res.json());
    },
    onSuccess: (data) => {
      toast({ title: "¡Éxito!", description: `La pantalla "${data.screen.name}" ha sido emparejada.` });
      queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
      setIsPairModalOpen(false);
      setPairFormData(initialPairFormState);
    },
    onError: (error: any) => toast({ title: "Error de Emparejamiento", description: error.message, variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: (screen: Screen) => apiRequest(`/api/screens/${screen.id}`, { method: 'PUT', body: JSON.stringify(screen) }),
    onSuccess: () => {
        toast({ title: 'Pantalla Actualizada', description: 'Los cambios se han guardado correctamente.' });
        queryClient.invalidateQueries({ queryKey: ['/api/screens'] });
        setEditingScreen(null);
    },
    onError: (error: any) => toast({ title: 'Error al Actualizar', description: error.message, variant: 'destructive' })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/screens/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (_, deletedScreenId) => {
      toast({ title: "Pantalla eliminada", description: "La pantalla ha sido eliminada correctamente" });
      
      // Update local state immediately for better UX
      setScreenStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[deletedScreenId];
        return newStatuses;
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "No se pudo eliminar la pantalla.", variant: "destructive" })
  });

  // --- MANEJADORES DE FORMULARIOS ---

  const handlePairFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPairFormData(prev => ({ ...prev, [id]: value }));
  };

  const handlePairPlaylistSelect = (value: string) => {
    setPairFormData(prev => ({ ...prev, playlistId: value }));
  };

  const handlePairSubmit = () => {
    if (!pairFormData.pairingCode.trim() || !pairFormData.name.trim()) {
      toast({ title: "Error", description: "El código y el nombre son obligatorios.", variant: "destructive" });
      return;
    }
    completePairingMutation.mutate(pairFormData);
  };

  // --- MANEJADORES DE PANTALLA ---
  const handleEditScreen = (screen: Screen) => {
    setEditingScreen(screen);
  };

  const togglePreview = (id: number) => {
    setVisiblePreviews(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // --- FUNCIONES AUXILIARES ---

  const formatDate = (date: Date | null | string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("es-ES", { 
      year: "numeric", 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const getStatusBadge = (screenId: number, fallbackOnline?: boolean, fallbackLastSeen?: string | Date) => {
    const status = screenStatuses[screenId];
    const isOnline = status?.isOnline ?? fallbackOnline ?? false;
    const lastSeen = status?.lastSeen ?? fallbackLastSeen;

    if (isOnline) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1">
          <Wifi className="w-3 h-3" />
          En línea
        </Badge>
      );
    }
    
    if (lastSeen) {
      const diffInHours = (new Date().getTime() - new Date(lastSeen).getTime()) / 36e5;
      if (diffInHours < 1) {
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <WifiOff className="w-3 h-3" />
            Desconectada
          </Badge>
        );
      }
      if (diffInHours < 24) {
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Inactiva
          </Badge>
        );
      }
    }
    
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <WifiOff className="w-3 h-3" />
        Desconocido
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Pantallas" subtitle="Gestiona tus dispositivos de visualización" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando pantallas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Pantallas"
        subtitle="Gestiona tus dispositivos de visualización y grupos"
      />

      {/* MODAL PARA EMPAREJAR PANTALLA */}
      <Dialog open={isPairModalOpen} onOpenChange={setIsPairModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Emparejar Nueva Pantalla</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="pairingCode">Código de Emparejamiento *</Label>
              <Input id="pairingCode" value={pairFormData.pairingCode} onChange={handlePairFormChange} placeholder="123456" />
            </div>
            <div>
              <Label htmlFor="name">Nombre de la Pantalla *</Label>
              <Input id="name" value={pairFormData.name} onChange={handlePairFormChange} placeholder="Ej: Pantalla Lobby" />
            </div>
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input id="location" value={pairFormData.location} onChange={handlePairFormChange} placeholder="Ej: Recepción" />
            </div>
            <div>
              <Label htmlFor="playlist">Playlist Asignada</Label>
              <Select value={pairFormData.playlistId} onValueChange={handlePairPlaylistSelect}>
                <SelectTrigger><SelectValue placeholder="Seleccionar playlist (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin playlist</SelectItem>
                  {playlists.map((playlist) => <SelectItem key={playlist.id} value={playlist.id.toString()}>{playlist.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPairModalOpen(false)}>Cancelar</Button>
            <Button onClick={handlePairSubmit} disabled={completePairingMutation.isPending}>
              {completePairingMutation.isPending ? "Emparejando..." : "Emparejar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PARA EDITAR PANTALLA */}
      <Dialog open={!!editingScreen} onOpenChange={() => setEditingScreen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Pantalla</DialogTitle></DialogHeader>
          {editingScreen && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Nombre</Label>
                <Input id="edit-name" value={editingScreen.name} onChange={(e) => setEditingScreen({...editingScreen, name: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="edit-location">Ubicación</Label>
                <Input id="edit-location" value={editingScreen.location || ''} onChange={(e) => setEditingScreen({...editingScreen, location: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="edit-playlist">Playlist Asignada</Label>
                <Select value={editingScreen.playlistId?.toString() || 'none'} onValueChange={(value) => setEditingScreen({...editingScreen, playlistId: value === 'none' ? null : parseInt(value, 10)})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin playlist</SelectItem>
                    {playlists.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingScreen(null)}>Cancelar</Button>
            <Button onClick={() => editingScreen && updateMutation.mutate(editingScreen)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PARA VER EN VIVO */}
      <Dialog open={!!livePreviewScreenId} onOpenChange={() => setLivePreviewScreenId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista en Vivo</DialogTitle>
          </DialogHeader>
          {livePreviewScreenId && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe 
                src={`/screen-player?screenId=${livePreviewScreenId}&preview=true`} 
                className="w-full h-full" 
                frameBorder="0"
                title="Vista en vivo de la pantalla"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PESTAÑAS PRINCIPALES */}
      <div className="flex-1 flex flex-col">
        <Tabs defaultValue="screens" className="flex-1 flex flex-col">
          <TabsList className="grid w-full max-w-md mx-4 sm:mx-6 mt-4 grid-cols-2">
            <TabsTrigger value="screens" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Pantallas
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Grupos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="screens" className="flex-1 flex flex-col mt-0">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Lista de Pantallas</h2>
                <p className="text-sm text-slate-600">Gestiona tus dispositivos individuales</p>
              </div>
              <Button onClick={() => setIsPairModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Pantalla
              </Button>
            </div>
            
            <div className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              {screens.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Tv className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No hay pantallas</h3>
                    <p className="text-slate-500 mb-4">
                      Conecta tu primera pantalla para comenzar
                    </p>
                    <Button onClick={() => setIsPairModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Emparejar Primera Pantalla
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {screens.map((screen) => (
                    <Card key={screen.id} className="flex flex-col hover:shadow-md transition-shadow">
                      <CardContent className="p-4 md:p-5 flex-grow flex flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Tv className="w-5 h-5 text-slate-500"/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 leading-tight text-base lg:text-lg truncate" title={screen.name}>
                                {screen.name}
                              </h4>
                              {screen.location && <p className="text-sm text-slate-500 truncate">{screen.location}</p>}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(screen.id, screen.isOnline, screen.lastSeen)}
                          </div>
                        </div>
                        
                        <ScreenPreview screen={screen} onPlayClick={setLivePreviewScreenId} />
                        
                        <div className="flex-grow my-4 space-y-2 text-sm">
                          <div className="text-slate-600">
                            <span className="font-medium text-slate-700">Playlist:</span> {
                              playlists.find(p => p.id === screen.playlistId)?.name || 
                              <span className="italic">Ninguna</span>
                            }
                          </div>
                          <div className="text-slate-600">
                            <span className="font-medium text-slate-700">Última vez online:</span> {formatDate(screenStatuses[screen.id]?.lastSeen || screen.lastSeen)}
                          </div>
                        </div>

                        <div className="pt-4 border-t flex justify-end items-center space-x-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => window.open(`/screen-player?screenId=${screen.id}`, '_blank')}
                            title="Abrir en nueva pestaña"
                          >
                            <Monitor className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEditScreen(screen)} title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-600" 
                            onClick={() => {
                              if (confirm(`¿Estás seguro de que quieres eliminar la pantalla "${screen.name}"?`)) {
                                deleteMutation.mutate(screen.id);
                              }
                            }} 
                            disabled={deleteMutation.isPending} 
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="flex-1 flex flex-col mt-0">
            <ScreenGroups />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
