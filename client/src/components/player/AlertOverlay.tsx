
import { useState, useEffect } from 'react';
import { Alert } from '@shared/schema';

interface AlertOverlayProps {
  alert: Alert;
  onAlertExpired: (alertId: number) => void;
}

export function AlertOverlay({ alert, onAlertExpired }: AlertOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(alert.duration);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (alert.duration === 0) {
      // Duración 0 significa manual, no auto-eliminar
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsVisible(false);
          setTimeout(() => {
            onAlertExpired(alert.id);
          }, 500); // Pequeño delay para la animación
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [alert.duration, alert.id, onAlertExpired]);

  if (!isVisible) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: isVisible ? 'fadeIn 0.5s ease-in' : 'fadeOut 0.5s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: alert.backgroundColor,
          color: alert.textColor,
          padding: '40px 60px',
          borderRadius: '12px',
          maxWidth: '80vw',
          maxHeight: '80vh',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(24px, 4vw, 48px)',
            fontWeight: 'bold',
            lineHeight: '1.2',
            marginBottom: alert.duration > 0 ? '20px' : '0',
          }}
        >
          {alert.message}
        </div>
        
        {alert.duration > 0 && (
          <div
            style={{
              fontSize: 'clamp(16px, 2vw, 24px)',
              opacity: 0.8,
              position: 'absolute',
              bottom: '20px',
              right: '20px',
            }}
          >
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}
