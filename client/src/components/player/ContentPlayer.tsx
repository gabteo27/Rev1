
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
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    color: "rgba(255,255,255,0.5)",
    fontSize: "18px",
    textAlign: "center" as const,
    padding: "20px",
  } as React.CSSProperties,
  errorState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.7)",
    fontSize: "18px",
    backgroundColor: "#1a1a1a",
    textAlign: "center" as const,
    padding: "20px",
  } as React.CSSProperties,
  loadingState: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    color: "white",
    zIndex: 1,
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
    alt="Contenido de imagen"
    loading="eager"
    onError={(e) => {
      console.warn("Error cargando imagen:", src);
      e.currentTarget.style.display = "none";
    }}
  />
));
ImagePlayer.displayName = 'ImagePlayer';

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
    onError={(e) => {
      console.warn("Error reproduciendo video:", src);
    }}
  />
));
VideoPlayer.displayName = 'VideoPlayer';

const WebpagePlayer = React.memo(({ src }: { src: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  if (error) {
    return (
      <div style={{ ...styles.media, ...styles.errorState }}>
        <div>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🌐</div>
          <div>Error al cargar página web</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>{src}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.media, position: 'relative' }}>
      {loading && (
        <div style={styles.loadingState}>
          <div>Cargando contenido web...</div>
        </div>
      )}
      <iframe 
        src={src} 
        style={{ ...styles.media, border: 'none' }} 
        title="Contenido web"
        sandbox="allow-scripts allow-same-origin"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});
WebpagePlayer.displayName = 'WebpagePlayer';

const PDFPlayer = React.memo(({ src }: { src: string }) => {
  const [error, setError] = useState(false);
  
  const pdfViewerUrl = useMemo(() => {
    return src.startsWith('http') 
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`
      : `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + src)}&embedded=true`;
  }, [src]);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  if (error) {
    return (
      <div style={{ ...styles.media, ...styles.errorState }}>
        <div>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📄</div>
          <div>Error al cargar documento PDF</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>{src}</div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={pdfViewerUrl}
      style={{ ...styles.media, border: "none", background: "#f5f5f5" }}
      title="Documento PDF"
      loading="eager"
      sandbox="allow-scripts allow-same-origin"
      onError={handleError}
    />
  );
});
PDFPlayer.displayName = 'PDFPlayer';

const YouTubePlayer = React.memo(({ url }: { url: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const getYouTubeID = useCallback((ytUrl: string): string | null => {
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
        console.error("Error detectando ID de YouTube:", e);
      }
    }
    return null;
  }, []);

  const videoId = useMemo(() => getYouTubeID(url), [url, getYouTubeID]);

  const embedUrl = useMemo(() => {
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&iv_load_policy=3&modestbranding=1&rel=0`;
  }, [videoId]);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  if (error || !videoId || !embedUrl) {
    return (
      <div style={{ ...styles.media, ...styles.errorState }}>
        <div>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📺</div>
          <div>URL de YouTube no válida</div>
          <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '5px' }}>{url}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.media, position: 'relative' }}>
      {loading && (
        <div style={styles.loadingState}>
          <div>Cargando video de YouTube...</div>
        </div>
      )}
      <iframe
        key={videoId}
        src={embedUrl}
        style={{ ...styles.media, border: "none" }}
        title="Reproductor de YouTube"
        allow="autoplay; encrypted-media; picture-in-picture"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});
YouTubePlayer.displayName = 'YouTubePlayer';

// ===================================================================================
// COMPONENTES DE WIDGETS MEMOIZADOS
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

  const formatTime = useCallback((date: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      timeZone: config?.timezone || 'America/Mexico_City',
      hour: "2-digit",
      minute: "2-digit",
      hour12: config?.format === "12h",
    }).format(date), [config]);

  const formatDate = useCallback((date: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      timeZone: config?.timezone || 'America/Mexico_City',
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date), [config]);

  const timeString = useMemo(() => formatTime(time), [time, formatTime]);
  const dateString = useMemo(() => formatDate(time), [time, formatDate]);

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
        {timeString}
      </div>
      <div style={{ fontSize: "0.8em", opacity: 0.8 }}>
        {dateString}
      </div>
    </div>
  );
});
ClockWidget.displayName = 'ClockWidget';

const WidgetRenderer = React.memo(({ widget }: { widget: Widget }) => {
  if (!widget.isEnabled) return null;

  const config = useMemo(() => {
    try {
      return JSON.parse(widget.settings || "{}");
    } catch (e) {
      console.warn("Error procesando configuración del widget:", e);
      return {};
    }
  }, [widget.settings]);

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
WidgetRenderer.displayName = 'WidgetRenderer';

// ===================================================================================
// RENDERIZADO DE CONTENIDO MEMOIZADO
// ===================================================================================

const ContentItemRenderer = React.memo(({
  item,
  onVideoEnded,
  playlist,
  zoneId,
}: {
  item: PlaylistItem;
  onVideoEnded: () => void;
  playlist: Playlist;
  zoneId?: string;
}) => {
  const contentItem = item?.contentItem;

  if (!contentItem) {
    return (
      <div style={{ ...styles.media, ...styles.emptyState }}>
        <div>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>📂</div>
          <div>Sin contenido disponible</div>
        </div>
      </div>
    );
  }

  const { type, url } = contentItem;
  const absoluteUrl = useMemo(() => 
    url && url.startsWith("/") ? `${API_BASE_URL}${url}` : url,
    [url]
  );
  
  const objectFit = useMemo(() => 
    playlist.zoneSettings?.[zoneId || "main"]?.objectFit || "contain",
    [playlist.zoneSettings, zoneId]
  );

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
        <div style={{ ...styles.media, ...styles.errorState }}>
          <div>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>❓</div>
            <div>Tipo de contenido no compatible: {type}</div>
          </div>
        </div>
      );
  }
});
ContentItemRenderer.displayName = 'ContentItemRenderer';

// ===================================================================================
// INTERFAZ PARA ZONE TRACKER
// ===================================================================================

interface ZoneTracker {
  items: PlaylistItem[];
  currentIndex: number;
}

// ===================================================================================
// COMPONENTE DE ZONA MEMOIZADO
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

  const currentItem = useMemo(() => 
    items[zoneTracker.currentIndex],
    [items, zoneTracker.currentIndex]
  );

  useEffect(() => {
    if (items.length === 0 || !currentItem?.contentItem || currentItem.contentItem.type === "video") {
      return;
    }

    const duration = (currentItem.customDuration || currentItem.contentItem.duration || 10) * 1000;
    const timer = setTimeout(advanceToNextItem, duration);
    return () => clearTimeout(timer);
  }, [zoneTracker.currentIndex, items, advanceToNextItem, currentItem]);

  if (items.length === 0) {
    return (
      <div style={styles.zone}>
        {showDebug && (
          <div style={styles.debugInfo}>
            Zona {zoneId}: Sin contenido
          </div>
        )}
        <div style={{ ...styles.media, ...styles.emptyState }}>
          Sin contenido asignado
        </div>
      </div>
    );
  }

  return (
    <div style={styles.zone}>
      {showDebug && (
        <div style={styles.debugInfo}>
          Zona {zoneId}: {zoneTracker.currentIndex + 1}/{items.length}
        </div>
      )}
      <ContentItemRenderer
        item={currentItem}
        onVideoEnded={advanceToNextItem}
        playlist={playlist}
        zoneId={zoneId}
      />
    </div>
  );
});
ZonePlayer.displayName = 'ZonePlayer';

// ===================================================================================
// COMPONENTES DE LAYOUT MEMOIZADOS
// ===================================================================================

const SingleZoneLayout = React.memo(({
  playlist,
  zoneTrackers,
  advanceZone,
}: {
  playlist: Playlist;
  zoneTrackers: Record<string, ZoneTracker>;
  advanceZone: (zoneId: string) => void;
}) => (
  <div style={styles.container}>
    <div style={styles.debugInfo}>
      Reproductor: {playlist.name} ({(zoneTrackers.main?.items.length) || 0} elementos)
    </div>
    <ZonePlayer
      items={zoneTrackers.main?.items || []}
      zoneId="main"
      playlist={playlist}
      zoneTracker={zoneTrackers.main || { items: [], currentIndex: 0 }}
      onAdvance={advanceZone}
    />
  </div>
));
SingleZoneLayout.displayName = 'SingleZoneLayout';

const SplitVerticalLayout = React.memo(({
  playlist,
  zoneTrackers,
  advanceZone,
}: {
  playlist: Playlist;
  zoneTrackers: Record<string, ZoneTracker>;
  advanceZone: (zoneId: string) => void;
}) => (
  <div style={{ ...styles.container, display: "flex" }}>
    <div style={{ ...styles.zone, width: "50%", borderRight: "2px solid rgba(255,255,255,0.1)" }}>
      <div style={styles.debugInfo}>
        Zona Izquierda ({(zoneTrackers.left?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.left?.items || []}
        zoneId="left"
        playlist={playlist}
        zoneTracker={zoneTrackers.left || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
    <div style={{ ...styles.zone, width: "50%" }}>
      <div style={styles.debugInfo}>
        Zona Derecha ({(zoneTrackers.right?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.right?.items || []}
        zoneId="right"
        playlist={playlist}
        zoneTracker={zoneTrackers.right || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
  </div>
));
SplitVerticalLayout.displayName = 'SplitVerticalLayout';

const SplitHorizontalLayout = React.memo(({
  playlist,
  zoneTrackers,
  advanceZone,
}: {
  playlist: Playlist;
  zoneTrackers: Record<string, ZoneTracker>;
  advanceZone: (zoneId: string) => void;
}) => (
  <div style={{ ...styles.container, display: "flex", flexDirection: "column" }}>
    <div style={{ ...styles.zone, height: "50%", borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
      <div style={styles.debugInfo}>
        Zona Superior ({(zoneTrackers.top?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.top?.items || []}
        zoneId="top"
        playlist={playlist}
        zoneTracker={zoneTrackers.top || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
    <div style={{ ...styles.zone, height: "50%" }}>
      <div style={styles.debugInfo}>
        Zona Inferior ({(zoneTrackers.bottom?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.bottom?.items || []}
        zoneId="bottom"
        playlist={playlist}
        zoneTracker={zoneTrackers.bottom || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
  </div>
));
SplitHorizontalLayout.displayName = 'SplitHorizontalLayout';

const PipBottomRightLayout = React.memo(({
  playlist,
  zoneTrackers,
  advanceZone,
}: {
  playlist: Playlist;
  zoneTrackers: Record<string, ZoneTracker>;
  advanceZone: (zoneId: string) => void;
}) => (
  <div style={styles.container}>
    <div style={styles.debugInfo}>
      Principal ({(zoneTrackers.main?.items.length) || 0} elementos) + PiP ({(zoneTrackers.pip?.items.length) || 0} elementos)
    </div>
    <ZonePlayer
      items={zoneTrackers.main?.items || []}
      zoneId="main"
      playlist={playlist}
      zoneTracker={zoneTrackers.main || { items: [], currentIndex: 0 }}
      onAdvance={advanceZone}
    />
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
      <ZonePlayer
        items={zoneTrackers.pip?.items || []}
        zoneId="pip"
        playlist={playlist}
        zoneTracker={zoneTrackers.pip || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
  </div>
));
PipBottomRightLayout.displayName = 'PipBottomRightLayout';

const Grid2x2Layout = React.memo(({
  playlist,
  zoneTrackers,
  advanceZone,
}: {
  playlist: Playlist;
  zoneTrackers: Record<string, ZoneTracker>;
  advanceZone: (zoneId: string) => void;
}) => (
  <div style={{ ...styles.container, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "2px" }}>
    <div style={{ ...styles.zone, backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Superior Izq ({(zoneTrackers.top_left?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.top_left?.items || []}
        zoneId="top_left"
        playlist={playlist}
        zoneTracker={zoneTrackers.top_left || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
    <div style={{ ...styles.zone, backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Superior Der ({(zoneTrackers.top_right?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.top_right?.items || []}
        zoneId="top_right"
        playlist={playlist}
        zoneTracker={zoneTrackers.top_right || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
    <div style={{ ...styles.zone, backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Inferior Izq ({(zoneTrackers.bottom_left?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.bottom_left?.items || []}
        zoneId="bottom_left"
        playlist={playlist}
        zoneTracker={zoneTrackers.bottom_left || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
    <div style={{ ...styles.zone, backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Inferior Der ({(zoneTrackers.bottom_right?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.bottom_right?.items || []}
        zoneId="bottom_right"
        playlist={playlist}
        zoneTracker={zoneTrackers.bottom_right || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
  </div>
));
Grid2x2Layout.displayName = 'Grid2x2Layout';

const TripleSplitLayout = React.memo(({
  playlist,
  zoneTrackers,
  advanceZone,
}: {
  playlist: Playlist;
  zoneTrackers: Record<string, ZoneTracker>;
  advanceZone: (zoneId: string) => void;
}) => (
  <div style={{ ...styles.container, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "2px" }}>
    <div style={{ ...styles.zone, gridRow: "1 / 3", backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Zona Izquierda ({(zoneTrackers.left?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.left?.items || []}
        zoneId="left"
        playlist={playlist}
        zoneTracker={zoneTrackers.left || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
    <div style={{ ...styles.zone, backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Superior Derecha ({(zoneTrackers.top_right?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.top_right?.items || []}
        zoneId="top_right"
        playlist={playlist}
        zoneTracker={zoneTrackers.top_right || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
    <div style={{ ...styles.zone, backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Inferior Derecha ({(zoneTrackers.bottom_right?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.bottom_right?.items || []}
        zoneId="bottom_right"
        playlist={playlist}
        zoneTracker={zoneTrackers.bottom_right || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
  </div>
));
TripleSplitLayout.displayName = 'TripleSplitLayout';

const LShapeLayout = React.memo(({
  playlist,
  zoneTrackers,
  advanceZone,
}: {
  playlist: Playlist;
  zoneTrackers: Record<string, ZoneTracker>;
  advanceZone: (zoneId: string) => void;
}) => (
  <div style={{ ...styles.container, display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "2fr 1fr", gap: "2px" }}>
    <div style={{ ...styles.zone, backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Principal ({(zoneTrackers.main?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.main?.items || []}
        zoneId="main"
        playlist={playlist}
        zoneTracker={zoneTrackers.main || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
    <div style={{ ...styles.zone, backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Lateral ({(zoneTrackers.side?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.side?.items || []}
        zoneId="side"
        playlist={playlist}
        zoneTracker={zoneTrackers.side || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
    <div style={{ ...styles.zone, gridColumn: "1 / 3", backgroundColor: "#111" }}>
      <div style={styles.debugInfo}>
        Inferior ({(zoneTrackers.bottom?.items.length) || 0} elementos)
      </div>
      <ZonePlayer
        items={zoneTrackers.bottom?.items || []}
        zoneId="bottom"
        playlist={playlist}
        zoneTracker={zoneTrackers.bottom || { items: [], currentIndex: 0 }}
        onAdvance={advanceZone}
      />
    </div>
  </div>
));
LShapeLayout.displayName = 'LShapeLayout';

const Grid3x3Layout = React.memo(({
  playlist,
  zoneTrackers,
  advanceZone,
}: {
  playlist: Playlist;
  zoneTrackers: Record<string, ZoneTracker>;
  advanceZone: (zoneId: string) => void;
}) => (
  <div style={{ ...styles.container, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: "2px" }}>
    {Array.from({ length: 9 }, (_, i) => {
      const zones = ['top_left', 'top_center', 'top_right', 'middle_left', 'middle_center', 'middle_right', 'bottom_left', 'bottom_center', 'bottom_right'];
      const zoneId = zones[i];
      const zoneNames = ['Superior Izq', 'Superior Centro', 'Superior Der', 'Medio Izq', 'Medio Centro', 'Medio Der', 'Inferior Izq', 'Inferior Centro', 'Inferior Der'];
      
      return (
        <div key={zoneId} style={{ ...styles.zone, backgroundColor: "#111" }}>
          <div style={styles.debugInfo}>
            {zoneNames[i]} ({(zoneTrackers[zoneId]?.items.length) || 0} elementos)
          </div>
          <ZonePlayer
            items={zoneTrackers[zoneId]?.items || []}
            zoneId={zoneId}
            playlist={playlist}
            zoneTracker={zoneTrackers[zoneId] || { items: [], currentIndex: 0 }}
            onAdvance={advanceZone}
          />
        </div>
      );
    })}
  </div>
));
Grid3x3Layout.displayName = 'Grid3x3Layout';

const CustomLayout = React.memo(({
  playlist,
  zoneTrackers,
  advanceZone,
}: {
  playlist: Playlist;
  zoneTrackers: Record<string, ZoneTracker>;
  advanceZone: (zoneId: string) => void;
}) => {
  const customLayoutStyle = useMemo(() => {
    try {
      return playlist.customLayout ? JSON.parse(playlist.customLayout) : {};
    } catch (e) {
      console.warn("Error procesando layout personalizado:", e);
      return {};
    }
  }, [playlist.customLayout]);

  return (
    <div style={styles.container}>
      <div style={styles.debugInfo}>
        Layout Personalizado ({Object.keys(zoneTrackers).length} zonas)
      </div>
      <div style={{ position: 'relative', width: '100%', height: '100%', ...customLayoutStyle.container }}>
        {Object.entries(zoneTrackers).map(([zoneId, tracker]) => {
          const zoneStyle = customLayoutStyle.zones?.[zoneId] || { 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%' 
          };
          
          return (
            <div key={zoneId} style={{ ...styles.zone, ...zoneStyle }}>
              <div style={styles.debugInfo}>
                {zoneId} ({tracker.items.length} elementos)
              </div>
              <ZonePlayer
                items={tracker.items}
                zoneId={zoneId}
                playlist={playlist}
                zoneTracker={tracker}
                onAdvance={advanceZone}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
CustomLayout.displayName = 'CustomLayout';

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
  const [zoneTrackers, setZoneTrackers] = useState<Record<string, ZoneTracker>>({});

  // Función memoizada para obtener token de auth
  const getAuthToken = useCallback(() => {
    return isPreview ? null : localStorage.getItem("authToken");
  }, [isPreview]);

  // Query única para playlist con optimizaciones mejoradas
  const {
    data: playlist,
    isLoading,
    error,
  } = useQuery<Playlist & { items: PlaylistItem[] }>({
    queryKey: ["player-playlist", playlistId, isPreview],
    queryFn: async () => {
      if (!playlistId) throw new Error("ID de playlist requerido");

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
        throw new Error(`Error cargando playlist: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!playlistId,
    staleTime: isPreview ? 5000 : 60000,
    refetchInterval: isPreview ? 5000 : false,
    retry: 2,
  });

  // Query para widgets optimizada
  const { data: widgets = [] } = useQuery<Widget[]>({
    queryKey: ["player-widgets"],
    queryFn: async () => {
      const authToken = getAuthToken();
      if (!authToken) return [];

      const res = await apiFetch("/api/player/widgets", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        console.warn("No se pudieron cargar los widgets");
        return [];
      }
      return res.json();
    },
    enabled: !isPreview && !!playlistId,
    staleTime: 300000,
    refetchInterval: false,
    retry: 1,
  });

  // Inicializar zone trackers de forma optimizada
  useEffect(() => {
    if (!playlist?.items || !Array.isArray(playlist.items)) return;

    console.log("Inicializando playlist:", playlist.name, "Layout:", playlist.layout);

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
      case "grid_3x3":
        ['top_left', 'top_center', 'top_right', 'middle_left', 'middle_center', 'middle_right', 'bottom_left', 'bottom_center', 'bottom_right'].forEach(zone => {
          zones[zone] = [];
        });
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
      case "custom":
        // Para layout personalizado, extraer zonas del customLayout
        try {
          const customLayout = playlist.customLayout ? JSON.parse(playlist.customLayout) : {};
          const customZones = Object.keys(customLayout.zones || {});
          customZones.forEach(zone => {
            zones[zone] = [];
          });
        } catch (e) {
          zones.main = [];
        }
        break;
      case "single_zone":
      default:
        zones.main = [];
        break;
    }

    // Asignar items a zonas
    for (const item of playlist.items) {
      const zone = item.zone || "main";
      console.log(`Elemento ${item.id} asignado a zona: ${zone}`);
      if (!zones[zone]) {
        zones[zone] = [];
      }
      zones[zone].push(item);
    }

    // Ordenar items en cada zona
    for (const zoneId in zones) {
      zones[zoneId].sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    console.log("Zonas configuradas:", zones);

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

  // Función memoizada para avanzar al siguiente item
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

    console.log("🔌 Iniciando WebSocket optimizado para playlist:", playlistId);
    wsManager.connect(undefined, authToken);

    const alertTimers = new Map<number, NodeJS.Timeout>();

    const handleAlertExpired = useCallback((alertId: number) => {
      setActiveAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      if (alertTimers.has(alertId)) {
        clearTimeout(alertTimers.get(alertId)!);
        alertTimers.delete(alertId);
      }
    }, []);

    const handleAlert = useCallback((message: { type: string; data: any }) => {
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
    }, [handleAlertExpired]);

    const handlePlaylistChange = useCallback((message: { type: string; data: any }) => {
      const screenId = localStorage.getItem("screenId");
      if (message.data?.screenId?.toString() === screenId) {
        console.log("🔄 Recargando por cambio de playlist");
        window.location.reload();
      }
    }, []);

    // Heartbeat optimizado para Android
    const sendHeartbeat = useCallback(() => {
      if (wsManager.isConnected()) {
        wsManager.send({
          type: "player-heartbeat",
          timestamp: new Date().toISOString(),
          screenId: localStorage.getItem("screenId"),
        });
      }
    }, []);

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

  // Renderizado memoizado de layouts
  const renderLayout = useCallback(() => {
    if (!playlist) return null;

    const layout = playlist.layout || "single_zone";
    console.log("Renderizando layout:", layout);

    const layoutProps = { playlist, zoneTrackers, advanceZone };

    switch (layout) {
      case "single_zone":
        return <SingleZoneLayout {...layoutProps} />;
      case "split_vertical":
        return <SplitVerticalLayout {...layoutProps} />;
      case "split_horizontal":
        return <SplitHorizontalLayout {...layoutProps} />;
      case "pip_bottom_right":
        return <PipBottomRightLayout {...layoutProps} />;
      case "grid_2x2":
        return <Grid2x2Layout {...layoutProps} />;
      case "grid_3x3":
        return <Grid3x3Layout {...layoutProps} />;
      case "triple_split":
        return <TripleSplitLayout {...layoutProps} />;
      case "l_shape":
        return <LShapeLayout {...layoutProps} />;
      case "custom":
        return <CustomLayout {...layoutProps} />;
      default:
        return (
          <div style={styles.container}>
            <div style={styles.debugInfo}>
              Layout no reconocido: {layout}
            </div>
            <SingleZoneLayout {...layoutProps} />
          </div>
        );
    }
  }, [playlist, zoneTrackers, advanceZone]);

  // Estados de carga y error mejorados
  if (!playlistId) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "15px" }}>⏳</div>
          <div>Esperando configuración de reproducción...</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "15px" }}>🔄</div>
          <div>Cargando contenido multimedia...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center", color: "#ff6b6b" }}>
          <div style={{ fontSize: "24px", marginBottom: "15px" }}>❌</div>
          <div>Error de reproducción: {error instanceof Error ? error.message : "Error desconocido"}</div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div style={styles.container}>
        <div style={{ margin: "auto", textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "15px" }}>📂</div>
          <div>Lista de reproducción no encontrada</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {renderLayout()}

      {/* Widgets memoizados */}
      {widgets.map((widget) => (
        <WidgetRenderer key={widget.id} widget={widget} />
      ))}

      {/* Alertas memoizadas */}
      {activeAlerts.map((alert) => (
        <AlertOverlay key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
