"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function PdfPage({
  file,
  page,
  onPages,
  children,
}: {
  file: File;
  page: number;
  onPages: (count: number) => void;
  children?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onPagesRef = useRef(onPages);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  onPagesRef.current = onPages;

  useEffect(() => {
    let cancelled = false;
    let loadingTask: import("pdfjs-dist").PDFDocumentLoadingTask | null = null;
    let renderTask: import("pdfjs-dist").RenderTask | null = null;
    setStatus("loading");

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const data = new Uint8Array(await file.arrayBuffer());
        loadingTask = pdfjs.getDocument({ data });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        onPagesRef.current(doc.numPages);
        const pageNumber = Math.min(Math.max(1, page), doc.numPages);
        const pdfPage = await doc.getPage(pageNumber);
        const base = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: Math.min(2, 1200 / base.width) });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context || cancelled) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        renderTask = pdfPage.render({ canvasContext: context, canvas, viewport });
        await renderTask.promise;
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      } finally {
        await loadingTask?.destroy();
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [file, page]);

  return (
    <div className="flex max-h-[min(62vh,36rem)] items-center justify-center bg-white">
      <div className="relative w-fit max-w-full">
        <canvas ref={canvasRef} className="block max-h-[min(62vh,36rem)] max-w-full bg-white" />
        {status === "loading" ? <p className="absolute inset-x-0 top-3 text-center text-sm text-stone-500">Opening this page\u2026</p> : null}
        {status === "error" ? <p className="px-4 py-16 text-center text-sm text-stone-500">This PDF page could not be drawn.</p> : null}
        {status === "ready" ? children : null}
      </div>
    </div>
  );
}
