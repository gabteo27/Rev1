import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Move, Maximize2, Settings } from "lucide-react";

interface Zone {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

interface LayoutEditorProps {
  initialZones?: Zone[];
  onSave: (zones: Zone[]) => void;
  onCancel: () => void;
}

export function LayoutEditor({ initialZones = [], onSave, onCancel }: LayoutEditorProps) {
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [newZoneTitle, setNewZoneTitle] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ];

  const addZone = () => {
    if (!newZoneTitle.trim()) return;

    const newZone: Zone = {
      id: `zone_${Date.now()}`,
      title: newZoneTitle.trim(),
      x: 10,
      y: 10,
      width: 30,
      height: 20,
      color: colors[zones.length % colors.length]
    };

    setZones([...zones, newZone]);
    setNewZoneTitle("");
  };

  const deleteZone = (zoneId: string) => {
    setZones(zones.filter(z => z.id !== zoneId));
    if (selectedZone === zoneId) {
      setSelectedZone(null);
    }
  };

  const updateZone = (zoneId: string, updates: Partial<Zone>) => {
    setZones(zones.map(zone => 
      zone.id === zoneId ? { ...zone, ...updates } : zone
    ));
  };

  const handleMouseDown = (e: React.MouseEvent, zoneId: string, action: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();

    if (action === 'drag') {
      setDragging(zoneId);
    } else {
      setResizing(zoneId);
    }
    setSelectedZone(zoneId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (dragging) {
      const zone = zones.find(z => z.id === dragging);
      if (zone) {
        updateZone(dragging, {
          x: Math.max(0, Math.min(100 - zone.width, x - zone.width / 2)),
          y: Math.max(0, Math.min(100 - zone.height, y - zone.height / 2))
        });
      }
    } else if (resizing) {
      const zone = zones.find(z => z.id === resizing);
      if (zone) {
        updateZone(resizing, {
          width: Math.max(10, Math.min(100 - zone.x, x - zone.x)),
          height: Math.max(10, Math.min(100 - zone.y, y - zone.y))
        });
      }
    }
  }, [dragging, resizing, zones, updateZone]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  // Add event listeners
  React.useEffect(() => {
    if (dragging || resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp]);

  const selectedZoneData = zones.find(z => z.id === selectedZone);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editor de Layout Libre</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={() => onSave(zones)}>
              Guardar Layout
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Input
            placeholder="Nombre de la zona..."
            value={newZoneTitle}
            onChange={(e) => setNewZoneTitle(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={addZone} disabled={!newZoneTitle.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Agregar Zona
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 p-4">
          <div 
            ref={containerRef}
            className="relative w-full h-full border-2 border-dashed border-gray-300 bg-gray-100 rounded-lg"
            style={{ minHeight: '400px' }}
          >
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={`absolute border-2 rounded cursor-move ${
                  selectedZone === zone.id ? 'border-blue-500 shadow-lg' : 'border-gray-400'
                }`}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  backgroundColor: zone.color + '20',
                  borderColor: zone.color || '#6b7280'
                }}
                onMouseDown={(e) => handleMouseDown(e, zone.id, 'drag')}
                onClick={() => setSelectedZone(zone.id)}
              >
                <div className="p-2 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {zone.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-red-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteZone(zone.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>

                  <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
                    {Math.round(zone.width)}% × {Math.round(zone.height)}%
                  </div>

                  {/* Resize handle */}
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
                    onMouseDown={(e) => handleMouseDown(e, zone.id, 'resize')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 p-4 border-l bg-gray-50">
          <h3 className="font-medium mb-4">Propiedades de Zona</h3>

          {selectedZoneData ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="zone-title">Título</Label>
                <Input
                  id="zone-title"
                  value={selectedZoneData.title}
                  onChange={(e) => updateZone(selectedZone!, { title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="zone-x">X (%)</Label>
                  <Input
                    id="zone-x"
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(selectedZoneData.x)}
                    onChange={(e) => updateZone(selectedZone!, { x: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="zone-y">Y (%)</Label>
                  <Input
                    id="zone-y"
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(selectedZoneData.y)}
                    onChange={(e) => updateZone(selectedZone!, { y: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="zone-width">Ancho (%)</Label>
                  <Input
                    id="zone-width"
                    type="number"
                    min="10"
                    max="100"
                    value={Math.round(selectedZoneData.width)}
                    onChange={(e) => updateZone(selectedZone!, { width: parseFloat(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="zone-height">Alto (%)</Label>
                  <Input
                    id="zone-height"
                    type="number"
                    min="10"
                    max="100"
                    value={Math.round(selectedZoneData.height)}
                    onChange={(e) => updateZone(selectedZone!, { height: parseFloat(e.target.value) || 10 })}
                  />
                </div>
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-1 mt-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded border-2 ${
                        selectedZoneData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateZone(selectedZone!, { color })}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Selecciona una zona para editar sus propiedades
            </p>
          )}

          <div className="mt-6">
            <h4 className="font-medium mb-2">Zonas ({zones.length})</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-2 rounded border cursor-pointer ${
                    selectedZone === zone.id ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200'
                  }`}
                  onClick={() => setSelectedZone(zone.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="text-sm truncate">{zone.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}