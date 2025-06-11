import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Handle unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  console.error('Promise:', event.promise);
  console.error('Stack:', event.reason?.stack);
  event.preventDefault();
});

// Handle general errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Message:', event.message);
  console.error('Filename:', event.filename);
  console.error('Line:', event.lineno);
});

// Initialize the root element
const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error rendering app:', error);
  // Fallback rendering
  root.render(
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Error cargando la aplicación</h1>
        <p>Por favor, revisa la consola para más detalles</p>
        <button onClick={() => window.location.reload()}>
          Recargar página
        </button>
      </div>
    </div>
  );
}