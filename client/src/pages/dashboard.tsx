
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tv, List, Folder, Clock } from "lucide-react";
import PlaylistEditor from "@/components/playlist/playlist-editor";
import LivePreview from "@/components/preview/live-preview";
import ContentLibrary from "@/components/content/content-library";
import WidgetPanel from "@/components/widgets/widget-panel";

export default function Dashboard() {
  const [activeScreens, setActiveScreens] = useState(0);
  const [totalPlaylists, setTotalPlaylists] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    // Simular datos para mostrar en el dashboard
    setActiveScreens(5);
    setTotalPlaylists(12);
    setTotalFiles(48);
    setTotalDuration(7200); // 2 horas en segundos
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Vista General</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 px-6 py-6 overflow-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Tv className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pantallas Activas</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeScreens}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <List className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Playlists</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalPlaylists}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Folder className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Archivos</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalFiles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Tiempo Total</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatDuration(totalDuration)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Playlist Editor - Left Column */}
          <div className="lg:col-span-2">
            <PlaylistEditor />
          </div>

          {/* Preview and Widgets - Right Column */}
          <div className="space-y-6">
            <LivePreview />
            <ContentLibrary />
            <WidgetPanel />
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
