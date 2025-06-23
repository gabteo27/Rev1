
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertOverlay } from "./AlertOverlay";
import type { Playlist, PlaylistItem, Widget, Alert } from "@shared/schema";
import { wsManager } from "@/lib/websocket";
import { API_BASE_URL, apiFetch } from "@/lib/api";

// ===================================================================================
// ESTILOS Y CONSTANTES
// ===================================================================================

const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "#000",
    color: "white",
    overflow: "hidden",
  } as React.CSSProperties,
  media: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  } as React.CSSProperties,
  zone: {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  } as React.CSSProperties,
  debugInfo: {
    position: "absolute",
    top: "10px",
    left: "10px",
    color: "white",
    fontSize: "12px",
    opacity: 0.7,
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: "5px",
    borderRadius: "3px",
  } as React.CSSProperties,
};

const getMediaStyle = (objectFit: string = "contain"): React.CSSProperties => ({
  width: "100%",
  height: "100%",
  objectFit: objectFit as any,
});

// ===================================================================================
// COMPONENTES DE CONTENIDO MEMOIZADOS
// ===================================================================================

const ImagePlayer = React.memo(({ src, objectFit }: { src: string; objectFit?: string }) => (
  <img
    src={src}
    style={getMediaStyle(objectFit)}
    alt="Imagen de contenido"
    loading="eager"
  />
));

const VideoPlayer = React.memo(({
  src,
  objectFit,
  onEnded,
}: {
  src: string;
  objectFit?: string;
  onEnded: () => void;
}) => (
  <video
    src={src}
    style={getMediaStyle(objectFit)}
    autoPlay
    muted
    onEnded={onEnded}
    playsInline
  />
));

const WebpagePlayer = React.memo(({ src }: { src: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div style={{ 
        ...styles.media, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'rgba(255,255,255,0.7)',
        fontSize: '18px',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🌐</div>
          <div>Error cargando página web</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>{src}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.media, position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
          zIndex: 1
        }}>
          <div>Cargando página web...</div>
        </div>
      )}
      <iframe 
        src={src} 
        style={{ ...styles.media, border: 'none' }} 
        title="web-content"
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
});

const PDFPlayer = React.memo(({ src }: { src: string }) => {
  const [error, setError] = useState(false);
  const pdfViewerUrl = src.startsWith('http') 
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`
    : `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + src)}&embedded=true`;

  if (error) {
    return (
      <div style={{ 
        ...styles.media, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'rgba(255,255,255,0.7)',
        fontSize: '18px',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📄</div>
          <div>Error cargando PDF</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>{src}</div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={pdfViewerUrl}
      style={{ ...styles.media, border: "none", background: "#f5f5f5" }}
      title="PDF document"
      loading="eager"
      sandbox="allow-scripts allow-same-origin"
      onError={() => setError(true)}
    />
  );
});

const YouTubePlayer = React.memo(({ url }: { url: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const getYouTubeID = (ytUrl: string): string | null => {
    if (!ytUrl || typeof ytUrl !== "string") return null;
    const cleanUrl = ytUrl.trim();
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
      try {
        const match = cleanUrl.match(pattern);
        if (match && match[1] && match[1].length === 11) {
          return match[1];
        }
      } catch (e) {
        console.error("Error matching YouTube URL pattern:", e);
      }
    }
    return null;
  };

  const videoId = getYouTubeID(url);

  if (error || !videoId) {
    return (
      <div style={{
        ...styles.media,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: 'rgba(255,255,255,0.7)',
        fontSize: '18px',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📺</div>
          <div>URL de YouTube no válida</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>{url}</div>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&iv_load_policy=3&modestbranding=1&rel=0`;

  return (
    <div style={{ ...styles.media, position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
          zIndex: 1
        }}>
          <div>Cargando video de YouTube...</div>
        </div>
      )}
      <iframe
        key={videoId}
        src={embedUrl}
        style={{ ...styles.media, border: "none" }}
        title="YouTube Player"
        allow="autoplay; encrypted-media; picture-in-picture"
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
      />
    </div>
  );
});

// ===================================================================================
// COMPONENTES DE WIDGETS
// ===================================================================================

const getPositionStyles = (position: string) => {
  switch (position) {
    case "top-left":
      return { top: "20px", left: "20px" };
    case "top-right":
      return { top: "20px", right: "20px" };
    case "bottom-left":
      return { bottom: "20px", left: "20px" };
    case "bottom-right":
      return { bottom: "20px", right: "20px" };
    case "center":
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    default:
      return { bottom: "20px", right: "20px" };
  }
};

const ClockWidget = React.memo(({ config, position }: { config: any; position: string }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      timeZone: config?.timezone || 'America/Mexico_City',
      hour: "2-digit",
      minute: "2-digit",
      hour12: config?.format === "12h",
    }).format(date);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      timeZone: config?.timezone || 'America/Mexico_City',
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);

  return (
    <div
      style={{
        position: "absolute",
        ...getPositionStyles(position),
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: "10px 15px",
        borderRadius: "8px",
        zIndex: 1000,
        fontFamily: "sans-serif",
        color: "white",
      }}
    >
      <div style={{ fontSize: "2em", fontWeight: "bold" }}>
        {formatTime(time)}
      </div>
      <div style={{ fontSize: "0.8em", opacity: 0.8 }}>
        {formatDate(time)}
      </div>
    </div>
  );
});

const WidgetRenderer = React.memo(({ widget }: { widget: Widget }) => {
  if (!widget.isEnabled) return null;

  let config = {};
  try {
    config = JSON.parse(widget.settings || "{}");
  } catch (e) {
    console.warn("Error parsing widget config:", e);
  }

  switch (widget.type) {
    case "clock":
      return (
        <ClockWidget
          config={config}
          position={widget.position || "bottom-right"}
        />
      );
    default:
      return null;
  }
});

// ===================================================================================
// RENDERIZADO DE CONTENIDO
// ===================================================================================

const renderContentItem = (
  item: PlaylistItem,
  onVideoEnded: () => void,
  playlist: Playlist,
  zoneId?: string,
) => {
  if (!item?.contentItem) {
    return (
      <div style={{
        ...styles.media,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1a1a",
        color: "rgba(255,255,255,0.5)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>📂</div>
          <div>Sin Contenido</div>
        </div>
      </div>
    );
  }

  const { type, url } = item.contentItem;
  const absoluteUrl = url && url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
  const objectFit = playlist.zoneSettings?.[zoneId || "main"]?.objectFit || "contain";

  switch (type) {
    case "image":
      return <ImagePlayer src={absoluteUrl} objectFit={objectFit} />;
    case "video":
      return (
        <VideoPlayer
          src={absoluteUrl}
          objectFit={objectFit}
          onEnded={onVideoEnded}
        />
      );
    case "webpage":
      return <WebpagePlayer src={absoluteUrl} />;
    case "pdf":
      return <PDFPlayer src={absoluteUrl} />;
    case "youtube":
      return <YouTubePlayer url={absoluteUrl} />;
    default:
      return (
        <div style={{
          ...styles.media,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a1a",
          color: "rgba(255,255,255,0.5)"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>❓</div>
            <div>Tipo de contenido no soportado: {type}</div>
          </div>
        </div>
      );
  }
};

// ===================================================================================
// INTERFAZ PARA ZONE TRACKER
// ===================================================================================

interface ZoneTracker {
  items: PlaylistItem[];
  currentIndex: number;
}

// ===================================================================================
// COMPONENTE DE ZONA CON GESTIÓN DE ESTADOS
// ===================================================================================

const ZonePlayer = React.memo(({
  items,
  zoneId,
  playlist,
  zoneTracker,
  onAdvance,
  showDebug = false,
}: {
  items: PlaylistItem[];
  zoneId: string;
  playlist: Playlist;
  zoneTracker: ZoneTracker;
  onAdvance: (zoneId: string) => void;
  showDebug?: boolean;
}) => {
  const advanceToNextItem = useCallback(() => {
    onAdvance(zoneId);
  }, [onAdvance, zoneId]);

  useEffect(() => {
    if (items.length === 0) return;

    const currentItem = items[zoneTracker.currentIndex];
    if (!currentItem?.contentItem || currentItem.contentItem.type === "video") return;

    const duration = (currentItem.customDuration || currentItem.contentItem.duration || 10) * 1000;
    const timer = setTimeout(advanceToNextItem, duration);
    return () => clearTimeout(timer);
  }, [zoneTracker.currentIndex, items, advanceToNextItem]);

  if (items.length === 0) {
    return (
      <div style={styles.zone}>
        {showDebug && (
          <div style={styles.debugInfo}>
            Zona {zoneId}: Sin contenido
          </div>
        )}
        <div style={{
          ...styles.media,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.5)"
        }}>
          Sin contenido
        </div>
      </div>
    );
  }

  const currentItem = items[zoneTracker.currentIndex];

  return (
    <div style={styles.zone}>
      {showDebug && (
        <div style={styles.debugInfo}>
          Zona {zoneId}: {zoneTracker.currentIndex + 1}/{items.length}
        </div>
      )}
      {renderContentItem(currentItem, advanceToNextItem, playlist, zoneId)}
    </div>
  );
});

// ===================================================================================
// COMPONENTE PRINCIPAL CON TODOS LOS LAYOUTS
// ===================================================================================

export default function ContentPlayer({
  playlistId,
  isPreview = false,
}: {
  playlistId?: number;
  isPreview?: boolean;
}) {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [zoneTrackers, setZoneTrackers] = useState<Record<string, ZoneTracker>>({});

  // Función para obtener token de auth
  const getAuthToken = useCallback(() => {
    return isPreview ? null : localStorage.getItem("authToken");
  }, [isPreview]);

  // Query única para playlist con optimizaciones
  const {
    data: playlist,
    isLoading,
    error,
  } = useQuery<Playlist & { items: PlaylistItem[] }>({
    queryKey: ["player-playlist", playlistId, isPreview],
    queryFn: async () => {
      if (!playlistId) throw new Error("ID de playlist no proporcionado.");

      const endpoint = isPreview 
        ? `/api/playlists/${playlistId}` 
        : `/api/player/playlists/${playlistId}`;

      const headers: Record<string, string> = {};
      const authToken = getAuthToken();
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await apiFetch(endpoint, { headers });
      if (!res.ok) {
        throw new Error(`Error al cargar la playlist: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!playlistId,
    staleTime: isPreview ? 5000 : 60000,
    refetchInterval: isPreview ? 5000 : false,
    retry: 2,
  });

  // Query para widgets solo cuando no es preview
  const { data: widgets = [] } = useQuery<Widget[]>({
    queryKey: ["player-widgets"],
    queryFn: async () => {
      const authToken = getAuthToken();
      if (!authToken) return [];

      const res = await apiFetch("/api/player/widgets", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        console.warn("No se pudieron cargar los widgets.");
        return [];
      }
      return res.json();
    },
    enabled: !isPreview && !!playlistId,
    staleTime: 300000,
    refetchInterval: false,
    retry: 1,
  });

  // Inicializar zone trackers cuando cambia la playlist
  useEffect(() => {
    if (!playlist?.items || !Array.isArray(playlist.items)) return;

    console.log("Playlist items:", playlist.items);
    console.log("Playlist layout:", playlist.layout);

    const zones: Record<string, PlaylistItem[]> = {};
    
    // Configurar zonas según el layout
    switch (playlist.layout || "single_zone") {
      case "split_vertical":
        zones.left = [];
        zones.right = [];
        break;
      case "split_horizontal":
        zones.top = [];
        zones.bottom = [];
        break;
      case "pip_bottom_right":
        zones.main = [];
        zones.pip = [];
        break;
      case "grid_2x2":
        zones.top_left = [];
        zones.top_right = [];
        zones.bottom_left = [];
        zones.bottom_right = [];
        break;
      case "triple_split":
        zones.left = [];
        zones.top_right = [];
        zones.bottom_right = [];
        break;
      case "l_shape":
        zones.main = [];
        zones.side = [];
        zones.bottom = [];
        break;
      case "single_zone":
      default:
        zones.main = [];
        break;
    }

    // Asignar items a zonas
    for (const item of playlist.items) {
      const zone = item.zone || "main";
      console.log(`Item ${item.id} assigned to zone: ${zone}, item:`, item);
      if (!zones[zone]) {
        zones[zone] = [];
      }
      zones[zone].push(item);
    }

    // Ordenar items en cada zona
    for (const zoneId in zones) {
      zones[zoneId].sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    console.log("Zones created:", zones);

    // Crear trackers para cada zona
    const newTrackers: Record<string, ZoneTracker> = {};
    for (const zoneId in zones) {
      newTrackers[zoneId] = {
        items: zones[zoneId],
        currentIndex: 0,
      };
    }

    setZoneTrackers(newTrackers);
  }, [playlist]);

  // Función para avanzar al siguiente item en una zona
  const advanceZone = useCallback((zoneId: string) => {
    setZoneTrackers(prev => {
      const tracker = prev[zoneId];
      if (!tracker || tracker.items.length === 0) return prev;

      return {
        ...prev,
        [zoneId]: {
          ...tracker,
          currentIndex: (tracker.currentIndex + 1) % tracker.items.length,
        },
      };
    });
  }, []);

  // Gestión optimizada de WebSocket y alertas
  useEffect(() => {
    if (isPreview || !playlistId) return;

    const authToken = getAuthToken();
    if (!authToken) return;

    console.log("🔌 Iniciando WebSocket para playlist:", playlistId);
    wsManager.connect(undefined, authToken);

    const alertTimers = new Map<number, NodeJS.Timeout>();

    const handleAlertExpired = (alertId: number) => {
      setActiveAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      if (alertTimers.has(alertId)) {
        clearTimeout(alertTimers.get(alertId)!);
        alertTimers.delete(alertId);
      }
    };

    const handleAlert = (message: { type: string; data: any }) => {
      const alert = message.data;
      if (message.type === "alert" && alert?.isActive) {
        setActiveAlerts((prev) => {
          if (prev.some((a) => a.id === alert.id)) return prev;
          return [...prev, alert];
        });

        if (alert.duration > 0 && !alert.isFixed) {
          if (alertTimers.has(alert.id)) {
            clearTimeout(alertTimers.get(alert.id)!);
          }
          const timer = setTimeout(
            () => handleAlertExpired(alert.id),
            alert.duration * 1000,
          );
          alertTimers.set(alert.id, timer);
        }
      } else if (message.type === "alert-deleted") {
        handleAlertExpired(alert?.id);
      }
    };

    const handlePlaylistChange = (message: { type: string; data: any }) => {
      const screenId = localStorage.getItem("screenId");
      if (message.data?.screenId?.toString() === screenId) {
        console.log("🔄 Recarga por cambio de playlist");
        window.location.reload();
      }
    };

    // Heartbeat optimizado
    const sendHeartbeat = () => {
      if (wsManager.isConnected()) {
        wsManager.send({
          type: "player-heartbeat",
          timestamp: new Date().toISOString(),
          screenId: localStorage.getItem("screenId"),
        });
      }
    };

    const heartbeatTimer = setInterval(sendHeartbeat, 120000);

    // Suscripciones
    const unsubscribeAlert = wsManager.subscribe("alert", handleAlert);
    const unsubscribeAlertDeleted = wsManager.subscribe("alert-deleted", handleAlert);
    const unsubscribePlaylistChange = wsManager.subscribe("playlist-change", handlePlaylistChange);

    return () => {
      clearInterval(heartbeatTimer);
      unsubscribeAlert();
      unsubscribeAlertDeleted();
      unsubscribePlaylistChange();
      alertTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [isPreview, playlistId, getAuthToken]);

  // Renderizado de layouts completos
  const renderLayout = useCallback(() => {
    if (!playlist) return null;

    const layout = playlist.layout || "single_zone";
    console.log("Rendering layout:", layout);

    // Log de estado de zone trackers
    Object.keys(zoneTrackers).forEach(zoneId => {
      const tracker = zoneTrackers[zoneId];
      console.log(`Zone ${zoneId}: ${tracker.items.length} items, current index: ${tracker.currentIndex}`);
    });

    const getZonePlayer = (zoneId: string, showDebug = false) => (
      <ZonePlayer
        items={zoneTrackers[zoneId]?.items || []}
        zoneId={zoneId}
        playlist={playlist}
        zoneTracker={zoneTrackers[zoneId] || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
        showDebug={showDebug}
      />
    );

    switch (layout) {
      case "single_zone":
        return (
          <div style={styles.container}>
            <div style={styles.debugInfo}>
              Playlist: {playlist.name} ({(zoneTrackers.main?.items.length) || 0} items)
            </div>
            {getZonePlayer("main") || (
              <div style={{
                ...styles.zone,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.5)"
              }}>
                Sin contenido
              </div>
            )}
          </div>
        );

      case "split_vertical":
        return (
          <div style={{ ...styles.container, display: "flex" }}>
            <div style={{ ...styles.zone, width: "50%", borderRight: "2px solid rgba(255,255,255,0.1)" }}>
              <div style={styles.debugInfo}>
                Zona Izquierda ({(zoneTrackers.left?.items.length) || 0} items)
              </div>
              {getZonePlayer("left")}
            </div>
            <div style={{ ...styles.zone, width: "50%" }}>
              <div style={styles.debugInfo}>
                Zona Derecha ({(zoneTrackers.right?.items.length) || 0} items)
              </div>
              {getZonePlayer("right")}
            </div>
          </div>
        );

      case "split_horizontal":
        return (
          <div style={{ ...styles.container, display: "flex", flexDirection: "column" }}>
            <div style={{ ...styles.zone, height: "50%", borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
              <div style={styles.debugInfo}>
                Zona Superior ({(zoneTrackers.top?.items.length) || 0} items)
              </div>
              {getZonePlayer("top")}
            </div>
            <div style={{ ...styles.zone, height: "50%" }}>
              <div style={styles.debugInfo}>
                Zona Inferior ({(zoneTrackers.bottom?.items.length) || 0} items)
              </div>
              {getZonePlayer("bottom")}
            </div>
          </div>
        );

      case "pip_bottom_right":
        return (
          <div style={styles.container}>
            <div style={styles.debugInfo}>
              Principal ({(zoneTrackers.main?.items.length) || 0} items) + PiP ({(zoneTrackers.pip?.items.length) || 0} items)
            </div>
            {getZonePlayer("main")}
            <div style={{
              position: "absolute",
              bottom: "20px",
              right: "20px",
              width: "25%",
              height: "25%",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: "8px",
              overflow: "hidden",
              zIndex: 100,
            }}>
              {getZonePlayer("pip")}
            </div>
          </div>
        );

      case "grid_2x2":
        return (
          <div style={{ ...styles.container, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "2px" }}>
            <div style={{ ...styles.zone, backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Superior Izq ({(zoneTrackers.top_left?.items.length) || 0} items)
              </div>
              {getZonePlayer("top_left")}
            </div>
            <div style={{ ...styles.zone, backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Superior Der ({(zoneTrackers.top_right?.items.length) || 0} items)
              </div>
              {getZonePlayer("top_right")}
            </div>
            <div style={{ ...styles.zone, backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Inferior Izq ({(zoneTrackers.bottom_left?.items.length) || 0} items)
              </div>
              {getZonePlayer("bottom_left")}
            </div>
            <div style={{ ...styles.zone, backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Inferior Der ({(zoneTrackers.bottom_right?.items.length) || 0} items)
              </div>
              {getZonePlayer("bottom_right")}
            </div>
          </div>
        );

      case "triple_split":
        return (
          <div style={{ ...styles.container, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "2px" }}>
            <div style={{ ...styles.zone, gridRow: "1 / 3", backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Zona Izquierda ({(zoneTrackers.left?.items.length) || 0} items)
              </div>
              {getZonePlayer("left")}
            </div>
            <div style={{ ...styles.zone, backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Superior Derecha ({(zoneTrackers.top_right?.items.length) || 0} items)
              </div>
              {getZonePlayer("top_right")}
            </div>
            <div style={{ ...styles.zone, backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Inferior Derecha ({(zoneTrackers.bottom_right?.items.length) || 0} items)
              </div>
              {getZonePlayer("bottom_right")}
            </div>
          </div>
        );

      case "l_shape":
        return (
          <div style={{ ...styles.container, display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "2fr 1fr", gap: "2px" }}>
            <div style={{ ...styles.zone, backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Principal ({(zoneTrackers.main?.items.length) || 0} items)
              </div>
              {getZonePlayer("main")}
            </div>
            <div style={{ ...styles.zone, backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Lateral ({(zoneTrackers.side?.items.length) || 0} items)
              </div>
              {getZonePlayer("side")}
            </div>
            <div style={{ ...styles.zone, gridColumn: "1 / 3", backgroundColor: "#111" }}>
              <div style={styles.debugInfo}>
                Inferior ({(zoneTrackers.bottom?.items.length) || 0} items)
              </div>
              {getZonePlayer("bottom")}
            </div>
          </div>
        );

      default:
        return (
          <div style={styles.container}>
            <div style={styles.debugInfo}>
              Layout desconocido: {layout}
            </div>
            {getZonePlayer("main")}
          </div>
        );
    }
  }, [playlist, zoneTrackers, advanceZone]);

  // Estados de carga y error
  if (!playlistId) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "15px" }}>⏳</div>
          <div>Esperando configuración...</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "15px" }}>🔄</div>
          <div>Cargando Playlist...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center", color: "#ff6b6b" }}>
          <div style={{ fontSize: "24px", marginBottom: "15px" }}>❌</div>
          <div>Error: {error instanceof Error ? error.message : "Error desconocido"}</div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "15px" }}>📂</div>
          <div>Playlist no encontrada.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {renderLayout()}

      {/* Widgets */}
      {widgets.map((widget) => (
        <WidgetRenderer key={widget.id} widget={widget} />
      ))}

      {/* Alertas */}
      {activeAlerts.map((alert) => (
        <AlertOverlay key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
