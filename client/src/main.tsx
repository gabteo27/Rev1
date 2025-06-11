
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Message:', event.message);
  console.error('Filename:', event.filename);
  console.error('Line:', event.lineno);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior
  event.preventDefault();
});

// Initialize the root element
const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);

// Render the app with proper error boundary
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
