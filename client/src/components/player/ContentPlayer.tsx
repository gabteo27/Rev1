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

const WebpagePlayer = React.memo(({ src }: { src: string }) => (
  <iframe
    src={src}
    style={{ ...styles.media, border: "none" }}
    title="web-content"
    sandbox="allow-scripts allow-same-origin"
  />
));

const PDFPlayer = React.memo(({ src }: { src: string }) => {
  const pdfViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`;
  return (
    <iframe
      src={pdfViewerUrl}
      style={{ ...styles.media, border: "none", background: "#f5f5f5" }}
      title="PDF document"
    />
  );
});

const YouTubePlayer = React.memo(({ url }: { url: string }) => {
  const getYouTubeID = (ytUrl: string): string | null => {
    if (!ytUrl || typeof ytUrl !== "string") return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = ytUrl.trim().match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  const videoId = getYouTubeID(url);
  if (!videoId) {
    return (
      <div style={{
        ...styles.media,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        URL de YouTube no válida
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&iv_load_policy=3&modestbranding=1`;
  return (
    <iframe
      key={videoId}
      src={embedUrl}
      style={{ ...styles.media, border: "none" }}
      title="YouTube Player"
      allow="autoplay; encrypted-media; picture-in-picture"
    />
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
      timeZone: config?.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: config?.format === "12h",
    }).format(date);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      timeZone: config?.timezone,
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
    // Ignore parsing errors
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
      }}>
        Sin Contenido
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
      return <div>Tipo '{type}' no soportado.</div>;
  }
};

// ===================================================================================
// COMPONENTE DE ZONA
// ===================================================================================

const ZonePlayer = React.memo(({
  items,
  zoneId,
  playlist,
}: {
  items: PlaylistItem[];
  zoneId: string;
  playlist: Playlist;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advanceToNextItem = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % (items.length || 1));
  }, [items.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;

    const currentItem = items[currentIndex];
    if (!currentItem?.contentItem || currentItem.contentItem.type === "video") return;

    const duration = (currentItem.customDuration || currentItem.contentItem.duration || 10) * 1000;
    const timer = setTimeout(advanceToNextItem, duration);
    return () => clearTimeout(timer);
  }, [currentIndex, items, advanceToNextItem]);

  if (items.length === 0) return null;

  return renderContentItem(items[currentIndex], advanceToNextItem, playlist, zoneId);
});

// ===================================================================================
// COMPONENTE PRINCIPAL OPTIMIZADO
// ===================================================================================

export default function ContentPlayer({
  playlistId,
  isPreview = false,
}: {
  playlistId?: number;
  isPreview?: boolean;
}) {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);

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
    staleTime: isPreview ? 5000 : 60000, // Más agresivo en preview
    refetchInterval: isPreview ? 5000 : false, // Solo refetch automático en preview
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
    staleTime: 300000, // 5 minutos
    refetchInterval: false,
    retry: 1,
  });

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

    const heartbeatTimer = setInterval(sendHeartbeat, 120000); // Cada 2 minutos

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

  // Memoización de zonas para evitar recálculos
  const zones = useMemo(() => {
    if (!playlist?.items) return {};

    const zoneMap: Record<string, PlaylistItem[]> = {};
    const layout = playlist.layout || "single_zone";

    // Configuración simple de layouts
    const layoutZones: Record<string, string[]> = {
      single_zone: ["main"],
      split_vertical: ["left", "right"],
      split_horizontal: ["top", "bottom"],
      pip_bottom_right: ["main", "pip"],
      grid_2x2: ["top_left", "top_right", "bottom_left", "bottom_right"],
    };

    const zones = layoutZones[layout] || ["main"];
    zones.forEach((zoneId) => {
      zoneMap[zoneId] = [];
    });

    // Asignar items a zonas
    playlist.items.forEach((item) => {
      const zone = item.zone || "main";
      if (!zoneMap[zone]) zoneMap[zone] = [];
      zoneMap[zone].push(item);
    });

    // Ordenar items por orden
    Object.keys(zoneMap).forEach((zoneId) => {
      zoneMap[zoneId].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return zoneMap;
  }, [playlist]);

  // Renderizado de layouts simplificado
  const renderLayout = useCallback(() => {
    const layout = playlist?.layout || "single_zone";

    switch (layout) {
      case "single_zone":
        return (
          <ZonePlayer
            items={zones["main"] || []}
            zoneId="main"
            playlist={playlist}
          />
        );

      case "split_vertical":
        return (
          <div style={{ ...styles.container, display: "flex" }}>
            <div style={{ ...styles.zone, width: "50%" }}>
              <ZonePlayer items={zones["left"] || []} zoneId="left" playlist={playlist} />
            </div>
            <div style={{ ...styles.zone, width: "50%" }}>
              <ZonePlayer items={zones["right"] || []} zoneId="right" playlist={playlist} />
            </div>
          </div>
        );

      case "split_horizontal":
        return (
          <div style={{ ...styles.container, display: "flex", flexDirection: "column" }}>
            <div style={{ ...styles.zone, height: "50%" }}>
              <ZonePlayer items={zones["top"] || []} zoneId="top" playlist={playlist} />
            </div>
            <div style={{ ...styles.zone, height: "50%" }}>
              <ZonePlayer items={zones["bottom"] || []} zoneId="bottom" playlist={playlist} />
            </div>
          </div>
        );

      default:
        return (
          <ZonePlayer
            items={zones["main"] || []}
            zoneId="main"
            playlist={playlist}
          />
        );
    }
  }, [playlist, zones]);

  // Estados de carga y error
  if (!playlistId) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          Esperando configuración...
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          Cargando Playlist...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          Error: {error instanceof Error ? error.message : "Error desconocido"}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          Playlist no encontrada.
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