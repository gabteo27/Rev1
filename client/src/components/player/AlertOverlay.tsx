
import React, { useEffect, useState } from 'react';
import { Alert } from '@shared/schema';

interface AlertOverlayProps {
  alert: Alert;
  onAlertExpired: (alertId: number) => void;
}

export const AlertOverlay: React.FC<AlertOverlayProps> = ({ alert, onAlertExpired }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  // Show alert with fade-in animation
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(showTimer);
  }, []);

  // Handle alert expiration
  useEffect(() => {
    if (!alert.isFixed && alert.duration > 0) {
      const timer = setTimeout(() => {
        handleExpire();
      }, alert.duration * 1000);

      return () => clearTimeout(timer);
    }
  }, [alert.duration, alert.isFixed]);

  const handleExpire = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShouldRender(false);
      onAlertExpired(alert.id);
    }, 300); // Match the fade-out animation duration
  };

  const handleClose = () => {
    if (!alert.isFixed) {
      handleExpire();
    }
  };

  if (!shouldRender) return null;

  // Get animation classes based on alert type and position
  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out';
    
    if (!isVisible) {
      switch (alert.animationType) {
        case 'slide':
          switch (alert.position) {
            case 'top': return `${baseClasses} transform -translate-y-full opacity-0`;
            case 'bottom': return `${baseClasses} transform translate-y-full opacity-0`;
            case 'left': return `${baseClasses} transform -translate-x-full opacity-0`;
            case 'right': return `${baseClasses} transform translate-x-full opacity-0`;
            default: return `${baseClasses} transform scale-95 opacity-0`;
          }
        case 'fade':
          return `${baseClasses} opacity-0`;
        case 'bounce':
          return `${baseClasses} transform scale-50 opacity-0`;
        case 'zoom':
          return `${baseClasses} transform scale-0 opacity-0`;
        default:
          return `${baseClasses} opacity-0`;
      }
    }

    switch (alert.animationType) {
      case 'bounce':
        return `${baseClasses} transform scale-100 opacity-100 animate-bounce`;
      case 'zoom':
        return `${baseClasses} transform scale-100 opacity-100`;
      default:
        return `${baseClasses} transform translate-x-0 translate-y-0 scale-100 opacity-100`;
    }
  };

  // Get position classes
  const getPositionClasses = () => {
    const base = 'fixed z-50';
    
    switch (alert.alertType) {
      case 'banner':
        switch (alert.position) {
          case 'top': return `${base} top-0 left-0 right-0`;
          case 'bottom': return `${base} bottom-0 left-0 right-0`;
          default: return `${base} top-0 left-0 right-0`;
        }
      case 'popup':
        return `${base} inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm`;
      case 'ticker':
        switch (alert.position) {
          case 'bottom': return `${base} bottom-0 left-0 right-0`;
          default: return `${base} top-0 left-0 right-0`;
        }
      case 'sidebar':
        switch (alert.position) {
          case 'left': return `${base} left-0 top-0 bottom-0 w-80`;
          case 'right': return `${base} right-0 top-0 bottom-0 w-80`;
          default: return `${base} right-0 top-0 bottom-0 w-80`;
        }
      case 'overlay':
        return `${base} inset-0 bg-black bg-opacity-70 backdrop-blur-sm`;
      default:
        return `${base} top-0 left-0 right-0`;
    }
  };

  // Get alert content styling
  const getAlertStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: alert.backgroundColor || '#ef4444',
      color: alert.textColor || '#ffffff',
      fontSize: `${alert.fontSize || 16}px`,
      fontWeight: alert.fontWeight || 'normal',
      opacity: (alert.opacity || 100) / 100,
      borderRadius: `${alert.borderRadius || 8}px`,
      padding: `${alert.padding || 16}px`,
      margin: `${alert.margin || 0}px`,
      zIndex: alert.zIndex || 1000,
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    };

    // Add specific styling based on alert type
    switch (alert.alertType) {
      case 'popup':
        return {
          ...baseStyle,
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center',
          borderRadius: '16px',
          padding: '32px',
          position: 'relative',
        };
      case 'banner':
        return {
          ...baseStyle,
          width: '100%',
          textAlign: 'center',
          borderRadius: '0',
          borderLeft: 'none',
          borderRight: 'none',
        };
      case 'ticker':
        return {
          ...baseStyle,
          width: '100%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          borderRadius: '0',
          borderLeft: 'none',
          borderRight: 'none',
        };
      case 'sidebar':
        return {
          ...baseStyle,
          height: '100%',
          borderRadius: '0',
          padding: '24px',
          borderTop: 'none',
          borderBottom: 'none',
        };
      case 'overlay':
        return {
          ...baseStyle,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          borderRadius: '0',
          border: 'none',
        };
      default:
        return baseStyle;
    }
  };

  // Render ticker animation
  const renderTickerContent = () => {
    if (alert.alertType !== 'ticker') return alert.message;

    return (
      <div 
        className="inline-block animate-pulse"
        style={{
          animation: `scroll-left ${30 / (alert.tickerSpeed || 50)}s linear infinite`,
        }}
      >
        {alert.message}
      </div>
    );
  };

  // Get priority indicator
  const getPriorityIndicator = () => {
    const colors = {
      low: '#6b7280',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    };

    return (
      <div 
        className="absolute top-2 right-2 w-3 h-3 rounded-full animate-pulse"
        style={{ backgroundColor: colors[alert.priority as keyof typeof colors] || colors.normal }}
      />
    );
  };

  return (
    <div className={`${getPositionClasses()} ${getAnimationClasses()}`}>
      <div style={getAlertStyle()}>
        {/* Priority indicator for popups and overlays */}
        {(alert.alertType === 'popup' || alert.alertType === 'overlay') && getPriorityIndicator()}
        
        {/* Close button for non-fixed alerts */}
        {!alert.isFixed && alert.alertType === 'popup' && (
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-white hover:text-gray-300 transition-colors"
            style={{ fontSize: '20px', lineHeight: 1 }}
          >
            ×
          </button>
        )}

        {/* Alert icon */}
        {alert.showIcon && (
          <div className="inline-flex items-center mr-3">
            {alert.iconType === 'warning' && (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {alert.iconType === 'error' && (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {alert.iconType === 'success' && (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {alert.iconType === 'info' && (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}

        {/* Alert content */}
        <div className="flex-1">
          {renderTickerContent()}
        </div>

        {/* Duration indicator for timed alerts */}
        {!alert.isFixed && alert.duration > 0 && alert.alertType === 'popup' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white bg-opacity-30 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-white bg-opacity-70 transition-all ease-linear"
              style={{
                width: '100%',
                animation: `shrink ${alert.duration}s linear forwards`,
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
