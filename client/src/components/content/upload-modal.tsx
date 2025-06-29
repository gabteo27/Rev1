import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CloudUpload, 
  X, 
  FileText, 
  Image, 
  Video,
  Globe,
  Upload
} from "lucide-react";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadModal({ open, onClose }: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(30);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const categories = ["Promociones", "Institucional", "Noticias", "Entretenimiento", "Información"];

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const response = await fetch("/api/content", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Contenido subido",
        description: "El contenido ha sido subido exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error al subir",
        description: "No se pudo subir el contenido. Intenta nuevamente.",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const urlMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/content", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "URL agregada",
        description: "La URL ha sido agregada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar la URL.",
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    // Si ya hay un archivo seleccionado, no permitir más
    if (selectedFiles.length > 0) {
      toast({
        title: "Solo un archivo permitido",
        description: "Ya tienes un archivo seleccionado. Elimínalo primero para subir otro.",
        variant: "destructive",
      });
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => isValidFileType(file));

    if (validFiles.length !== files.length) {
      toast({
        title: "Archivos no válidos",
        description: "Algunos archivos no son compatibles y fueron omitidos.",
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      // Solo tomar el primer archivo válido
      const firstFile = validFiles[0];
      // Limpiar URL al seleccionar archivos
      setUrl("");
      setSelectedFiles([firstFile]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Si ya hay un archivo seleccionado, no permitir más
    if (selectedFiles.length > 0) {
      toast({
        title: "Solo un archivo permitido",
        description: "Ya tienes un archivo seleccionado. Elimínalo primero para subir otro.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => isValidFileType(file));

    if (validFiles.length > 0) {
      // Solo tomar el primer archivo válido
      const firstFile = validFiles[0];
      // Limpiar URL al seleccionar archivos
      setUrl("");
      setSelectedFiles([firstFile]);
    }

    // Limpiar el input para permitir seleccionar el mismo archivo después de eliminarlo
    e.target.value = '';
  };

  const isValidFileType = (file: File) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png", 
      "image/gif",
      "video/mp4",
      "application/pdf"
    ];
    return allowedTypes.includes(file.type);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="w-4 h-4 text-blue-600" />;
    } else if (file.type.startsWith("video/")) {
      return <Video className="w-4 h-4 text-green-600" />;
    } else if (file.type === "application/pdf") {
      return <FileText className="w-4 h-4 text-purple-600" />;
    }
    return <FileText className="w-4 h-4 text-slate-600" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona un archivo para subir.",
        variant: "destructive",
      });
      return;
    }

    if (url.trim()) {
      toast({
        title: "Error",
        description: "No puedes subir archivos y una URL al mismo tiempo. Elige una opción.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    // Solo subir el archivo seleccionado
    formData.append("file", selectedFiles[0]);

    formData.append("title", title);
    formData.append("description", description);
    formData.append("type", getFileType(selectedFiles[0]));
    formData.append("category", category);
    formData.append("tags", tags);

    uploadMutation.mutate(formData);
  };

  const handleUrlSubmit = () => {
    if (!url || !title) {
      toast({
        title: "Error",
        description: "La URL y el título son requeridos.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length > 0) {
      toast({
        title: "Error",
        description: "No puedes agregar una URL y subir archivos al mismo tiempo. Elige una opción.",
        variant: "destructive",
      });
      return;
    }

    // Auto-fix and validate URL format
    let processedUrl = url.trim();

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

    const urlData = {
      title,
      description,
      type: "webpage",
      url: processedUrl,
      duration: parseInt(duration.toString()) || 30,
      category: category === "none" ? "" : category,
      tags: tags ? tags.split(",").map(t => t.trim()) : [],
    };

    urlMutation.mutate(urlData);
  };

  const getFileType = (file: File) => {
    let type = '';
    if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type === 'application/pdf') {
        type = 'pdf';
      } else {
        type = 'webpage'; // Default for other file types
      }
    return type;
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setUrl("");
    setTitle("");
    setDescription("");
    setCategory("");
    setTags("");
    setDuration(30);
    setUploadProgress(0);
    setIsUploading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CloudUpload className="w-5 h-5 mr-2" />
            Subir Contenido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Archivos
            </Label>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                selectedFiles.length > 0
                  ? "border-slate-200 bg-slate-100 opacity-60"
                  : dragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-300 hover:border-blue-400"
              }`}
              onDragEnter={selectedFiles.length === 0 ? handleDrag : undefined}
              onDragLeave={selectedFiles.length === 0 ? handleDrag : undefined}
              onDragOver={selectedFiles.length === 0 ? handleDrag : undefined}
              onDrop={selectedFiles.length === 0 ? handleDrop : undefined}
            >
              <CloudUpload className={`w-12 h-12 mx-auto mb-4 ${selectedFiles.length > 0 ? 'text-slate-300' : 'text-slate-400'}`} />
              <p className={`text-lg font-medium mb-2 ${selectedFiles.length > 0 ? 'text-slate-500' : 'text-slate-900'}`}>
                {selectedFiles.length > 0 ? 'Archivo seleccionado' : 'Arrastra archivos aquí o haz clic para seleccionar'}
              </p>
              <p className={`text-sm mb-4 ${selectedFiles.length > 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                {selectedFiles.length > 0 ? 'Solo se permite un archivo a la vez' : 'Soporta imágenes (JPG, PNG, GIF), videos (MP4), PDFs'}
              </p>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedFiles.length > 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {selectedFiles.length > 0 ? 'Archivo Seleccionado' : 'Seleccionar Archivo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={selectedFiles.length > 0}
              />
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Archivos seleccionados
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center p-2 bg-slate-50 rounded-lg"
                  >
                    {getFileIcon(file)}
                    <div className="ml-2 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="p-1 h-auto"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O</span>
            </div>
          </div>

          {/* URL Input */}
          <div>
            <Label htmlFor="url" className="text-sm font-medium text-slate-700 mb-2 block">
              Agregar página web por URL
            </Label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    // Limpiar archivos al escribir URL
                    if (e.target.value.trim() && selectedFiles.length > 0) {
                      setSelectedFiles([]);
                    }
                  }}
                  placeholder="https://ejemplo.com/pagina-web"
                  className="pl-10"
                  disabled={selectedFiles.length > 0}
                />
              </div>
              <Button
                onClick={handleUrlSubmit}
                disabled={urlMutation.isPending || !url || !title || selectedFiles.length > 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {urlMutation.isPending ? "Agregando..." : "Agregar URL"}
              </Button>
            </div>
            {selectedFiles.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Elimina los archivos seleccionados para agregar una URL
              </p>
            )}
          </div>

          {/* Content Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del contenido"
                required
              />
            </div>

            <div>
              <Label htmlFor="duration">Duración (segundos)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                min="1"
                max="3600"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tags">Etiquetas</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="verano, promoción, descuento"
              />
              <p className="text-xs text-slate-500 mt-1">
                Separa las etiquetas con comas
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-slate-700">
                  Subiendo archivo...
                </Label>
                <span className="text-sm text-slate-600">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleFileUpload}
              disabled={uploadMutation.isPending || selectedFiles.length === 0 || !title}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadMutation.isPending ? "Subiendo..." : "Subir Contenido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}