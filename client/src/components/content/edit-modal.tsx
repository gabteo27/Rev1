
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Edit } from "lucide-react";

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  content: any;
}

export default function EditModal({ open, onClose, content }: EditModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    category: "",
    tags: "",
    duration: 30
  });

  const { toast } = useToast();
  const categories = ["Promociones", "Institucional", "Noticias", "Entretenimiento", "Información"];

  useEffect(() => {
    if (content) {
      setFormData({
        title: content.title || "",
        description: content.description || "",
        url: content.url || "",
        category: content.category || "none",
        tags: Array.isArray(content.tags) ? content.tags.join(", ") : (content.tags || ""),
        duration: content.duration || 30
      });
    }
  }, [content]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/content/${content.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
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
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el contenido.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido.",
        variant: "destructive",
      });
      return;
    }

    // Validar URL para webpages
    if (content.type === "webpage" && formData.url) {
      let processedUrl = formData.url.trim();
      
      // Add protocol if missing
      if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = 'https://' + processedUrl;
      }

      try {
        new URL(processedUrl);
      } catch (error) {
        toast({
          title: "Error",
          description: "Por favor ingresa una URL válida (ej: https://ejemplo.com)",
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({ ...prev, url: processedUrl }));
    }

    const updateData = {
      title: formData.title,
      description: formData.description,
      category: formData.category === "none" || formData.category === "" ? "" : formData.category,
      tags: formData.tags ? formData.tags.split(",").map((t: string) => t.trim()) : [],
      duration: parseInt(formData.duration.toString()) || 30,
      ...(content.type === "webpage" && { url: formData.url })
    };

    updateMutation.mutate(updateData);
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      url: "",
      category: "",
      tags: "",
      duration: 30
    });
    onClose();
  };

  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="w-5 h-5 mr-2" />
            Editar Contenido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-title">Título *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Título del contenido"
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción opcional"
              rows={3}
            />
          </div>

          {/* URL field only for webpages */}
          {content.type === "webpage" && (
            <div>
              <Label htmlFor="edit-url">URL *</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="edit-url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://ejemplo.com"
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-category">Categoría</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
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
              <Label htmlFor="edit-duration">Duración (segundos)</Label>
              <Input
                id="edit-duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                min="1"
                max="3600"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-tags">Etiquetas</Label>
            <Input
              id="edit-tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="promoción, verano, descuento"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separa las etiquetas con comas
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
