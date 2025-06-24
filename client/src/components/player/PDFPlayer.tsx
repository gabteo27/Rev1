import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Importa los estilos necesarios para que el visor funcione correctamente
import 'pdfjs-dist/web/pdf_viewer.css';

// Configura la ruta al "worker" que procesa el PDF en segundo plano.
// Esta línea es crucial para que react-pdf funcione.
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.js`;

const PDFPlayer = memo(({ src }: { src: string }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // (Opcional) Efecto para ciclar entre las páginas del PDF cada 10 segundos
  useEffect(() => {
    if (numPages && numPages > 1) {
      const interval = setInterval(() => {
        // Avanza a la siguiente página, y si llega al final, vuelve a la primera
        setCurrentPage(prevPage => (prevPage % numPages) + 1);
      }, 10000); 

      return () => clearInterval(interval); // Limpia el temporizador al desmontar
    }
  }, [numPages]);

  // Se ejecuta cuando el documento PDF se carga correctamente
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1); // Siempre empieza en la primera página
    setError(null);
  }, []);

  // Se ejecuta si hay un error al cargar el PDF
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error al cargar el PDF:', error.message);
    setError('No se pudo cargar el archivo PDF.');
  }, []);

  // Si hay un error, muestra un mensaje
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1a1a1a', color: 'white' }}>
        <div>{error}</div>
      </div>
    );
  }

  return (
    // Contenedor principal con estilos para centrar y ajustar el PDF
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#555' }}>
      <Document
        file={src}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={<div style={{ color: 'white' }}>Cargando PDF...</div>}
        // Este div contenedor asegura que el PDF no se desborde
        className="pdf-container" 
        style={{maxWidth: '100%', maxHeight: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center'}}
      >
        <Page
          pageNumber={currentPage}
          // Hace la página responsiva usando el ancho de la ventana como referencia
          // y limita el tamaño para que no sea excesivamente grande.
          width={Math.min(window.innerWidth, 1200)} 
          // Estas props mejoran el rendimiento al no renderizar capas innecesarias
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  );
});

PDFPlayer.displayName = 'PDFPlayer';

// Exporta el componente para poder importarlo desde otras páginas
export default PDFPlayer;