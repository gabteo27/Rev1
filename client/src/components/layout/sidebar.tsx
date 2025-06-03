import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Tv, 
  Home, 
  List, 
  Folder, 
  Monitor, 
  AlertTriangle, 
  Calendar, 
  Puzzle,
  BarChart3,
  Settings,
  LogOut
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Playlists", href: "/playlists", icon: List },
  { name: "Contenido", href: "/content", icon: Folder },
  { name: "Pantallas", href: "/screens", icon: Monitor },
  { name: "Alertas", href: "/alerts", icon: AlertTriangle },
  { name: "Programación", href: "/scheduling", icon: Calendar },
  { name: "Widgets", href: "/widgets", icon: Puzzle },
];

const secondaryNavigation = [
  { name: "Analíticas", href: "/analytics", icon: BarChart3 },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-slate-200">
        {/* Logo Section */}
        <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-slate-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-slate-900">XcienTV</h1>
              <p className="text-xs text-slate-500">Digital Signage</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <item.icon 
                    className={`mr-3 w-5 h-5 ${
                      isActive ? "text-blue-500" : "text-slate-400"
                    }`} 
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
          
          <div className="pt-6 border-t border-slate-200">
            <div className="space-y-1">
              {secondaryNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <item.icon 
                      className={`mr-3 w-5 h-5 ${
                        isActive ? "text-blue-500" : "text-slate-400"
                      }`} 
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-slate-200">
          <div className="flex items-center">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {getInitials(user?.firstName, user?.lastName)}
                </span>
              </div>
            )}
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-slate-900">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || "Usuario"
                }
              </p>
              <p className="text-xs text-slate-500">
                {user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-600 p-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
