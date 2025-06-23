
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
import React, { useEffect, useState } from 'react';

interface AlertOverlayProps {
  alert: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    duration?: number;
  };
  onClose: () => void;
}

export const AlertOverlay: React.FC<AlertOverlayProps> = ({ alert, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (alert.duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, alert.duration);

      return () => clearTimeout(timer);
    }
  }, [alert.duration, onClose]);

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

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className={`${getAlertStyles()} text-white p-4 rounded-lg border-2 shadow-lg transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{alert.title}</h3>
            <p className="text-sm opacity-90">{alert.message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="ml-4 text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertOverlay;
