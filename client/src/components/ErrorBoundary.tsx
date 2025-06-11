
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'Arial, sans-serif',
          flexDirection: 'column',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>
            Error en la aplicación
          </h1>
          <p style={{ marginBottom: '16px', color: '#6b7280' }}>
            Ha ocurrido un error inesperado. Por favor, recarga la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Recargar página
          </button>
          {this.state.error && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#6b7280' }}>
                Detalles del error (para desarrolladores)
              </summary>
              <pre style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                maxWidth: '80vw'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
