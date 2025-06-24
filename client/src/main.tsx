import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

createRoot(document.getElementById("root")!).render(<App />);
