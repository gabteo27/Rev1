
import React, { useState, useEffect, memo } from 'react';

interface PDFPlayerProps {
  src: string;
  objectFit?: string;
}

const PDFPlayer = memo(({ src, objectFit = 'contain' }: PDFPlayerProps) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  if (error) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
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

  // Configurar estilos según objectFit
  const getContainerStyle = () => {
    const baseStyle = {
      width: '100%',
      height: '100%',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      backgroundColor: '#1a1a1a'
    };

    return baseStyle;
  };

  const getIframeStyle = () => {
    const baseStyle = {
      width: '100%',
      height: '100%',
      border: 'none',
      background: '#fff'
    };

    // Aplicar transformaciones según objectFit
    switch (objectFit) {
      case 'cover':
        return {
          ...baseStyle,
          transform: 'scale(1.1)',
          transformOrigin: 'center center'
        };
      case 'fill':
        return {
          ...baseStyle,
          width: '100%',
          height: '100%'
        };
      case 'contain':
      default:
        return baseStyle;
    }
  };

  return (
    <div style={getContainerStyle()}>
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
          <div>Cargando PDF...</div>
        </div>
      )}
      <iframe
        src={`${src}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
        style={getIframeStyle()}
        title="PDF viewer"
        onLoad={handleLoad}
        onError={handleError}
        allowFullScreen
      />
    </div>
  );
});

PDFPlayer.displayName = 'PDFPlayer';

export default PDFPlayer;
