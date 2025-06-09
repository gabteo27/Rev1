// Contenido de client/src/pages/player.tsx
import { useState, useEffect } from 'react';

// Estilos básicos para el modo quiosco
const playerStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: '#000',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  fontFamily: 'sans-serif',
};

const codeStyles: React.CSSProperties = {
  fontSize: '5vw',
  fontWeight: 'bold',
  letterSpacing: '1vw',
  padding: '2rem',
  border: '2px solid #fff',
  borderRadius: '1rem',
  backgroundColor: '#333'
};

export default function PlayerPage() {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // En el primer renderizado, la app intentará obtener un código de emparejamiento
  useEffect(() => {
    const initiatePairing = async () => {
      try {
        // En un futuro, este endpoint devolvería un código del backend
        // Por ahora, lo simulamos
        console.log("Iniciando emparejamiento...");
        // const response = await fetch('/api/screens/initiate-pairing');
        // const data = await response.json();
        // setPairingCode(data.code);

        // Simulación:
        setTimeout(() => setPairingCode("123-456"), 1000);

      } catch (err) {
        setError("No se pudo conectar con el servidor. Verifique la conexión.");
        console.error(err);
      }
    };

    initiatePairing();
  }, []);

  // Aquí iría la lógica principal del reproductor
  // Por ahora, solo muestra el estado de emparejamiento

  if (error) {
    return <div style={playerStyles}><h1>Error de Conexión</h1><p>{error}</p></div>;
  }

  // TO DO: Una vez emparejado, esta vista cambiará para mostrar el reproductor de contenido.
  return (
    <div style={playerStyles}>
      {pairingCode ? (
        <>
          <h1 style={{ fontSize: '3vw', marginBottom: '2rem' }}>Introduce este código en tu panel de administración:</h1>
          <div style={codeStyles}>{pairingCode}</div>
        </>
      ) : (
        <h1 style={{ fontSize: '3vw' }}>Obteniendo código de emparejamiento...</h1>
      )}
    </div>
  );
}