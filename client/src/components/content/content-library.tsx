import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Globe, 
  Type, 
  Puzzle,
  Image,
  Video,
  FileText,
  Calendar
} from "lucide-react";

export default function ContentLibrary() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { data: content } = useQuery({
    queryKey: ["/api/content"],
    retry: false,
  });

  const recentContent = content?.slice(0, 4) || [];

  const getContentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4 text-blue-600" />;
      case "video":
        return <Video className="w-4 h-4 text-green-600" />;
      case "pdf":
        return <FileText className="w-4 h-4 text-purple-600" />;
      case "webpage":
        return <Globe className="w-4 h-4 text-orange-600" />;
      case "text":
        return <Type className="w-4 h-4 text-yellow-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `Hoy, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffInDays === 1) {
      return `Ayer, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffInDays < 7) {
      return `${diffInDays} días`;
    } else {
      return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    }
  };

  return (
    <Card className="border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Biblioteca de Contenido</h3>
      </div>
      
      <CardContent className="p-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            variant="outline"
            className="p-3 h-auto flex flex-col items-center space-y-2 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-5 h-5 text-blue-600" />
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900">Subir</div>
              <div className="text-xs text-slate-500">Archivos</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="p-3 h-auto flex flex-col items-center space-y-2 hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <Globe className="w-5 h-5 text-green-600" />
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900">Web</div>
              <div className="text-xs text-slate-500">Páginas</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="p-3 h-auto flex flex-col items-center space-y-2 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <Type className="w-5 h-5 text-purple-600" />
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900">Texto</div>
              <div className="text-xs text-slate-500">Custom</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="p-3 h-auto flex flex-col items-center space-y-2 hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
          >
            <Puzzle className="w-5 h-5 text-yellow-600" />
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900">Widget</div>
              <div className="text-xs text-slate-500">Apps</div>
            </div>
          </Button>
        </div>
        
        {/* Recent Files */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">Recientes</h4>
          
          {recentContent.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600 mb-2">No hay contenido reciente</p>
              <p className="text-xs text-slate-500">Los archivos subidos aparecerán aquí</p>
            </div>
          ) : (
            <>
              {recentContent.map((item: any) => (
                <div 
                  key={item.id}
                  className="flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center mr-3">
                    {getContentIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-slate-500">
                        {formatDate(item.createdAt)}
                      </p>
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {content && content.length > 4 && (
                <div className="pt-2 border-t border-slate-200">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs text-slate-600 hover:text-slate-900"
                  >
                    Ver todos ({content.length} archivos)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
