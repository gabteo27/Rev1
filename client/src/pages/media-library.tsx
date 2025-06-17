
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentItem } from "@shared/schema";

import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Search,
  Filter,
  Upload,
  Image,
  Video,
  FileText,
  Globe,
  Edit,
  Trash2,
  Download,
  Eye,
  Calendar,
  Clock,
  Tag,
  Folder,
  Grid3X3,
  List,
  SortAsc,
  SortDesc
} from "lucide-react";

const mediaTypes = [
  { value: 'all', label: 'Todos los tipos', icon: Folder },
  { value: 'image', label: 'Imágenes', icon: Image },
  { value: 'video', label: 'Videos', icon: Video },
  { value: 'pdf', label: 'Documentos PDF', icon: FileText },
  { value: 'webpage', label: 'Páginas Web', icon: Globe },
  { value: 'template', label: 'Plantillas', icon: Layout },
];

const layoutTemplates = [
  { 
    id: 'modern_news', 
    name: 'Noticias Moderno', 
    layout: 'header_footer',
    zones: [
      { id: 'header', title: 'Cabecera', x: 0, y: 0, width: 100, height: 15 },
      { id: 'main', title: 'Contenido Principal', x: 0, y: 15, width: 70, height: 70 },
      { id: 'sidebar', title: 'Barra Lateral', x: 70, y: 15, width: 30, height: 70 },
      { id: 'footer', title: 'Pie de Página', x: 0, y: 85, width: 100, height: 15 }
    ]
  },
  { 
    id: 'retail_display', 
    name: 'Display Comercial', 
    layout: 'grid_2x2',
    zones: [
      { id: 'promo', title: 'Promociones', x: 0, y: 0, width: 50, height: 60 },
      { id: 'featured', title: 'Destacados', x: 50, y: 0, width: 50, height: 60 },
      { id: 'social', title: 'Redes Sociales', x: 0, y: 60, width: 50, height: 40 },
      { id: 'info', title: 'Información', x: 50, y: 60, width: 50, height: 40 }
    ]
  },
  { 
    id: 'restaurant_menu', 
    name: 'Menú Restaurante', 
    layout: 'triple_vertical',
    zones: [
      { id: 'appetizers', title: 'Entradas', x: 0, y: 0, width: 33, height: 100 },
      { id: 'mains', title: 'Platos Principales', x: 33, y: 0, width: 34, height: 100 },
      { id: 'desserts', title: 'Postres', x: 67, y: 0, width: 33, height: 100 }
    ]
  },
  { 
    id: 'corporate_lobby', 
    name: 'Lobby Corporativo', 
    layout: 'sidebar_left',
    zones: [
      { id: 'sidebar', title: 'Información Empresa', x: 0, y: 0, width: 25, height: 100 },
      { id: 'main', title: 'Contenido Principal', x: 25, y: 0, width: 75, height: 80 },
      { id: 'ticker', title: 'Ticker Noticias', x: 25, y: 80, width: 75, height: 20 }
    ]
  }
];

const sortOptions = [
  { value: 'created-desc', label: 'Más recientes primero' },
  { value: 'created-asc', label: 'Más antiguos primero' },
  { value: 'title-asc', label: 'Título A-Z' },
  { value: 'title-desc', label: 'Título Z-A' },
  { value: 'size-desc', label: 'Tamaño mayor a menor' },
  { value: 'size-asc', label: 'Tamaño menor a mayor' },
];

export default function MediaLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("created-desc");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

  const { toast } = useToast();

  const { data: contentItems = [], isLoading } = useQuery<ContentItem[]>({
    queryKey: ["/api/content"],
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContentItem> }) =>
      apiRequest(`/api/content/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "Contenido actualizado", description: "Los cambios se han guardado correctamente." });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/content/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Contenido eliminado", description: "El elemento se ha eliminado correctamente." });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setSelectedItems([]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest(`/api/content/${id}`, { method: "DELETE" })));
    },
    onSuccess: () => {
      toast({ title: "Elementos eliminados", description: `${selectedItems.length} elementos eliminados correctamente.` });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setSelectedItems([]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(contentItems.map(item => item.category).filter(Boolean))];
    return uniqueCategories.sort();
  }, [contentItems]);

  // Filter and sort content
  const filteredAndSortedContent = useMemo(() => {
    let filtered = contentItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      
      return matchesSearch && matchesType && matchesCategory;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created-desc':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'created-asc':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'size-desc':
          return (b.fileSize || 0) - (a.fileSize || 0);
        case 'size-asc':
          return (a.fileSize || 0) - (b.fileSize || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [contentItems, searchTerm, filterType, filterCategory, sortBy]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'pdf': return FileText;
      case 'webpage': return Globe;
      default: return FileText;
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredAndSortedContent.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredAndSortedContent.map(item => item.id));
    }
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    updateMutation.mutate({
      id: editingItem.id,
      data: {
        title: editingItem.title,
        description: editingItem.description,
        category: editingItem.category,
        tags: editingItem.tags,
        duration: editingItem.duration
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Biblioteca de Medios" subtitle="Gestiona tu contenido multimedia" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando biblioteca...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Biblioteca de Medios" subtitle="Gestiona tu contenido multimedia" />

      {/* Toolbar */}
      <div className="px-4 sm:px-6 py-4 border-b bg-white">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mediaTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Mode */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedItems.length} elemento(s) seleccionado(s)
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedItems([])}
              >
                Deseleccionar
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  if (confirm(`¿Eliminar ${selectedItems.length} elemento(s)?`)) {
                    batchDeleteMutation.mutate(selectedItems);
                  }
                }}
                disabled={batchDeleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {filteredAndSortedContent.length} elemento(s)
            </h2>
            {filteredAndSortedContent.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedItems.length === filteredAndSortedContent.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </Button>
            )}
          </div>
        </div>

        {filteredAndSortedContent.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {searchTerm || filterType !== 'all' || filterCategory !== 'all' 
                  ? 'No se encontraron elementos' 
                  : 'No hay contenido'
                }
              </h3>
              <p className="text-slate-500 mb-4">
                {searchTerm || filterType !== 'all' || filterCategory !== 'all'
                  ? 'Prueba ajustando los filtros de búsqueda'
                  : 'Sube tu primer archivo para comenzar'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
              : "space-y-2"
          }>
            {filteredAndSortedContent.map((item) => {
              const TypeIcon = getTypeIcon(item.type);
              const isSelected = selectedItems.includes(item.id);

              if (viewMode === 'list') {
                return (
                  <Card key={item.id} className={`p-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectItem(item.id)}
                        className="rounded"
                      />
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="w-6 h-6 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.title}</h4>
                        <p className="text-sm text-slate-500 truncate">{item.description || 'Sin descripción'}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-500">
                        <span>{formatFileSize(item.fileSize)}</span>
                        <span>{formatDate(item.createdAt)}</span>
                        <Badge variant="outline">{item.type}</Badge>
                        {item.category && <Badge variant="secondary">{item.category}</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewItem(item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            if (confirm(`¿Eliminar "${item.title}"?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              }

              return (
                <Card key={item.id} className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:shadow-md'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectItem(item.id)}
                        className="rounded mt-1"
                      />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewItem(item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                      {item.type === 'image' && item.thumbnailUrl ? (
                        <img 
                          src={item.thumbnailUrl} 
                          alt={item.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <TypeIcon className="w-8 h-8 text-slate-500" />
                      )}
                    </div>

                    <h4 className="font-medium text-sm mb-1 truncate" title={item.title}>
                      {item.title}
                    </h4>
                    
                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{item.type}</Badge>
                        {item.category && <Badge variant="secondary" className="text-xs">{item.category}</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.duration ? `${item.duration}s` : 'N/A'}
                      </div>
                      <div>{formatFileSize(item.fileSize)}</div>
                      <div>{formatDate(item.createdAt)}</div>
                    </div>

                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Contenido</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={editingItem.category || ''}
                    onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                    placeholder="Ej: Marketing, Eventos..."
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duración (segundos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={editingItem.duration || ''}
                    onChange={(e) => setEditingItem({...editingItem, duration: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tags">Etiquetas (separadas por comas)</Label>
                <Input
                  id="tags"
                  value={editingItem.tags?.join(', ') || ''}
                  onChange={(e) => setEditingItem({
                    ...editingItem, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  })}
                  placeholder="Ej: promo, importante, temporal"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewItem?.title}</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {previewItem.type === 'image' && (
                  <img src={previewItem.url} alt={previewItem.title} className="w-full h-full object-contain" />
                )}
                {previewItem.type === 'video' && (
                  <video src={previewItem.url} controls className="w-full h-full" />
                )}
                {previewItem.type === 'webpage' && (
                  <iframe src={previewItem.url} className="w-full h-full border-0" title={previewItem.title} />
                )}
                {previewItem.type === 'pdf' && (
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + previewItem.url)}&embedded=true`}
                    className="w-full h-full border-0" 
                    title={previewItem.title} 
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Tipo:</strong> {previewItem.type}
                </div>
                <div>
                  <strong>Tamaño:</strong> {formatFileSize(previewItem.fileSize)}
                </div>
                <div>
                  <strong>Duración:</strong> {previewItem.duration}s
                </div>
                <div>
                  <strong>Creado:</strong> {formatDate(previewItem.createdAt)}
                </div>
              </div>
              {previewItem.description && (
                <div>
                  <strong>Descripción:</strong>
                  <p className="mt-1 text-sm text-gray-600">{previewItem.description}</p>
                </div>
              )}
              {previewItem.tags && previewItem.tags.length > 0 && (
                <div>
                  <strong>Etiquetas:</strong>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {previewItem.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
