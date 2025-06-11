import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, RefreshCw, AlertTriangle } from "lucide-react";
import ContentPlayer from '@/components/player/ContentPlayer';
import { apiRequest } from '@/lib/queryClient'; // ✅ Asegúrate de importar apiRequest

export default function ScreenPlayerPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const screenId = urlParams.get('screenId');

  const { data: screen, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/screens/${screenId}`],
    queryFn: () => apiRequest(`/api/screens/${screenId}`).then(res => res.json()), // ✅ Usar apiRequest para la consistencia
    enabled: !!screenId,
    retry: 1,
  });

  if (!screenId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <Card className="w-96 bg-gray-800 text-white border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle/>Error</CardTitle>
            <CardDescription>ID de pantalla no especificado en la URL.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando pantalla...</p>
        </div>
      </div>
    );
  }

  if (error || !screen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <Card className="w-96 bg-gray-800 text-white border-gray-700">
          <CardHeader>
            <CardTitle>Error al Cargar</CardTitle>
            <CardDescription>{error?.message || "No se pudo cargar la información de la pantalla."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!screen.playlistId) {
    return (
        <div className="w-full h-screen flex items-center justify-center text-white bg-black">
          <div className="text-center">
            <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl mb-2">Pantalla '{screen.name}' lista</h3>
            <p className="opacity-75">Asigna una playlist desde el panel de administración para comenzar.</p>
          </div>
        </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black">
      <ContentPlayer 
        screenId={screen.id}
        playlistId={screen.playlistId}
        isPreview={true}
        className="w-full h-full"
      />
    </div>
  );
}