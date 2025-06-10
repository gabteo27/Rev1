import { useState, useEffect } from 'react';
import ContentPlayer from '@/components/player/ContentPlayer';

// Estilos
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

const getDeviceHardwareId = (): string => {
  let id = localStorage.getItem('deviceHardwareId');
  if (!id) {
    // Generar un ID más simple sin caracteres especiales
    id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('deviceHardwareId', id);
  }
  return id;
};

// --- CORRECCIÓN: Añadimos un estado para el error ---
type PlayerStatus = 'initializing' | 'pairing' | 'paired' | 'error';

export default function PlayerPage() {
  const [status, setStatus] = useState<PlayerStatus>('initializing');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem('authToken')) {
      setStatus('paired');
      return;
    }

    const deviceId = getDeviceHardwareId();

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
        setStatus('pairing');
      } catch (err: any) {
        // --- CORRECCIÓN: Actualizamos ambos estados en caso de error ---
        setErrorMessage(err.message);
        setStatus('error');
        console.error("Error al iniciar emparejamiento:", err);
      }
    };

    initiatePairing();

    const intervalId = setInterval(async () => {
        if(status !== 'pairing') return; // Solo hacer polling si estamos en modo pairing
        try {
            // Codificar correctamente el deviceId para la URL
            const encodedDeviceId = encodeURIComponent(deviceId);
            const statusResponse = await fetch(`/api/screens/pairing-status/${encodedDeviceId}`);
            if(!statusResponse.ok) return;

            const data = await statusResponse.json();
          if (data.status === 'paired') {
            console.log('¡Emparejamiento exitoso!', data);
            localStorage.setItem('authToken', data.authToken);
            localStorage.setItem('screenName', data.name);

            // Si el playlistId existe, lo guardamos. Si es nulo o undefined, lo eliminamos.
            if (data.playlistId) {
              localStorage.setItem('playlistId', data.playlistId.toString());
            } else {
              localStorage.removeItem('playlistId');
            }

            clearInterval(intervalId);
            // Cambiar inmediatamente al reproductor
            setStatus('paired');
          }
        } catch (err) {
            console.error("Error durante el polling:", err);
        }
    }, 2000); // Reducir el intervalo a 2 segundos para respuesta más rápida

    return () => clearInterval(intervalId);
  }, [status]); // El useEffect ahora depende del status para detener el polling

  // --- CORRECCIÓN: Añadimos un render para el estado de error ---
  if (status === 'error') {
    return (
      <div style={playerStyles}>
        <h1 style={{ color: '#ef4444' }}>Error de Conexión</h1>
        <p style={{ fontSize: '1.5vw', marginTop: '1rem' }}>{errorMessage}</p>
        <p style={{ fontSize: '1vw', marginTop: '2rem', color: '#aaa' }}>Verifica la consola del servidor para más detalles. La página se reintentará en 15 segundos.</p>
      </div>
    );
  }

  if (status === 'initializing') {
    return <div style={playerStyles}><h1>Inicializando...</h1></div>;
  }

  if (status === 'pairing') {
    return (
      <div style={playerStyles}>
        <h1 style={{ fontSize: '3vw' }}>Introduce este código en tu panel de administración:</h1>
        {pairingCode ? <div style={codeStyles}>{pairingCode}</div> : <p>Obteniendo código...</p>}
      </div>
    );
  }

  if (status === 'paired') {
    return <ContentPlayer />;
  }

  return null;
}