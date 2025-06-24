import React, { useState, useEffect, useCallback, memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.js`;

interface PDFPlayerProps {
  src: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

const PDFPlayer = memo(({ src, objectFit = 'contain' }: PDFPlayerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (numPages && numPages > 1) {
      const interval = setInterval(() => {
        setCurrentPage(prevPage => (prevPage % numPages) + 1);
      }, 10000); 
      return () => clearInterval(interval);
    }
  }, [numPages]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error al cargar el PDF:', error.message);
    setError('No se pudo cargar el archivo PDF.');
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1a1a1a', color: 'white' }}>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div 
      className={`pdf-container-fit-${objectFit}`} 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Document
        file={src}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={<div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Cargando PDF...</div>}
      >
        <Page
          pageNumber={currentPage}
          width={1200}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="pdf-page"
        />
      </Document>
    </div>
  );
});

PDFPlayer.displayName = 'PDFPlayer';

export default PDFPlayer;