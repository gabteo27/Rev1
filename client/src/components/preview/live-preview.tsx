import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Play, Pause, RotateCcw, Settings } from "lucide-react";
import { useState } from "react";

export default function LivePreview() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("Pantalla Principal");

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Vista Previa en Vivo</CardTitle>
            <CardDescription>Visualización en tiempo real</CardDescription>
          </div>
          <Badge className="bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            En vivo
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview Screen */}
        <div className="bg-slate-900 rounded-lg aspect-video flex items-center justify-center relative overflow-hidden">
          <div className="text-white text-center">
            <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm opacity-75">Conectando a {currentScreen}...</p>
          </div>

          {/* Preview Overlay */}
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className="bg-black/50 text-white border-white/20">
              {currentScreen}
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={isPlaying ? "destructive" : "default"}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Reproducir
                </>
              )}
            </Button>

            <Button size="sm" variant="outline">
              <RotateCcw className="w-4 h-4 mr-1" />
              Reiniciar
            </Button>
          </div>

          <Button size="sm" variant="ghost">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Screen Selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600">Seleccionar Pantalla:</p>
          <div className="grid grid-cols-1 gap-2">
            {["Pantalla Principal", "Pantalla Secundaria", "Pantalla Recepción"].map((screen) => (
              <Button
                key={screen}
                variant={currentScreen === screen ? "default" : "outline"}
                size="sm"
                className="justify-start"
                onClick={() => setCurrentScreen(screen)}
              >
                <Monitor className="w-4 h-4 mr-2" />
                {screen}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}