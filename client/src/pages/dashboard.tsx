import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentLibrary } from "@/components/content/content-library";
import { WidgetPanel } from "@/components/widgets/widget-panel";
import { LivePreview } from "@/components/preview/live-preview";
import { PlaylistEditor } from "@/components/playlist/playlist-editor";
import { Tv, List, Folder, Clock } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: playlists } = useQuery({
    queryKey: ["/api/playlists"],
    retry: false,
  });

  const { data: content } = useQuery({
    queryKey: ["/api/content"],
    retry: false,
  });

  const { data: screens } = useQuery({
    queryKey: ["/api/screens"],
    retry: false,
  });

  // Calculate stats from fetched data
  const activeScreens = screens?.filter((s: any) => s.isOnline)?.length || 0;
  const totalPlaylists = playlists?.length || 0;
  const totalFiles = content?.length || 0;
  const totalDuration = playlists?.reduce((acc: number, p: any) => acc + (p.totalDuration || 0), 0) || 0;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Dashboard"
        subtitle="Gestiona tu contenido digital y playlists"
      />

      <div className="flex-1 px-6 py-6 overflow-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Tv className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Pantallas Activas</p>
                  <p className="text-2xl font-bold text-slate-900">{activeScreens}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <List className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Playlists</p>
                  <p className="text-2xl font-bold text-slate-900">{totalPlaylists}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Folder className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Archivos</p>
                  <p className="text-2xl font-bold text-slate-900">{totalFiles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Tiempo Total</p>
                  <p className="text-2xl font-bold text-slate-900">{formatDuration(totalDuration)}</p>
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
    </div>
  );
}