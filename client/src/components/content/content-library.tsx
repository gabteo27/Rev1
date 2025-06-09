import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image, Video, FileText, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export function ContentLibrary() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: content } = useQuery({
    queryKey: ["/api/content"],
    retry: false,
  });

  const getContentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "pdf":
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getContentBadgeColor = (type: string) => {
    switch (type) {
      case "image":
        return "bg-blue-100 text-blue-800";
      case "video":
        return "bg-purple-100 text-purple-800";
      case "pdf":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredContent = content?.filter((item: any) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Biblioteca de Contenido</CardTitle>
            <CardDescription>Archivos recientes</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Subir
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Buscar contenido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content List */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {filteredContent?.slice(0, 10).map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                    {getContentIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.category || "Sin categoría"}
                    </p>
                  </div>
                </div>
                <Badge className={getContentBadgeColor(item.type)}>
                  {item.type}
                </Badge>
              </div>
            ))}

            {(!filteredContent || filteredContent.length === 0) && (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontró contenido</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
          <span>{content?.length || 0} archivos totales</span>
          <span>Última subida hace 2h</span>
        </div>
      </CardContent>
    </Card>
  );
}