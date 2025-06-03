import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tv, Play, Users, Shield, Clock, Globe } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Tv className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">XcienTV</h1>
                <p className="text-xs text-slate-500">Digital Signage</p>
              </div>
            </div>
            <Button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700">
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-bold text-slate-900 mb-6">
              Gestión de Señalización Digital
              <span className="block text-blue-600">Profesional y Moderna</span>
            </h2>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Controla y administra el contenido de tus pantallas digitales desde una interfaz 
              intuitiva y moderna. Perfecta para empresas, comercios y espacios públicos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleLogin}
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4"
              >
                <Play className="w-5 h-5 mr-2" />
                Comenzar Ahora
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-4 border-slate-300 hover:bg-slate-50"
              >
                Ver Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">
              Funcionalidades Completas
            </h3>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar contenido digital de manera profesional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Tv className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">
                  Gestión de Contenido
                </h4>
                <p className="text-slate-600">
                  Sube imágenes, videos, PDFs y páginas web. Organiza todo tu contenido 
                  de manera eficiente con categorías y etiquetas.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">
                  Editor de Playlists
                </h4>
                <p className="text-slate-600">
                  Crea secuencias personalizadas con duración configurable. 
                  Reordena contenido con drag & drop y preview en tiempo real.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">
                  Múltiples Pantallas
                </h4>
                <p className="text-slate-600">
                  Administra varias pantallas desde un solo panel. Asigna diferentes 
                  playlists y controla el estado en tiempo real.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">
                  Alertas Urgentes
                </h4>
                <p className="text-slate-600">
                  Sistema de notificaciones inmediatas que se superponen al contenido 
                  actual para comunicaciones urgentes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">
                  Widgets Integrados
                </h4>
                <p className="text-slate-600">
                  Reloj, clima, noticias RSS y más. Widgets configurables que 
                  enriquecen tu contenido automáticamente.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">
                  Acceso Remoto
                </h4>
                <p className="text-slate-600">
                  Controla tus pantallas desde cualquier lugar. Interfaz web 
                  responsive y actualizaciones en tiempo real.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl font-bold text-white mb-6">
              ¿Listo para transformar tu comunicación digital?
            </h3>
            <p className="text-xl text-blue-100 mb-8">
              Únete a empresas que ya confían en XcienTV para gestionar 
              su señalización digital de manera profesional.
            </p>
            <Button 
              onClick={handleLogin}
              size="lg" 
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-4"
            >
              <Tv className="w-5 h-5 mr-2" />
              Empezar Gratis
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-900 text-slate-400">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Tv className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">XcienTV</span>
          </div>
          <p className="text-sm">
            © 2024 XcienTV. Plataforma profesional de señalización digital.
          </p>
        </div>
      </footer>
    </div>
  );
}
