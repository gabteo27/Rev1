import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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