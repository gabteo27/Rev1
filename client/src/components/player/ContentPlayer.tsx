import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOverlay } from "./AlertOverlay";
import type { Playlist, PlaylistItem, Widget, Alert } from "@shared/schema";
import { wsManager } from "@/lib/websocket";
import { API_BASE_URL, apiFetch } from "@/lib/api"; // 1. Importa API_BASE_URL

// ===================================================================================
// --- INICIO: CONSTANTES, HELPERS Y COMPONENTES MOVIMOS FUERA PARA OPTIMIZAR ---
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

// --- Componentes de Contenido (Memoizados para evitar re-renders innecesarios) ---

const ImagePlayer = React.memo(
  ({ src, objectFit }: { src: string; objectFit?: string }) => (
    <img
      src={src}
      style={getMediaStyle(objectFit)}
      alt="Imagen de contenido"
      loading="eager"
    />
  ),
);

const VideoPlayer = React.memo(
  ({
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
  ),
);

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
  if (!videoId)
    return (
      <div
        style={{
          ...styles.media,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        URL de YouTube no válida
      </div>
    );
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

// --- Componentes de Widgets ---

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

const ClockWidget = React.memo(
  ({ config, position }: { config: any; position: string }) => {
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
  },
);

// ... Aquí puedes añadir las definiciones completas para WeatherWidget, NewsWidget, etc.

const WidgetRenderer = React.memo(({ widget }: { widget: Widget }) => {
  if (!widget.isEnabled) return null;
  let config = {};
  try {
    config = JSON.parse(widget.settings || "{}");
  } catch (e) {}
  switch (widget.type) {
    case "clock":
      return (
        <ClockWidget
          config={config}
          position={widget.position || "bottom-right"}
        />
      );
    // case 'weather': return <WeatherWidget ... />;
    // case 'news': return <NewsWidget ... />;
    // case 'text': return <TextWidget ... />;
    default:
      return null;
  }
});

// --- Lógica de Renderizado de Contenido ---

const renderContentItem = (
  item: PlaylistItem,
  onVideoEnded: () => void,
  playlist: Playlist,
  zoneId?: string,
) => {
  if (!item?.contentItem) {
    return (
      <div
        style={{
          ...styles.media,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Sin Contenido
      </div>
    );
  }
  const { type, url } = item.contentItem;
  const absoluteUrl =
    url && url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
  const objectFit =
    playlist.zoneSettings?.[zoneId || "main"]?.objectFit || "contain";

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

// --- NUEVO COMPONENTE OPTIMIZADO PARA CADA ZONA ---

const ZonePlayer = React.memo(
  ({
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
      if (!currentItem?.contentItem || currentItem.contentItem.type === "video")
        return;
      const duration =
        (currentItem.customDuration || currentItem.contentItem.duration || 10) *
        1000;
      const timer = setTimeout(advanceToNextItem, duration);
      return () => clearTimeout(timer);
    }, [currentIndex, items, advanceToNextItem]);

    if (items.length === 0) return null;

    return renderContentItem(
      items[currentIndex],
      advanceToNextItem,
      playlist,
      zoneId,
    );
  },
);

// ===================================================================================
// --- COMPONENTE PRINCIPAL REFACTORIZADO ---
// ===================================================================================

export default function ContentPlayer({
  playlistId,
  isPreview = false,
}: {
  playlistId?: number;
  isPreview?: boolean;
}) {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const queryClient = useQueryClient();
  const getAuthToken = () => localStorage.getItem("authToken");

  const {
    data: playlist,
    isLoading,
    error,
  } = useQuery<Playlist & { items: PlaylistItem[] }>({
    queryKey: ["player-playlist", playlistId],
    queryFn: async () => {
      if (!playlistId) throw new Error("ID de playlist no proporcionado.");
      const endpoint = `/api/player/playlists/${playlistId}`;
      const res = await apiFetch(endpoint, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok)
        throw new Error(`Error al cargar la playlist: ${res.statusText}`);
      return res.json();
    },
    enabled: !!playlistId,
    staleTime: Infinity,
  });

  const { data: widgets = [] } = useQuery<Widget[]>({
    queryKey: ["player-widgets"],
    queryFn: async () => {
      const endpoint = "/api/player/widgets";
      const res = await apiFetch(endpoint, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) {
        console.warn("No se pudieron cargar los widgets.");
        return [];
      }
      return res.json();
    },
    enabled: !!playlistId,
    refetchInterval: 300000,
  });

  useEffect(() => {
    // No hacemos nada si estamos en modo preview o si no hay un authToken
    if (isPreview) return;
    const authToken = localStorage.getItem("authToken");
    if (!authToken) return;

    console.log(
      "🔌 Iniciando sistema de tiempo real para Playlist ID:",
      playlistId,
    );
    wsManager.connect(undefined, authToken);

    // --- Lógica para manejar las alertas que llegan por WebSocket ---
    const alertTimers = new Map<number, NodeJS.Timeout>();
    const handleAlertExpired = (alertId: number) => {
      setActiveAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      if (alertTimers.has(alertId)) {
        clearTimeout(alertTimers.get(alertId));
        alertTimers.delete(alertId);
      }
    };

    const handleAlertMessage = (message: { type: string; data: any }) => {
      const alert = message.data;
      if (message.type === "alert" && alert?.isActive) {
        setActiveAlerts((prev) => {
          if (prev.some((a) => a.id === alert.id)) return prev; // Evitar duplicados
          return [...prev, alert];
        });

        if (alert.duration > 0 && !alert.isFixed) {
          if (alertTimers.has(alert.id))
            clearTimeout(alertTimers.get(alert.id));
          const timer = setTimeout(
            () => handleAlertExpired(alert.id),
            alert.duration * 1000,
          );
          alertTimers.set(alert.id, timer);
        }
      } else if (message.type === "alert-deleted") {
        const alertId = alert?.id;
        handleAlertExpired(alertId);
      }
    };

    // --- Lógica para manejar cambios en la playlist ---
    const handlePlaylistMessage = (message: { type: string; data: any }) => {
      const data = message.data;
      if (data?.playlistId !== playlistId) return; // Ignora si no es para esta playlist

      console.log(
        `🔄 Actualización recibida para la playlist actual (${playlistId}):`,
        message.type,
      );
      // Invalida la query de la playlist. React-query la volverá a pedir automáticamente.
      queryClient.invalidateQueries({
        queryKey: ["player-playlist", playlistId],
      });
    };

    // --- Lógica para manejar un cambio completo de playlist para esta pantalla ---
    const handleScreenUpdate = (message: { type: string; data: any }) => {
      const screenId = localStorage.getItem("screenId");
      if (message.data?.screenId?.toString() === screenId) {
        console.log("🔄 Recibida orden de recarga por cambio de playlist.");
        window.location.reload(); // Recarga la página para obtener la nueva playlist
      }
    };

    // --- Heartbeat para mantener la conexión viva y el estado online ---
    const sendHeartbeat = () => {
      if (wsManager.isConnected()) {
        wsManager.send({
          type: "player-heartbeat",
          timestamp: new Date().toISOString(),
          screenId: localStorage.getItem("screenId"),
        });
      } else {
        // Fallback a HTTP si el WebSocket está caído
        apiFetch("/api/screens/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        }).catch((err) => console.error("HTTP Heartbeat failed:", err));
      }
    };

    sendHeartbeat(); // Envía uno al conectarse
    const heartbeatTimer = setInterval(sendHeartbeat, 120000); // Y luego cada 2 minutos

    // --- Suscripciones a los eventos ---
    const unsubscribeAlert = wsManager.subscribe("alert", handleAlertMessage);
    const unsubscribeAlertDeleted = wsManager.subscribe(
      "alert-deleted",
      handleAlertMessage,
    );
    const unsubscribePlaylistContent = wsManager.subscribe(
      "playlist-content-updated",
      handlePlaylistMessage,
    );
    const unsubscribePlaylistChange = wsManager.subscribe(
      "playlist-change",
      handleScreenUpdate,
    );
    const unsubscribeScreenPlaylist = wsManager.subscribe(
      "screen-playlist-updated",
      handleScreenUpdate,
    );

    // --- Función de Limpieza ---
    // Se ejecuta cuando el componente se desmonta para evitar fugas de memoria
    return () => {
      console.log("🧼 Limpiando listeners y timers de WebSocket.");
      clearInterval(heartbeatTimer);
      unsubscribeAlert();
      unsubscribeAlertDeleted();
      unsubscribePlaylistContent();
      unsubscribePlaylistChange();
      unsubscribeScreenPlaylist();
      alertTimers.forEach((timer) => clearTimeout(timer));
      // Opcional: Desconectar al desmontar. Podrías mantenerlo conectado si el usuario navega a otras partes.
      // wsManager.disconnect();
    };
  }, [isPreview, playlistId, queryClient]);

  const zones = useMemo(() => {
    if (!playlist?.items) return {};
    const zoneMap: Record<string, PlaylistItem[]> = {};
    const layout = playlist.layout || "single_zone";

    if (layout === "custom_layout" && playlist.customLayoutConfig) {
      try {
        const customConfig =
          typeof playlist.customLayoutConfig === "string"
            ? JSON.parse(playlist.customLayoutConfig)
            : playlist.customLayoutConfig;
        if (customConfig?.zones)
          customConfig.zones.forEach((zone: any) => {
            if (zone.id) zoneMap[zone.id] = [];
          });
      } catch (e) {
        console.error("Error al parsear layout personalizado", e);
        zoneMap["main"] = [];
      }
    } else {
      const layouts: Record<string, string[]> = {
        split_vertical: ["left", "right"],
        split_horizontal: ["top", "bottom"],
        pip_bottom_right: ["main", "pip"],
        grid_2x2: ["top_left", "top_right", "bottom_left", "bottom_right"],
        sidebar_left: ["sidebar", "main"],
        sidebar_right: ["main", "sidebar"],
        header_footer: ["header", "main", "footer"],
        triple_vertical: ["left", "center", "right"],
        triple_horizontal: ["top", "middle", "bottom"],
        single_zone: ["main"],
        carousel: ["main"],
        web_scroll: ["main"],
        grid_3x3: Array.from({ length: 9 }, (_, i) => `grid_${i + 1}`),
      };
      (layouts[layout] || layouts["single_zone"]).forEach((zoneId) => {
        zoneMap[zoneId] = [];
      });
    }

    for (const item of playlist.items) {
      const zone = item.zone || "main";
      if (!zoneMap[zone]) zoneMap[zone] = [];
      zoneMap[zone].push(item);
    }
    for (const zoneId in zoneMap) {
      zoneMap[zoneId].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return zoneMap;
  }, [playlist]);

  if (!playlistId)
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto" }}>Esperando configuración...</div>
      </div>
    );
  if (isLoading)
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto" }}>Cargando Playlist...</div>
      </div>
    );
  if (error)
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto" }}>Error: {error.message}</div>
      </div>
    );
  if (!playlist)
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto" }}>Playlist no encontrada.</div>
      </div>
    );

  const layout = playlist?.layout || "single_zone";
  // En tu componente ContentPlayer.tsx, esta es la función completa de renderizado

  const renderLayout = () => {
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
          <div
            style={{
              ...styles.container,
              display: "flex",
              flexDirection: "row",
            }}
          >
            <div style={{ ...styles.zone, width: "50%" }}>
              <ZonePlayer
                items={zones["left"] || []}
                zoneId="left"
                playlist={playlist}
              />
            </div>
            <div
              style={{
                ...styles.zone,
                width: "50%",
                borderLeft: "2px solid #000",
              }}
            >
              <ZonePlayer
                items={zones["right"] || []}
                zoneId="right"
                playlist={playlist}
              />
            </div>
          </div>
        );

      case "split_horizontal":
        return (
          <div
            style={{
              ...styles.container,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ ...styles.zone, height: "50%" }}>
              <ZonePlayer
                items={zones["top"] || []}
                zoneId="top"
                playlist={playlist}
              />
            </div>
            <div
              style={{
                ...styles.zone,
                height: "50%",
                borderTop: "2px solid #000",
              }}
            >
              <ZonePlayer
                items={zones["bottom"] || []}
                zoneId="bottom"
                playlist={playlist}
              />
            </div>
          </div>
        );

      case "grid_2x2":
        return (
          <div
            style={{
              ...styles.container,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: "2px",
              backgroundColor: "#000",
            }}
          >
            <div style={styles.zone}>
              <ZonePlayer
                items={zones["top_left"] || []}
                zoneId="top_left"
                playlist={playlist}
              />
            </div>
            <div style={styles.zone}>
              <ZonePlayer
                items={zones["top_right"] || []}
                zoneId="top_right"
                playlist={playlist}
              />
            </div>
            <div style={styles.zone}>
              <ZonePlayer
                items={zones["bottom_left"] || []}
                zoneId="bottom_left"
                playlist={playlist}
              />
            </div>
            <div style={styles.zone}>
              <ZonePlayer
                items={zones["bottom_right"] || []}
                zoneId="bottom_right"
                playlist={playlist}
              />
            </div>
          </div>
        );

      case "grid_3x3":
        return (
          <div
            style={{
              ...styles.container,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gridTemplateRows: "1fr 1fr 1fr",
              gap: "2px",
              backgroundColor: "#000",
            }}
          >
            {Array.from({ length: 9 }, (_, i) => {
              const zoneId = `grid_${i + 1}`;
              return (
                <div key={zoneId} style={styles.zone}>
                  <ZonePlayer
                    items={zones[zoneId] || []}
                    zoneId={zoneId}
                    playlist={playlist}
                  />
                </div>
              );
            })}
          </div>
        );

      case "pip_bottom_right":
        return (
          <div style={{ ...styles.container, position: "relative" }}>
            <div style={{ ...styles.zone }}>
              <ZonePlayer
                items={zones["main"] || []}
                zoneId="main"
                playlist={playlist}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                width: "30%",
                height: "30%",
                border: "3px solid rgba(255,255,255,0.5)",
                borderRadius: "8px",
                overflow: "hidden",
                zIndex: 10,
                boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
              }}
            >
              <ZonePlayer
                items={zones["pip"] || []}
                zoneId="pip"
                playlist={playlist}
              />
            </div>
          </div>
        );

      case "sidebar_left":
        return (
          <div
            style={{
              ...styles.container,
              display: "flex",
              flexDirection: "row",
            }}
          >
            <div
              style={{
                ...styles.zone,
                width: "30%",
                borderRight: "2px solid #000",
              }}
            >
              <ZonePlayer
                items={zones["sidebar"] || []}
                zoneId="sidebar"
                playlist={playlist}
              />
            </div>
            <div style={{ ...styles.zone, width: "70%" }}>
              <ZonePlayer
                items={zones["main"] || []}
                zoneId="main"
                playlist={playlist}
              />
            </div>
          </div>
        );

      case "sidebar_right":
        return (
          <div
            style={{
              ...styles.container,
              display: "flex",
              flexDirection: "row",
            }}
          >
            <div style={{ ...styles.zone, width: "70%" }}>
              <ZonePlayer
                items={zones["main"] || []}
                zoneId="main"
                playlist={playlist}
              />
            </div>
            <div
              style={{
                ...styles.zone,
                width: "30%",
                borderLeft: "2px solid #000",
              }}
            >
              <ZonePlayer
                items={zones["sidebar"] || []}
                zoneId="sidebar"
                playlist={playlist}
              />
            </div>
          </div>
        );

      case "header_footer":
        return (
          <div
            style={{
              ...styles.container,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                ...styles.zone,
                height: "15%",
                borderBottom: "2px solid #000",
              }}
            >
              <ZonePlayer
                items={zones["header"] || []}
                zoneId="header"
                playlist={playlist}
              />
            </div>
            <div style={{ ...styles.zone, height: "70%" }}>
              <ZonePlayer
                items={zones["main"] || []}
                zoneId="main"
                playlist={playlist}
              />
            </div>
            <div
              style={{
                ...styles.zone,
                height: "15%",
                borderTop: "2px solid #000",
              }}
            >
              <ZonePlayer
                items={zones["footer"] || []}
                zoneId="footer"
                playlist={playlist}
              />
            </div>
          </div>
        );

      case "triple_vertical":
        return (
          <div
            style={{
              ...styles.container,
              display: "flex",
              flexDirection: "row",
            }}
          >
            <div style={{ ...styles.zone, width: "33.33%" }}>
              <ZonePlayer
                items={zones["left"] || []}
                zoneId="left"
                playlist={playlist}
              />
            </div>
            <div
              style={{
                ...styles.zone,
                width: "33.34%",
                borderLeft: "2px solid #000",
                borderRight: "2px solid #000",
              }}
            >
              <ZonePlayer
                items={zones["center"] || []}
                zoneId="center"
                playlist={playlist}
              />
            </div>
            <div style={{ ...styles.zone, width: "33.33%" }}>
              <ZonePlayer
                items={zones["right"] || []}
                zoneId="right"
                playlist={playlist}
              />
            </div>
          </div>
        );

      case "triple_horizontal":
        return (
          <div
            style={{
              ...styles.container,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ ...styles.zone, height: "33.33%" }}>
              <ZonePlayer
                items={zones["top"] || []}
                zoneId="top"
                playlist={playlist}
              />
            </div>
            <div
              style={{
                ...styles.zone,
                height: "33.34%",
                borderTop: "2px solid #000",
                borderBottom: "2px solid #000",
              }}
            >
              <ZonePlayer
                items={zones["middle"] || []}
                zoneId="middle"
                playlist={playlist}
              />
            </div>
            <div style={{ ...styles.zone, height: "33.33%" }}>
              <ZonePlayer
                items={zones["bottom"] || []}
                zoneId="bottom"
                playlist={playlist}
              />
            </div>
          </div>
        );

      case "custom_layout": {
        let customZones: any[] = [];
        try {
          const customConfig =
            typeof playlist.customLayoutConfig === "string"
              ? JSON.parse(playlist.customLayoutConfig)
              : playlist.customLayoutConfig;
          if (customConfig && Array.isArray(customConfig.zones)) {
            customZones = customConfig.zones;
          }
        } catch (e) {
          return <div>Error en la configuración del layout personalizado.</div>;
        }

        return (
          <div style={{ ...styles.container, position: "relative" }}>
            {customZones.map((zone: any) => (
              <div
                key={zone.id}
                style={{
                  position: "absolute",
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  overflow: "hidden",
                  zIndex: 1,
                }}
              >
                <ZonePlayer
                  items={zones[zone.id] || []}
                  zoneId={zone.id}
                  playlist={playlist}
                />
              </div>
            ))}
          </div>
        );
      }

      default:
        return (
          <div style={styles.container}>
            <ZonePlayer
              items={zones["main"] || []}
              zoneId="main"
              playlist={playlist}
            />
          </div>
        );
    }
  };
}
