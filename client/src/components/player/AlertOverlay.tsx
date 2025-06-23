import React, { useEffect, useState } from 'react';
import { Alert } from '@shared/schema';

interface AlertOverlayProps {
  alert: Alert;
  onAlertExpired: (alertId: number) => void;
}

export const AlertOverlay: React.FC<AlertOverlayProps> = ({ alert, onAlertExpired }) => {
  const [timeLeft, setTimeLeft] = useState(alert.duration);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (alert.duration === 0) {
      // Duration 0 means manual, not auto-remove
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsVisible(false);
          setTimeout(() => {
            onAlertExpired(alert.id);
          }, 500); // Small delay for animation
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

  const getAlertStyles = () => {
    switch (alert.type) {
      case 'error':
        return 'bg-red-600 border-red-700';
      case 'warning':
        return 'bg-yellow-600 border-yellow-700';
      default:
        return 'bg-blue-600 border-blue-700';
    }
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
        className={`${getAlertStyles()} text-white p-4 rounded-lg border-2 shadow-lg transition-opacity duration-300`}
        style={{
          maxWidth: '80vw',
          maxHeight: '80vh',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{
          fontSize: 'clamp(24px, 4vw, 48px)',
          fontWeight: 'bold',
          lineHeight: '1.2',
          marginBottom: alert.duration > 0 ? '20px' : '0',
        }}>
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
};

export default AlertOverlay;