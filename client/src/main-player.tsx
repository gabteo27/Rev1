// Contenido de client/src/main-player.tsx
import { createRoot } from "react-dom/client";
import PlayerPage from "./pages/player"; // Crearemos esta página a continuación
import "./index.css";

// Renderiza únicamente la página del reproductor
createRoot(document.getElementById("root")!).render(<PlayerPage />);