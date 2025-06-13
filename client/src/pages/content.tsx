import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import UploadModal from "@/components/content/upload-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Folder
} from "lucide-react";

export default function Content() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Contenido eliminado",
        description: "El contenido ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el contenido.",
        variant: "destructive",
      });
    },
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

  const filteredContent = selectedCategory 
    ? content.filter((item: any) => item.category === selectedCategory)
    : content;

  const handleEdit = (item: any) => {
    setEditingContent({
      id: item.id,
      title: item.title,
      description: item.description || "",
      category: item.category || "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : (item.tags || ""),
    });
    setEditModalOpen(true);
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
        {/* Category Filter */}
        <div className="mb-6">
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

        {/* Content Grid */}
        {!filteredContent || filteredContent.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {selectedCategory ? `No hay contenido en ${selectedCategory}` : "No tienes contenido aún"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {selectedCategory 
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
        ) : (
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
                    <div className="mt-4 flex justify-between items-center">
                      <div className="flex space-x-2">
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
                      <Button size="sm" className="h-8 px-3 text-xs">
                        Usar
                      </Button>
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

      <UploadModal 
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </div>
  );
}