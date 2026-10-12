"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const PDFJS_URL = "https://unpkg.com/pdfjs-dist@6.4.299/build/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://unpkg.com/pdfjs-dist@6.4.299/build/pdf.worker.min.mjs";

type PdfViewport = { width: number; height: number };
type PdfRenderTask = { promise: Promise<void>; cancel: () => void };
type PdfPageProxy = {
  getViewport: (params: { scale: number }) => PdfViewport;
  render: (params: { canvasContext: CanvasRenderingContext2D; canvas: HTMLCanvasElement; viewport: PdfViewport }) => PdfRenderTask;
};
type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
};
type PdfLoadingTask = { promise: Promise<PdfDocument>; destroy: () => Promise<void> };
type Pdfjs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: Uint8Array }) => PdfLoadingTask;
};

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
    let loadingTask: PdfLoadingTask | null = null;
    let renderTask: PdfRenderTask | null = null;
    setStatus("loading");

    (async () => {
      try {
        const pdfjs = (await new Function("url", "return import(url)")(PDFJS_URL)) as Pdfjs;
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
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
        {status === "loading" ? <p className="absolute inset-x-0 top-3 text-center text-sm text-stone-500">Opening this page.</p> : null}
        {status === "error" ? <p className="px-4 py-16 text-center text-sm text-stone-500">This PDF page could not be drawn.</p> : null}
        {status === "ready" ? children : null}
      </div>
    </div>
  );
}
