import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import Header from "@/components/layout/header";
import ErrorBoundary from "@/components/ErrorBoundary";
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
  Plus,
  Trash2,
  Edit3,
  Play,
  Pause,
  RotateCcw,
  Save,
  Eye,
  Monitor,
  Settings,
  Clock,
  BarChart3,
  Users,
  Calendar,
  Filter,
  Search,
  Download,
  Upload,
  Copy,
  Grid2X2,
  Grid3X3,
  Layers,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Layout,
  PictureInPicture,
  Rows,
  Columns,
  Square,
  GripVertical,
  Maximize,
  Minimize,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  Move3D,
  Expand,
  MousePointer2,
  AspectRatio,
  Image,
  Video,
  Globe,
  FileText,
  Type,
  List,
  Shuffle,
  ScrollText,
  SidebarOpen,
  SidebarClose
} from "lucide-react";

// Tipos para mayor claridad
type Playlist = any;
type PlaylistItem = any;
type ContentItem = any;

// Componente para el editor de layout personalizado mejorado
const CustomLayoutEditor = ({ playlist, onZoneClick, playlistData }: {
  playlist: any;
  onZoneClick: (zoneId: string) => void;
  playlistData: any;
}) => {
  const [zones, setZones] = useState([
    { id: 'zone1', x: 10, y: 10, width: 40, height: 40, title: 'Zona 1' },
    { id: 'zone2', x: 60, y: 10, width: 30, height: 30, title: 'Zona 2' },
    { id: 'zone3', x: 10, y: 60, width: 80, height: 30, title: 'Zona 3' }
  ]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState<string>('');

  // Cargar configuración personalizada existente si está disponible
  React.useEffect(() => {
    if (playlist?.customLayoutConfig) {
      try {
        let customConfig;
        if (typeof playlist.customLayoutConfig === 'string') {
          // Only parse if it's a valid JSON string
          if (playlist.customLayoutConfig.startsWith('{') || playlist.customLayoutConfig.startsWith('[')) {
            customConfig = JSON.parse(playlist.customLayoutConfig);
          } else {
            console.warn('Invalid custom layout config format:', playlist.customLayoutConfig);
            return;
          }
        } else if (typeof playlist.customLayoutConfig === 'object') {
          customConfig = playlist.customLayoutConfig;
        }
        
        if (customConfig?.zones && customConfig.zones.length > 0) {
          setZones(customConfig.zones);
        }
      } catch (e) {
        console.error('Error loading custom layout config:', e);
      }
    }
  }, [playlist?.customLayoutConfig]);

  const handleZoneResize = (zoneId: string, newDimensions: any) => {
    setZones(prev => prev.map(zone => 
      zone.id === zoneId 
        ? { ...zone, ...newDimensions }
        : zone
    ));
  };

  const addNewZone = () => {
    const newZone = {
      id: `zone${zones.length + 1}`,
      x: 20,
      y: 20,
      width: 30,
      height: 30,
      title: `Zona ${zones.length + 1}`
    };
    setZones(prev => [...prev, newZone]);
  };

  const deleteZone = (zoneId: string) => {
    if (zones.length > 1) {
      setZones(prev => prev.filter(zone => zone.id !== zoneId));
      setSelectedZone(null);
    }
  };

  const saveCustomLayout = async () => {
    try {
      const customConfig = { zones };
      const response = await apiRequest(`/api/playlists/${playlist.id}`, {
        method: "PUT",
        body: JSON.stringify({ 
          customLayoutConfig: JSON.stringify(customConfig) 
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Enviar notificación via WebSocket para actualizar el player
        try {
          await apiRequest(`/api/playlists/${playlist.id}/notify-update`, {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (wsError) {
          console.warn('Failed to send WebSocket notification:', wsError);
        }

        toast({
          title: "Layout guardado",
          description: "La configuración personalizada se ha guardado correctamente.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración del layout.",
        variant: "destructive",
      });
    }
  };

  // Manejadores de mouse para drag y resize
  const handleMouseDown = (e: React.MouseEvent, zoneId: string, action: 'drag' | 'resize', direction?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isEditing) return;

    setSelectedZone(zoneId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const container = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();

    if (container) {
      setDragStart({
        x: ((e.clientX - container.left) / container.width) * 100,
        y: ((e.clientY - container.top) / container.height) * 100
      });
    }

    if (action === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
      setResizeDirection(direction || '');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditing || !selectedZone || (!isDragging && !isResizing)) return;

    const container = e.currentTarget.getBoundingClientRect();
    const currentX = ((e.clientX - container.left) / container.width) * 100;
    const currentY = ((e.clientY - container.top) / container.height) * 100;

    const selectedZoneData = zones.find(z => z.id === selectedZone);
    if (!selectedZoneData) return;

    if (isDragging) {
      const deltaX = currentX - dragStart.x;
      const deltaY = currentY - dragStart.y;

      const newX = Math.max(0, Math.min(90, selectedZoneData.x + deltaX));
      const newY = Math.max(0, Math.min(90, selectedZoneData.y + deltaY));

      handleZoneResize(selectedZone, { x: newX, y: newY });
      setDragStart({ x: currentX, y: currentY });
    } else if (isResizing) {
      const deltaX = currentX - dragStart.x;
      const deltaY = currentY - dragStart.y;

      let newWidth = selectedZoneData.width;
      let newHeight = selectedZoneData.height;
      let newX = selectedZoneData.x;
      let newY = selectedZoneData.y;

      if (resizeDirection.includes('e')) {
        newWidth = Math.max(10, Math.min(100 - selectedZoneData.x, selectedZoneData.width + deltaX));
      }
      if (resizeDirection.includes('w')) {
        const widthChange = -deltaX;
        newWidth = Math.max(10, selectedZoneData.width + widthChange);
        newX = Math.max(0, selectedZoneData.x - widthChange);
      }
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(10, Math.min(100 - selectedZoneData.y, selectedZoneData.height + deltaY));
      }
      if (resizeDirection.includes('n')) {
        const heightChange = -deltaY;
        newHeight = Math.max(10, selectedZoneData.height + heightChange);
        newY = Math.max(0, selectedZoneData.y - heightChange);
      }

      handleZoneResize(selectedZone, { 
        x: newX, 
        y: newY, 
        width: newWidth, 
        height: newHeight 
      });
      setDragStart({ x: currentX, y: currentY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection('');
  };

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-medium text-gray-700">Editor de Layout Personalizado</div>
        <div className="flex gap-1">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs h-6 px-2"
          >
            {isEditing ? "Vista" : "Editar"}
          </Button>
          {isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={addNewZone}
                className="text-xs h-6 px-2"
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={saveCustomLayout}
                className="text-xs h-6 px-2"
              >
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      <div 
        className="w-full h-80 bg-slate-100 rounded-lg relative border-2 border-dashed border-gray-300 overflow-auto select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ minHeight: '320px', maxHeight: '500px' }}
      >
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`absolute border-2 rounded transition-all ${
              selectedZone === zone.id 
                ? 'border-blue-500 bg-blue-100' 
                : 'border-gray-400 bg-white hover:bg-gray-50'
            } ${isEditing ? 'cursor-move' : 'cursor-pointer'}`}
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`,
              minWidth: '40px',
              minHeight: '30px',
              zIndex: selectedZone === zone.id ? 10 : 1
            }}
            onMouseDown={(e) => {
              if (isEditing) {
                handleMouseDown(e, zone.id, 'drag');
              } else {
                onZoneClick(zone.id);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isEditing) {
                onZoneClick(zone.id);
              } else {
                setSelectedZone(zone.id);
              }
            }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-1 pointer-events-none">
              <div className="text-xs font-medium text-gray-700 truncate w-full">
                {zone.title}
              </div>
              <div className="text-xs text-gray-500">
                {playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length || 0} elementos
              </div>
              {!isEditing && (
                <div className="text-xs text-blue-600 mt-1 pointer-events-auto">
                  <Plus className="w-3 h-3 mx-auto" />
                  Clic para agregar
                </div>
              )}
            </div>

            {/* Resize handles when editing */}
            {isEditing && selectedZone === zone.id && (
              <>
                {/* Corner handles */}
                <div 
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize border border-white"
                  onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'se')}
                />
                <div 
                  className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 cursor-ne-resize border border-white"
                  onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'ne')}
                />
                <div 
                  className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 cursor-sw-resize border border-white"
                  onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'sw')}
                />
                <div 
                  className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 cursor-nw-resize border border-white"
                  onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'nw')}
                />

                {/* Edge handles */}
                <div 
                  className="absolute top-1/2 -right-1 w-2 h-4 bg-blue-500 cursor-e-resize transform -translate-y-1/2 border border-white"
                  onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'e')}
                />
                <div 
                  className="absolute top-1/2 -left-1 w-2 h-4 bg-blue-500 cursor-w-resize transform -translate-y-1/2 border border-white"
                  onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'w')}
                />
                <div 
                  className="absolute left-1/2 -top-1 w-4 h-2 bg-blue-500 cursor-n-resize transform -translate-x-1/2 border border-white"
                  onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 'n')}
                />
                <div 
                  className="absolute left-1/2 -bottom-1 w-4 h-2 bg-blue-500 cursor-s-resize transform -translate-x-1/2 border border-white"
                  onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize', 's')}
                />

                {/* Delete button */}
                {zones.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteZone(zone.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full pointer-events-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {isEditing && selectedZone && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-3">
          <div className="font-medium text-gray-800">
            Zona Seleccionada: {zones.find(z => z.id === selectedZone)?.title}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Título</label>
                <Input
                  type="text"
                  value={zones.find(z => z.id === selectedZone)?.title || ''}
                  onChange={(e) => handleZoneResize(selectedZone, { title: e.target.value })}
                  className="text-xs h-7"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">X (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={Math.round(zones.find(z => z.id === selectedZone)?.x || 0)}
                    onChange={(e) => handleZoneResize(selectedZone, { x: parseInt(e.target.value) || 0 })}
                    className="text-xs h-7"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Y (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={Math.round(zones.find(z => z.id === selectedZone)?.y || 0)}
                    onChange={(e) => handleZoneResize(selectedZone, { y: parseInt(e.target.value) || 0 })}
                    className="text-xs h-7"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Ancho (%)</label>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={Math.round(zones.find(z => z.id === selectedZone)?.width || 0)}
                    onChange={(e) => handleZoneResize(selectedZone, { width: parseInt(e.target.value) || 10 })}
                    className="text-xs h-7"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Alto (%)</label>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={Math.round(zones.find(z => z.id === selectedZone)?.height || 0)}
                    onChange={(e) => handleZoneResize(selectedZone, { height: parseInt(e.target.value) || 10 })}
                    className="text-xs h-7"
                  />
                </div>
              </div>
              <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                <strong>Tip:</strong> Arrastra para mover, usa las esquinas/bordes para redimensionar
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
        <strong>✨ Editor Mejorado:</strong> Ahora puedes redimensionar arrastrando las esquinas y bordes de las zonas, 
        agregar contenido haciendo clic en las zonas, y guardar tu configuración personalizada.
      </div>
    </div>
  );
};

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
      console.log(`🗑️ Deleting playlist item ${itemId}`);
      await apiRequest(`/api/playlist-items/${itemId}`, {
        method: "DELETE"
      });
      return itemId;
    },
    onSuccess: async (itemId: number) => {
      console.log(`✅ Successfully deleted item ${itemId}`);
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId] });
      
      await refetchPlaylist();

      toast({
        title: "Elemento eliminado",
        description: "El elemento se ha eliminado de la playlist.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Error removing item:", error);
      
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

  // Handle item removal with debouncing to prevent multiple calls
  const handleRemoveFromPlaylist = async (itemId: number) => {
    if (removeItemMutation.isPending) {
      console.log("Delete already in progress, ignoring...");
      return;
    }
    
    console.log(`Starting removal of item ${itemId}`);
    removeItemMutation.mutate(itemId);
  };

  const handleZoneSettingChange = async (zoneId: string, setting: string, value: string) => {
    if (!selectedPlaylistForLayout) {
      console.warn("No playlist selected for layout");
      return;
    }

    try {
      // Parse current settings safely
      let currentSettings: any = {};
      try {
        if (playlistData?.zoneSettings) {
          if (typeof playlistData.zoneSettings === 'string') {
            // Only parse if it's actually a JSON string, not "[object Object]"
            if (playlistData.zoneSettings.startsWith('{') || playlistData.zoneSettings.startsWith('[')) {
              currentSettings = JSON.parse(playlistData.zoneSettings);
            } else {
              console.warn("Invalid JSON string detected:", playlistData.zoneSettings);
              currentSettings = {};
            }
          } else if (typeof playlistData.zoneSettings === 'object' && playlistData.zoneSettings !== null) {
            currentSettings = playlistData.zoneSettings;
          }
        }
      } catch (e) {
        console.warn("Error parsing zone settings:", e);
        currentSettings = {};
      }

      // Validate inputs
      if (!zoneId || !setting || value === undefined) {
        throw new Error("Invalid parameters for zone setting update");
      }

      // Update the specific setting
      const newZoneSettings = {
        ...currentSettings,
        [zoneId]: {
          ...(currentSettings[zoneId] || {}),
          [setting]: value
        }
      };

      console.log("Updating zone settings:", { 
        zoneId, 
        setting, 
        value, 
        playlistId: selectedPlaylistForLayout.id,
        newZoneSettings 
      });

      // Use only the specific field we want to update
      const updatePayload = {
        zoneSettings: JSON.stringify(newZoneSettings)
      };

      const response = await apiRequest(`/api/playlists/${selectedPlaylistForLayout.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      // Update local state optimistically
      queryClient.setQueryData(["/api/playlists", selectedPlaylistForLayout.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          zoneSettings: JSON.stringify(newZoneSettings)
        };
      });

      // Refetch to ensure consistency
      setTimeout(async () => {
        try {
          await refetchPlaylist();
        } catch (refetchError) {
          console.warn("Error refetching playlist:", refetchError);
        }
      }, 100);

      toast({
        title: "Configuración actualizada",
        description: `El ajuste de contenido se ha actualizado para ${zoneId}.`,
      });
    } catch (error: any) {
      console.error("Error updating zone settings:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración de la zona.",
        variant: "destructive",
      });
    }
  };

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
                          <Edit3 className="h-4 w-4" />
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
            <ScrollArea className="flex-1 overflow-hidden">
              <div className="flex flex-col space-y-4">
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
                        toast({
                          title: "Editor Beta Activado",
                          description: "Usa los controles de la vista previa para editar las zonas.",
                        });
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Ayuda
                    </Button>
                  )}
                </div>
              </div>

              {/* Visual Layout Preview */}
              <div className="flex-1 flex gap-6">
                {/* Layout Visual Preview */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-3">Vista Previa del Layout</h3>
                  <ErrorBoundary>
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

                    {currentLayout === 'pip_bottom_right' && (
                      <div className="w-full h-full relative">
                        <div className="w-full h-full border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                             onClick={() => handleOpenContentLibrary('main')}>
                          <PictureInPicture className="w-6 h-6 text-blue-600 mb-2" />
                          <span className="text-xs font-medium text-blue-700">Zona Principal</span>
                          <span className="text-xs text-blue-600 mt-1">
                            {playlistData?.items?.filter((item: any) => item.zone === 'main')?.length || 0} elementos
                          </span>
                          <Button variant="ghost" size="sm" className="mt-2 text-blue-600 hover:bg-blue-200">
                            <Plus className="w-3 h-3 mr-1" />
                            Agregar
                          </Button>
                        </div>
                        <div className="absolute bottom-2 right-2 w-1/3 h-1/3 border-2 border-dashed border-green-400 rounded bg-green-50 flex flex-col items-center justify-center hover:bg-green-100 transition-colors cursor-pointer"
                             onClick={() => handleOpenContentLibrary('pip')}>
                          <PictureInPicture className="w-4 h-4 text-green-600 mb-1" />
                          <span className="text-xs font-medium text-green-700">PiP</span>
                          <span className="text-xs text-green-600">
                            {playlistData?.items?.filter((item: any) => item.zone === 'pip')?.length || 0}
                          </span>
                        </div>
                      </div>
                    )}

                    {currentLayout === 'carousel' && (
                      <div className="w-full h-full border-2 border-dashed border-purple-400 rounded-lg bg-purple-50 flex flex-col items-center justify-center hover:bg-purple-100 transition-colors cursor-pointer"
                           onClick={() => handleOpenContentLibrary('main')}>
                        <Shuffle className="w-8 h-8 text-purple-600 mb-2" />
                        <span className="text-sm font-medium text-purple-700">Carrusel de Contenido</span>
                        <span className="text-xs text-purple-600 mt-1">
                          {playlistData?.items?.filter((item: any) => item.zone === 'main')?.length || 0} elementos
                        </span>
                        <Button variant="ghost" size="sm" className="mt-2 text-purple-600 hover:bg-purple-200">
                          <Plus className="w-3 h-3 mr-1" />
                          Agregar contenido
                        </Button>
                      </div>
                    )}

                    {currentLayout === 'web_scroll' && (
                      <div className="w-full h-full border-2 border-dashed border-orange-400 rounded-lg bg-orange-50 flex flex-col items-center justify-center hover:bg-orange-100 transition-colors cursor-pointer"
                           onClick={() => handleOpenContentLibrary('main')}>
                        <ScrollText className="w-8 h-8 text-orange-600 mb-2" />
                        <span className="text-sm font-medium text-orange-700">Scroll Web</span>
                        <span className="text-xs text-orange-600 mt-1">
                          {playlistData?.items?.filter((item: any) => item.zone === 'main')?.length || 0} elementos
                        </span>
                        <Button variant="ghost" size="sm" className="mt-2 text-orange-600 hover:bg-orange-200">
                          <Plus className="w-3 h-3 mr-1" />
                          Agregar contenido
                        </Button>
                      </div>
                    )}

                    {currentLayout === 'sidebar_left' && (
                      <div className="w-full h-full flex gap-2">
                        <div className="w-1/3 border-2 border-dashed border-indigo-400 rounded-lg bg-indigo-50 flex flex-col items-center justify-center hover:bg-indigo-100 transition-colors cursor-pointer"
                             onClick={() => handleOpenContentLibrary('sidebar')}>
                          <SidebarOpen className="w-5 h-5 text-indigo-600 mb-2" />
                          <span className="text-xs font-medium text-indigo-700">Sidebar</span>
                          <span className="text-xs text-indigo-600 mt-1">
                            {playlistData?.items?.filter((item: any) => item.zone === 'sidebar')?.length || 0}
                          </span>
                          <Button variant="ghost" size="sm" className="mt-1 text-indigo-600 hover:bg-indigo-200 text-xs px-2 py-1">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex-1 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                             onClick={() => handleOpenContentLibrary('main')}>
                          <Layout className="w-6 h-6 text-blue-600 mb-2" />
                          <span className="text-xs font-medium text-blue-700">Principal</span>
                          <span className="text-xs text-blue-600 mt-1">
                            {playlistData?.items?.filter((item: any) => item.zone === 'main')?.length || 0}
                          </span>
                          <Button variant="ghost" size="sm" className="mt-2 text-blue-600 hover:bg-blue-200">
                            <Plus className="w-3 h-3 mr-1" />
                            Agregar
                          </Button>
                        </div>
                      </div>
                    )}

                    {currentLayout === 'sidebar_right' && (
                      <div className="w-full h-full flex gap-2">
                        <div className="flex-1 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                             onClick={() => handleOpenContentLibrary('main')}>
                          <Layout className="w-6 h-6 text-blue-600 mb-2" />
                          <span className="text-xs font-medium text-blue-700">Principal</span>
                          <span className="text-xs text-blue-600 mt-1">
                            {playlistData?.items?.filter((item: any) => item.zone === 'main')?.length || 0}
                          </span>
                          <Button variant="ghost" size="sm" className="mt-2 text-blue-600 hover:bg-blue-200">
                            <Plus className="w-3 h-3 mr-1" />
                            Agregar
                          </Button>
                        </div>
                        <div className="w-1/3 border-2 border-dashed border-indigo-400 rounded-lg bg-indigo-50 flex flex-col items-center justify-center hover:bg-indigo-100 transition-colors cursor-pointer"
                             onClick={() => handleOpenContentLibrary('sidebar')}>
                          <SidebarClose className="w-5 h-5 text-indigo-600 mb-2" />
                          <span className="text-xs font-medium text-indigo-700">Sidebar</span>
                          <span className="text-xs text-indigo-600 mt-1">
                            {playlistData?.items?.filter((item: any) => item.zone === 'sidebar')?.length || 0}
                          </span>
                          <Button variant="ghost" size="sm" className="mt-1 text-indigo-600 hover:bg-indigo-200 text-xs px-2 py-1">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {currentLayout === 'header_footer' && (
                      <div className="w-full h-full flex flex-col gap-2">
                        <div className="h-1/5 border-2 border-dashed border-cyan-400 rounded-lg bg-cyan-50 flex flex-col items-center justify-center hover:bg-cyan-100 transition-colors cursor-pointer"
                             onClick={() => handleOpenContentLibrary('header')}>
                          <Rows className="w-4 h-4 text-cyan-600 mb-1" />
                          <span className="text-xs font-medium text-cyan-700">Header</span>
                          <span className="text-xs text-cyan-600">
                            {playlistData?.items?.filter((item: any) => item.zone === 'header')?.length || 0}
                          </span>
                        </div>
                        <div className="flex-1 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                             onClick={() => handleOpenContentLibrary('main')}>
                          <Layout className="w-6 h-6 text-blue-600 mb-2" />
                          <span className="text-xs font-medium text-blue-700">Principal</span>
                          <span className="text-xs text-blue-600 mt-1">
                            {playlistData?.items?.filter((item: any) => item.zone === 'main')?.length || 0}
                          </span>
                          <Button variant="ghost" size="sm" className="mt-2 text-blue-600 hover:bg-blue-200">
                            <Plus className="w-3 h-3 mr-1" />
                            Agregar
                          </Button>
                        </div>
                        <div className="h-1/5 border-2 border-dashed border-cyan-400 rounded-lg bg-cyan-50 flex flex-col items-center justify-center hover:bg-cyan-100 transition-colors cursor-pointer"
                             onClick={() => handleOpenContentLibrary('footer')}>
                          <Rows className="w-4 h-4 text-cyan-600 mb-1" />
                          <span className="text-xs font-medium text-cyan-700">Footer</span>
                          <span className="text-xs text-cyan-600">
                            {playlistData?.items?.filter((item: any) => item.zone === 'footer')?.length || 0}
                          </span>
                        </div>
                      </div>
                    )}

                    {currentLayout === 'triple_vertical' && (
                      <div className="w-full h-full grid grid-cols-3 gap-2">
                        {[
                          {id: 'left', title: 'Izquierda'},
                          {id: 'center', title: 'Centro'},
                          {id: 'right', title: 'Derecha'}
                        ].map((zone) => (
                          <div key={zone.id} className="border-2 border-dashed border-teal-400 rounded-lg bg-teal-50 flex flex-col items-center justify-center hover:bg-teal-100 transition-colors cursor-pointer"
                               onClick={() => handleOpenContentLibrary(zone.id)}>
                            <SplitSquareVertical className="w-5 h-5 text-teal-600 mb-1" />
                            <span className="text-xs font-medium text-teal-700">{zone.title}</span>
                            <span className="text-xs text-teal-600 mt-1">
                              {playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length || 0}
                            </span>
                            <Button variant="ghost" size="sm" className="mt-1 text-teal-600 hover:bg-teal-200 text-xs px-2 py-1">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentLayout === 'triple_horizontal' && (
                      <div className="w-full h-full flex flex-col gap-2">
                        {[
                          {id: 'top', title: 'Superior'},
                          {id: 'middle', title: 'Medio'},
                          {id: 'bottom', title: 'Inferior'}
                        ].map((zone) => (
                          <div key={zone.id} className="flex-1 border-2 border-dashed border-pink-400 rounded-lg bg-pink-50 flex flex-col items-center justify-center hover:bg-pink-100 transition-colors cursor-pointer"
                               onClick={() => handleOpenContentLibrary(zone.id)}>
                            <SplitSquareHorizontal className="w-5 h-5 text-pink-600 mb-1" />
                            <span className="text-xs font-medium text-pink-700">{zone.title}</span>
                            <span className="text-xs text-pink-600 mt-1">
                              {playlistData?.items?.filter((item: any) => item.zone === zone.id)?.length || 0}
                            </span>
                            <Button variant="ghost" size="sm" className="mt-1 text-pink-600 hover:bg-pink-200 text-xs px-2 py-1">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentLayout === 'custom_layout' && (
                      <CustomLayoutEditor 
                        playlist={selectedPlaylistForLayout}
                        onZoneClick={handleOpenContentLibrary}
                        playlistData={playlistData}
                      />
                    )}
                  </div>
                  </ErrorBoundary>
                </div>

                {/* Zone Details Panel */}
                <div className="w-80">
                  <h3 className="text-sm font-medium mb-3">Contenido por Zona</h3>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {zones.map(zone => {
                        const zoneItems = playlistData?.items?.filter((item: any) => item.zone === zone.id) || [];
                        
                        // Safely parse zoneSettings - handle both string and object cases
                        let zoneSettings = {};
                        try {
                          if (playlistData?.zoneSettings) {
                            if (typeof playlistData.zoneSettings === 'string') {
                              zoneSettings = JSON.parse(playlistData.zoneSettings);
                            } else if (typeof playlistData.zoneSettings === 'object') {
                              zoneSettings = playlistData.zoneSettings;
                            }
                          }
                        } catch (error) {
                          console.warn('Error parsing zone settings:', error);
                          zoneSettings = {};
                        }
                        
                        const currentObjectFit = zoneSettings[zone.id]?.objectFit || 'cover';

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

                            {/* Object Fit Control */}
                            <div className="mb-2">
                              <Label htmlFor={`object-fit-${zone.id}`} className="block text-xs font-medium text-gray-700">Ajuste de Contenido</Label>
                              <Select
                                id={`object-fit-${zone.id}`}
                                value={currentObjectFit}
                                onValueChange={(value) => handleZoneSettingChange(zone.id, 'objectFit', value)}
                              >
                                <SelectTrigger className="text-xs h-7 w-full">
                                  <SelectValue placeholder="Seleccionar ajuste" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cover">
                                    <div className="flex items-center gap-2">
                                      Cubrir
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="contain">
                                    <div className="flex items-center gap-2">
                                      Contener
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="fill">
                                    <div className="flex items-center gap-2">
                                      Rellenar
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="none">
                                    <div className="flex items-center gap-2">
                                      Ninguno
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="scale-down">
                                    <div className="flex items-center gap-2">
                                      Reducir
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
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
                                      onClick={() => handleRemoveFromPlaylist(item.id)}
                                      disabled={removeItemMutation.isPending}
                                    >
                                      {removeItemMutation.isPending ? (
                                        <div className="w-3 h-3 animate-spin rounded-full border border-red-500 border-t-transparent" />
                                      ) : (
                                        <Trash2 className="w-3 h-3" />
                                      )}
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
            </ScrollArea>
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
          <ScrollArea className="flex-1 min-h-0">
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
          </ScrollArea>

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