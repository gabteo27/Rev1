import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Handle unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});