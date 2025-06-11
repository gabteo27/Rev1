import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { 
  Tv, 
  Plus, 
  Settings, 
  Trash2, 
  Monitor, 
  Wifi, 
  WifiOff,
  Search,
  Filter,
  MoreVertical,
  Edit,
  ExternalLink
} from "lucide-react";

const initialPairFormState = { pairingCode: "", name: "", location: "", playlistId: "" };

export default function Screens() {
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [pairFormData, setPairFormData] = useState(initialPairFormState);
  const { toast } = useToast();

  const { data: screens = [], isLoading } = useQuery<Screen[]>({ queryKey: ["/api/screens"], retry: false });
  const { data: playlists = [] } = useQuery<Playlist[]>({ queryKey: ["/api/playlists"], retry: false });

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
    mutationFn: (id: number) => apiRequest(`/api/screens/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Pantalla eliminada" });
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

  // --- FUNCIONES AUXILIARES ---

  const formatDate = (date: Date | null | string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getStatusBadge = (isOnline: boolean | null, lastSeen?: string | Date) => {
      if (isOnline) return <Badge className="bg-green-100 text-green-800 border-green-300">En línea</Badge>;
      if (lastSeen) {
        const diffInHours = (new Date().getTime() - new Date(lastSeen).getTime()) / 36e5;
        if (diffInHours < 1) return <Badge variant="destructive">Desconectada</Badge>;
        if (diffInHours < 24) return <Badge variant="secondary">Inactiva</Badge>;
      }
      return <Badge variant="secondary">Desconocido</Badge>;
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
        subtitle="Gestiona tus dispositivos de visualización"
        actions={
          <Button onClick={() => setIsPairModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Pantalla
          </Button>
        }
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

      {/* LISTA DE PANTALLAS */}
      <div className="flex-1 px-6 py-6 overflow-auto">
        {screens.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-12 text-center">...</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {screens.map((screen) => (
              <Card key={screen.id} className="flex flex-col">
                <CardContent className="p-4 flex-grow flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><Tv className="w-5 h-5 text-slate-500"/></div>
                      <div>
                        <h4 className="font-semibold text-slate-900 leading-tight">{screen.name}</h4>
                        {screen.location && <p className="text-sm text-slate-500">{screen.location}</p>}
                      </div>
                    </div>
                    {getStatusBadge(screen.isOnline, screen.lastSeen)}
                  </div>
                  <div className="flex-grow mt-4 space-y-2">
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Playlist:</span> {playlists.find(p => p.id === screen.playlistId)?.name || <span className="italic">Ninguna</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Última vez online:</span> {formatDate(screen.lastSeen)}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-end space-x-2">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => window.open(`/player?screenId=${screen.id}`, '_blank')}
                      title="Ver pantalla en vivo"
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingScreen(screen)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteMutation.mutate(screen.id)} disabled={deleteMutation.isPending}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}