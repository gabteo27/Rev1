
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ContentPlayer from "@/components/player/ContentPlayer";

// Estilos (sin cambios)
const playerStyles: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
  backgroundColor: '#000', color: 'white', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
  fontFamily: 'sans-serif', textAlign: 'center', padding: '1rem',
};

const codeStyles: React.CSSProperties = {
  fontSize: '5vw', fontWeight: 'bold', letterSpacing: '1vw', padding: '2rem',
  border: '2px solid #fff', borderRadius: '1rem', backgroundColor: '#333',
  marginTop: '2rem'
};

// --- FUNCIÓN PARA OBTENER ID DEL DISPOSITIVO (SIN CAMBIOS) ---
const getDeviceHardwareId = (): string => {
  let id = localStorage.getItem('deviceHardwareId');
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('deviceHardwareId', id);
  }
  return id;
};

// --- CORRECCIÓN: SE INTRODUCE UN ESTADO DE ERROR MEJORADO ---
type PlayerStatus = 'initializing' | 'pairing' | 'paired' | 'error';

export default function PlayerPage() {
  const [status, setStatus] = useState<PlayerStatus>('initializing');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<number | undefined>(undefined);

  // Validate token and get screen info - ALWAYS call this hook
  const { data: screenInfo, isLoading: isValidating, error: validationError } = useQuery({
    queryKey: ['/api/player/validate-token'],
    queryFn: async () => {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('No auth token found');
      }

      const response = await fetch('/api/player/validate-token', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      return response.json();
    },
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (error.message.includes('Token validation failed')) {
        return false;
      }
      return failureCount < 3;
    },
    refetchInterval: 30000, // Check token validity every 30 seconds
    enabled: status === 'paired', // Only run when paired
    onError: (error) => {
      console.error('Token validation error:', error);
      // Clear invalid token and restart pairing process
      localStorage.removeItem('authToken');
      localStorage.removeItem('screenName');
      localStorage.removeItem('playlistId');
      setStatus('initializing');
    }
  });

  useEffect(() => {
    // Validar si el token es válido antes de ir a 'paired'
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      // Verificar si la pantalla realmente existe en el servidor
      fetch('/api/player/validate-token', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      .then(response => {
        if (response.ok) {
          setStatus('paired');
        } else {
          // Token inválido, limpiar localStorage y empezar de nuevo
          localStorage.removeItem('authToken');
          localStorage.removeItem('screenName');
          localStorage.removeItem('playlistId');
          setStatus('initializing');
        }
      })
      .catch(() => {
        // Error de red, limpiar y empezar de nuevo
        localStorage.removeItem('authToken');
        localStorage.removeItem('screenName');
        localStorage.removeItem('playlistId');
        setStatus('initializing');
      });
      return;
    }

    const deviceId = getDeviceHardwareId();

    // Función para iniciar el proceso de emparejamiento
    const initiatePairing = async () => {
      try {
        const response = await fetch('/api/screens/initiate-pairing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceHardwareId: deviceId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'No se pudo obtener el código del servidor.');
        }

        const data = await response.json();
        setPairingCode(data.pairingCode);
        setStatus('pairing'); // Cambiamos a estado de emparejamiento
      } catch (err: any) {
        // --- CORRECCIÓN: MANEJO DE ERRORES AL INICIAR ---
        setErrorMessage(err.message);
        setStatus('error');
        console.error("Error al iniciar emparejamiento:", err);
      }
    };

    initiatePairing();

    // Intervalo para verificar si el emparejamiento se ha completado
    const intervalId = setInterval(async () => {
      // --- CORRECCIÓN: SOLO VERIFICAR SI ESTAMOS EN MODO DE EMPAREJAMIENTO ---
      if (status !== 'pairing' && document.visibilityState !== 'visible') return;

      try {
        const encodedDeviceId = encodeURIComponent(deviceId);
        const statusResponse = await fetch(`/api/screens/pairing-status/${encodedDeviceId}`);

        if (!statusResponse.ok) return;

        const data = await statusResponse.json();

        if (data.status === 'paired') {
          console.log('¡Emparejamiento exitoso!', data);
          localStorage.setItem('authToken', data.authToken);
          localStorage.setItem('screenName', data.name);

          // --- CORRECCIÓN CLAVE: MANEJO DE PLAYLIST ID NULO ---
          if (data.playlistId) {
            localStorage.setItem('playlistId', data.playlistId.toString());
          } else {
            // Si no hay playlist, nos aseguramos de que no quede uno antiguo.
            localStorage.removeItem('playlistId');
          }

          clearInterval(intervalId); // Detenemos el polling
          setStatus('paired'); // Cambiamos al estado final
        }
      } catch (err) {
        console.error("Error durante el polling de estado:", err);
      }
    }, 3000); // Verificamos cada 3 segundos

    // Limpieza al desmontar el componente
    return () => clearInterval(intervalId);
  }, [status]); // El useEffect se re-ejecuta si el 'status' cambia

  // Update current playlist ID when screen info changes
  useEffect(() => {
    if (screenInfo?.valid && screenInfo.screen?.playlistId) {
      console.log(`Screen playlist ID: ${screenInfo.screen.playlistId}, Current: ${currentPlaylistId}`);
      if (screenInfo.screen.playlistId !== currentPlaylistId) {
        console.log(`Updating playlist ID from ${currentPlaylistId} to ${screenInfo.screen.playlistId}`);
        setCurrentPlaylistId(screenInfo.screen.playlistId);
      }
    } else {
      // Get playlistId from URL params if available
      const urlParams = new URLSearchParams(window.location.search);
      const urlPlaylistId = urlParams.get('playlistId') ? parseInt(urlParams.get('playlistId')!) : undefined;
      if (urlPlaylistId && !currentPlaylistId) {
        setCurrentPlaylistId(urlPlaylistId);
      }
    }
  }, [screenInfo, currentPlaylistId]);

  // --- RENDERIZADO BASADO EN EL ESTADO ---

  if (status === 'error') {
    return (
      <div style={playerStyles}>
        <h1 style={{ color: '#ef4444' }}>Error de Conexión</h1>
        <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>{errorMessage}</p>
        <p style={{ fontSize: '1vw', marginTop: '2rem', color: '#aaa' }}>Verifica la consola para más detalles. Reintentando...</p>
      </div>
    );
  }

  if (status === 'initializing') {
    return <div style={playerStyles}><h1>Inicializando Dispositivo...</h1></div>;
  }

  if (status === 'pairing') {
    return (
      <div style={playerStyles}>
        <h1 style={{ fontSize: '3vw' }}>Introduce este código en tu panel de administración:</h1>
        {pairingCode ? <div style={codeStyles}>{pairingCode}</div> : <p>Obteniendo código...</p>}
      </div>
    );
  }

  // Si el estado es 'paired', renderizamos el reproductor de contenido
  if (status === 'paired') {
    // Handle validation errors
    if (validationError) {
      console.error('Screen validation failed:', validationError);
      return (
        <div style={playerStyles}>
          <h1 style={{ color: '#ef4444' }}>Error de Validación</h1>
          <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>
            La pantalla no está correctamente emparejada. Reiniciando...
          </p>
        </div>
      );
    }

    if (isValidating) {
      return (
        <div style={playerStyles}>
          <h1>Validando Pantalla...</h1>
        </div>
      );
    }

    return <ContentPlayer playlistId={currentPlaylistId} isPreview={false} />;
  }

  return null; // No renderizar nada en otros casos
}
