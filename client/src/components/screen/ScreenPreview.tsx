import React from 'react';
import { Loader2 } from 'lucide-react';

interface ScreenPreviewProps {
  screenId: number;
}

export const ScreenPreview: React.FC<ScreenPreviewProps> = ({ screenId }) => {
  const [isLoading, setIsLoading] = React.useState(true);

  // Usamos la ruta que ya tienes para visualizar el reproductor de una pantalla específica
  const playerUrl = `/screen-player?screenId=${screenId}`;

  return (
    <div className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 mt-4">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-50">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="mt-2 text-xs">Cargando vista previa...</span>
        </div>
      )}
      <iframe
        src={playerUrl}
        title={`Vista previa de la Pantalla ${screenId}`}
        className={`w-full h-full border-0 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        // El sandbox añade una capa de seguridad
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};