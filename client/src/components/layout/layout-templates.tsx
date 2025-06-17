
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout, Grid3X3, Sidebar, Header, Columns3, Rows3 } from "lucide-react";

const layoutTemplates = [
  {
    id: 'retail_promo',
    name: 'Promociones Retail',
    description: 'Perfecto para tiendas con promociones y ofertas',
    icon: Grid3X3,
    layout: 'grid_2x2',
    preview: '/api/templates/retail_promo.png',
    zones: ['Ofertas', 'Destacados', 'Novedades', 'Información']
  },
  {
    id: 'restaurant_menu',
    name: 'Menú Digital',
    description: 'Layout ideal para restaurantes y cafeterías',
    icon: Columns3,
    layout: 'triple_vertical',
    preview: '/api/templates/restaurant_menu.png',
    zones: ['Entradas', 'Platos Principales', 'Postres']
  },
  {
    id: 'corporate_news',
    name: 'Noticias Corporativas',
    description: 'Para lobbies y áreas comunes empresariales',
    icon: Header,
    layout: 'header_footer',
    preview: '/api/templates/corporate_news.png',
    zones: ['Cabecera', 'Noticias', 'Pie de Página']
  },
  {
    id: 'event_schedule',
    name: 'Agenda de Eventos',
    description: 'Mostrar horarios y programaciones',
    icon: Rows3,
    layout: 'triple_horizontal',
    preview: '/api/templates/event_schedule.png',
    zones: ['Eventos Matutinos', 'Eventos Tarde', 'Eventos Noche']
  },
  {
    id: 'info_dashboard',
    name: 'Dashboard Informativo',
    description: 'Panel de información con sidebar',
    icon: Sidebar,
    layout: 'sidebar_left',
    preview: '/api/templates/info_dashboard.png',
    zones: ['Información Fija', 'Contenido Dinámico']
  }
];

interface LayoutTemplatesProps {
  onSelectTemplate: (template: any) => void;
  onCustomLayout: () => void;
}

export function LayoutTemplates({ onSelectTemplate, onCustomLayout }: LayoutTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Elige un Layout para tu Playlist</h2>
        <p className="text-gray-600">Selecciona una plantilla predefinida o crea tu propio diseño personalizado</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {layoutTemplates.map((template) => {
          const IconComponent = template.icon;
          return (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">{template.layout.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                
                <div className="bg-gray-100 rounded-lg p-3 mb-3 h-32 flex items-center justify-center">
                  <div className="text-xs text-gray-500 text-center">
                    Vista previa del layout<br />
                    <span className="font-medium">{template.zones.length} zonas</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Zonas incluidas:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.zones.map((zone, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-3"
                  variant={selectedTemplate === template.id ? "default" : "outline"}
                  onClick={() => onSelectTemplate(template)}
                >
                  {selectedTemplate === template.id ? 'Seleccionado' : 'Usar Plantilla'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="border-t pt-6">
        <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
          <CardContent className="p-6 text-center">
            <Layout className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">¿Necesitas algo más específico?</h3>
            <p className="text-gray-600 mb-4">
              Crea tu propio layout personalizado con el editor libre. 
              Arrastra, redimensiona y organiza las zonas como necesites.
            </p>
            <Button onClick={onCustomLayout} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              <Layout className="w-4 h-4 mr-2" />
              Crear Layout Personalizado
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
