import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';

/** Renders a PDF page by page with pdf.js (loaded on demand). */
export default function PdfPreview({ url, onPages }) {
  const canvas = useRef(null);
  const [doc, setDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let task;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        task = pdfjs.getDocument({ url, withCredentials: true });
        const d = await task.promise;
        if (!cancelled) {
          setDoc(d);
          onPages?.(d.numPages);
        }
      } catch {
        if (!cancelled) setError('Preview could not be loaded. You can still download the file.');
      }
    })();
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [url, onPages]);

  useEffect(() => {
    if (!doc || !canvas.current) return undefined;
    let renderTask;
    (async () => {
      const p = await doc.getPage(page);
      const width = canvas.current.parentElement.clientWidth;
      const base = p.getViewport({ scale: 1 });
      const scale = (width / base.width) * (window.devicePixelRatio || 1);
      const viewport = p.getViewport({ scale });
      canvas.current.width = viewport.width;
      canvas.current.height = viewport.height;
      canvas.current.style.width = '100%';
      renderTask = p.render({ canvas: canvas.current, canvasContext: canvas.current.getContext('2d'), viewport });
      await renderTask.promise.catch(() => {});
    })();
    return () => renderTask?.cancel();
  }, [doc, page]);

  if (error) return <p className="p-8 text-sm text-muted">{error}</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className="h-[min(560px,75vh)] overflow-y-auto bg-white shadow-sm" tabIndex={0} aria-label="Document preview, scroll to read">
        <canvas ref={canvas} aria-label={`PDF page ${page}`} role="img" />
      </div>
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="md" className="h-9" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Previous
        </Button>
        <span className="text-sm text-muted">{doc ? `Page ${page} of ${doc.numPages}` : 'Loading…'}</span>
        <Button variant="secondary" size="md" className="h-9" disabled={!doc || page >= doc.numPages} onClick={() => setPage((p) => p + 1)}>
          Next →
        </Button>
      </div>
    </div>
  );
}
