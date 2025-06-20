
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import UploadModal from "@/components/content/upload-modal";
import EditModal from "@/components/content/edit-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Image, 
  Video, 
  FileText, 
  Globe, 
  Type,
  Calendar,
  Trash2,
  Edit,
  Download,
  Folder,
  Search,
  Grid3X3,
  List,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  X
} from "lucide-react";

export default function Content() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("created-desc");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: content = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/content"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/content");
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Content loaded:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching content:', error);
        return [];
      }
    },
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/content/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contenido eliminado",
        description: "El contenido ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setSelectedItems([]);
    },
    onError: (error: any) => {
      console.error("Error deleting content:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el contenido.",
        variant: "destructive",
      });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map(async id => {
        const response = await apiRequest(`/api/content/${id}`, { method: "DELETE" });
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Error ${response.status}: ${errorData}`);
        }
        return response.json();
      }));
      
      const failed = results.filter(result => result.status === 'rejected');
      if (failed.length > 0) {
        throw new Error(`${failed.length} elementos no pudieron ser eliminados`);
      }
    },
    onSuccess: () => {
      toast({
        title: "Contenido eliminado", 
        description: `${selectedItems.length} elementos eliminados correctamente.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setSelectedItems([]);
    },
    onError: (error: any) => {
      console.error("Batch delete error:", error);
      toast({
        title: "Error", 
        description: error.message || "Error eliminando contenido seleccionado",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { duration, ...updateData } = data;
      const response = await apiRequest(`/api/content/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contenido actualizado",
        description: "El contenido ha sido actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setEditModalOpen(false);
      setEditingContent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el contenido.",
        variant: "destructive",
      });
    },
  });

  const getContentIcon = (type: string) => {
    const iconProps = { className: "w-5 h-5" };
    switch (type) {
      case "image":
        return <Image {...iconProps} style={{ color: '#2563eb' }} />;
      case "video":
        return <Video {...iconProps} style={{ color: '#16a34a' }} />;
      case "pdf":
        return <FileText {...iconProps} style={{ color: '#9333ea' }} />;
      case "webpage":
        return <Globe {...iconProps} style={{ color: '#ea580c' }} />;
      case "text":
        return <Type {...iconProps} style={{ color: '#ca8a04' }} />;
      default:
        return <FileText {...iconProps} style={{ color: '#64748b' }} />;
    }
  };

  const getContentBadgeColor = (type: string) => {
    switch (type) {
      case "image":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "video":
        return "bg-green-100 text-green-800 border-green-200";
      case "pdf":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "webpage":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "text":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const categories = ["Promociones", "Institucional", "Noticias", "Entretenimiento", "Información"];
  const contentTypes = [
    { value: "all", label: "Todos los tipos" },
    { value: "image", label: "Imágenes" },
    { value: "video", label: "Videos" },
    { value: "pdf", label: "PDFs" },
    { value: "webpage", label: "Páginas web" },
    { value: "text", label: "Texto" }
  ];

  const sortOptions = [
    { value: 'created-desc', label: 'Más recientes primero' },
    { value: 'created-asc', label: 'Más antiguos primero' },
    { value: 'title-asc', label: 'Título A-Z' },
    { value: 'title-desc', label: 'Título Z-A' },
    { value: 'size-desc', label: 'Tamaño mayor a menor' },
    { value: 'size-asc', label: 'Tamaño menor a mayor' },
  ];

  // Filter and sort content
  const filteredContent = content.filter((item: any) => {
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    const matchesType = selectedType === "all" ? true : item.type === selectedType;
    const matchesSearch = searchTerm ? 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;
    return matchesCategory && matchesType && matchesSearch;
  }).sort((a: any, b: any) => {
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

  const handleEdit = (item: any) => {
    setEditingContent(item);
    setEditModalOpen(true);
  };

  const handlePreview = (item: any) => {
    setPreviewContent(item);
    setPreviewModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingContent.title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido.",
        variant: "destructive",
      });
      return;
    }

    const updateData = {
      ...editingContent,
      category: editingContent.category === "none" ? "" : editingContent.category,
      tags: editingContent.tags ? editingContent.tags.split(",").map((t: string) => t.trim()) : [],
    };

    updateMutation.mutate(updateData);
  };

  const toggleItemSelected = (itemId: number) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredContent.map((item: any) => item.id);
    setSelectedItems(visibleIds);
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Header title="Contenido" subtitle="Gestiona tus archivos multimedia" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando contenido...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Header title="Contenido" subtitle="Gestiona tus archivos multimedia" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error al cargar contenido
            </h3>
            <p className="text-muted-foreground mb-6">
              {error.message || "No se pudo cargar el contenido. Por favor, intenta nuevamente."}
            </p>
            <Button onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Contenido"
        subtitle="Gestiona tus archivos multimedia"
        actions={
          <Button onClick={() => setUploadModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Contenido
          </Button>
        }
      />

      <div className="flex-1 px-6 py-6 overflow-y-auto min-h-0">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Type Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <SortAsc className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedItems.length} elemento(s) seleccionado(s)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Deseleccionar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAllVisible}
              >
                Seleccionar todos visibles
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

        {/* Content Display */}
        {!filteredContent || filteredContent.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No se encontró contenido" :
                 selectedCategory ? `No hay contenido en ${selectedCategory}` : "No tienes contenido aún"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? "Intenta con otro término de búsqueda." :
                 selectedCategory 
                  ? "Intenta seleccionar otra categoría o sube nuevo contenido."
                  : "Comienza subiendo imágenes, videos, PDFs o agregando páginas web."
                }
              </p>
              <Button onClick={() => setUploadModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Subir Contenido
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContent.map((item: any) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Content Preview */}
                  <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                    {item.type === "image" && item.url && (
                      <img 
                        src={item.url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {item.type === "video" && item.url && (
                      <video 
                        src={item.url} 
                        className="w-full h-full object-cover"
                        muted
                        onError={(e) => {
                          (e.target as HTMLVideoElement).style.display = 'none';
                        }}
                      />
                    )}
                    {item.type === "pdf" && item.url && (
                      <div className="w-full h-full flex items-center justify-center bg-red-50">
                        <div className="text-center">
                          {getContentIcon(item.type)}
                          <div className="text-xs text-gray-600 mt-1">PDF</div>
                        </div>
                      </div>
                    )}
                    {(item.type === "webpage" || item.type === "text" || 
                      (!item.url || (item.type !== "image" && item.type !== "video" && item.type !== "pdf"))) && (
                      <div className="w-full h-full flex items-center justify-center">
                        {getContentIcon(item.type)}
                      </div>
                    )}

                    {/* Selection Checkbox */}
                    <div className="absolute top-3 right-3">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleItemSelected(item.id)}
                        className="bg-white/90"
                      />
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={getContentBadgeColor(item.type)}>
                        {item.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="p-4">
                    <h4 className="font-semibold mb-1 truncate">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(item.createdAt)}
                      </div>
                      {item.fileSize && (
                        <div className="flex items-center">
                          <Download className="w-3 h-3 mr-1" />
                          {formatFileSize(item.fileSize)}
                        </div>
                      )}
                      {item.category && (
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2"
                        onClick={() => handlePreview(item)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2 text-red-600 hover:text-red-700"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {filteredContent.map((item: any) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    {/* Selection Checkbox */}
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleItemSelected(item.id)}
                    />

                    {/* Content Preview */}
                    <div className="w-20 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                      {item.type === "image" && item.url ? (
                        <img 
                          src={item.url} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getContentIcon(item.type)}
                        </div>
                      )}
                    </div>

                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold truncate">
                              {item.title}
                            </h4>
                            <Badge className={getContentBadgeColor(item.type)}>
                              {item.type}
                            </Badge>
                          </div>

                          {item.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                              {item.description}
                            </p>
                          )}

                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(item.createdAt)}
                            </div>
                            {item.fileSize && (
                              <div className="flex items-center">
                                <Download className="w-3 h-3 mr-1" />
                                {formatFileSize(item.fileSize)}
                              </div>
                            )}
                            {item.category && (
                              <Badge variant="outline" className="text-xs">
                                {item.category}
                              </Badge>
                            )}
                          </div>

                          {/* Tags */}
                          {item.tags && item.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.tags.slice(0, 4).map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {item.tags.length > 4 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{item.tags.length - 4}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 px-2"
                            onClick={() => handlePreview(item)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 px-2"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 px-2 text-red-600 hover:text-red-700"
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Contenido</DialogTitle>
          </DialogHeader>

          {editingContent && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-title">Título *</Label>
                <Input
                  id="edit-title"
                  value={editingContent.title}
                  onChange={(e) => setEditingContent({...editingContent, title: e.target.value})}
                  placeholder="Título del contenido"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={editingContent.description}
                  onChange={(e) => setEditingContent({...editingContent, description: e.target.value})}
                  placeholder="Descripción opcional"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-category">Categoría</Label>
                <Select 
                  value={editingContent.category} 
                  onValueChange={(value) => setEditingContent({...editingContent, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-tags">Etiquetas</Label>
                <Input
                  id="edit-tags"
                  value={editingContent.tags}
                  onChange={(e) => setEditingContent({...editingContent, tags: e.target.value})}
                  placeholder="promoción, verano, descuento"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separa las etiquetas con comas
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Vista Previa: {previewContent?.title}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPreviewModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {previewContent && (
            <div className="space-y-4">
              {/* Content Preview */}
              <div className="bg-black rounded-lg overflow-hidden">
                {previewContent.type === "image" && (
                  <img 
                    src={previewContent.url} 
                    alt={previewContent.title}
                    className="w-full max-h-96 object-contain"
                  />
                )}
                {previewContent.type === "video" && (
                  <video 
                    src={previewContent.url} 
                    controls
                    className="w-full max-h-96"
                  />
                )}
                {previewContent.type === "pdf" && (
                  <div className="h-96 flex items-center justify-center text-white">
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4" />
                      <p>Vista previa de PDF no disponible</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => window.open(previewContent.url, '_blank')}
                      >
                        Abrir PDF
                      </Button>
                    </div>
                  </div>
                )}
                {(previewContent.type === "webpage" || previewContent.type === "text") && (
                  <div className="h-96 flex items-center justify-center text-white">
                    <div className="text-center">
                      {getContentIcon(previewContent.type)}
                      <p className="mt-4">Vista previa no disponible para este tipo de contenido</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Tipo:</strong> {previewContent.type}
                </div>
                <div>
                  <strong>Categoría:</strong> {previewContent.category || "Sin categoría"}
                </div>
                <div>
                  <strong>Tamaño:</strong> {formatFileSize(previewContent.fileSize)}
                </div>
                <div>
                  <strong>Fecha:</strong> {formatDate(previewContent.createdAt)}
                </div>
                {previewContent.description && (
                  <div className="col-span-2">
                    <strong>Descripción:</strong> {previewContent.description}
                  </div>
                )}
                {previewContent.tags && previewContent.tags.length > 0 && (
                  <div className="col-span-2">
                    <strong>Etiquetas:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewContent.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UploadModal 
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setEditingContent(null);
        }}
      />

      <EditModal 
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingContent(null);
        }}
        content={editingContent}
      />
    </div>
  );
}
