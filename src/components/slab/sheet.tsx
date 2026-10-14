"use client";

import { useEffect, useRef, useState } from "react";
import { cardClass, formatBytes, ghostButton, hasFiles, outlineButton, primaryButton, type StagedFile } from "@/components/slab/sheet-ui";

export type { StagedFile } from "@/components/slab/sheet-ui";
export { fieldClass, ghostButton, isAccepted, outlineButton, previewable } from "@/components/slab/sheet-ui";
export { BasisButton, FinishSelect, SummaryRow, TextField } from "@/components/slab/sheet-ui";
export { UploadPreview } from "@/components/slab/sheet-preview";
export { LineSheet, PriceBook, PrintQuote, toLine } from "@/components/slab/sheet-editor";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif";

export function UploadTray({
  files,
  reading,
  configured,
  hasLines,
  onAdd,
  onRemove,
  onRead,
  onLoadSampleSizes,
  selectedId,
  onSelect,
}: {
  files: StagedFile[];
  reading: boolean;
  configured: boolean | null;
  hasLines: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRead: (mode: "append" | "replace") => void;
  onLoadSampleSizes: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const pasted = [...(event.clipboardData?.files ?? [])];
      if (pasted.length === 0) return;
      event.preventDefault();
      onAdd(pasted);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onAdd]);

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-stone-900">Read a schedule</h2>
          <p className="mt-1 max-w-xl text-sm text-stone-500">
            Drop a cut list, sketch, or shop drawing. Photos and PDFs are fine. The reader pulls the customer, the PO or job name, and each finished size it can see.
          </p>
        </div>
        <p className="text-xs text-stone-500">
          {configured === null ? "Checking the reader…" : configured ? "Reader is ready" : "Hand entry works without a key"}
        </p>
      </div>

      <div
        onDragEnter={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          onAdd([...event.dataTransfer.files]);
        }}
        className={`mt-4 rounded-xl border border-dashed px-4 py-8 text-center ${
          dragging ? "border-teal-700 bg-teal-50" : "border-stone-300 bg-stone-50/80"
        }`}
      >
        <p className="text-sm font-medium text-stone-900">Drop images or PDFs here</p>
        <p className="mt-1 text-sm text-stone-500">or paste a screenshot</p>
        <button type="button" className={`${outlineButton} mt-4`} onClick={() => inputRef.current?.click()}>
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={ACCEPT}
          multiple
          onChange={(event) => {
            const list = [...(event.target.files ?? [])];
            if (list.length) onAdd(list);
            event.target.value = "";
          }}
        />
      </div>

      {files.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {files.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 ${item.id === selectedId ? "bg-teal-50 ring-1 ring-teal-700" : "bg-stone-50"}`}
            >
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onSelect(item.id)}>
              {item.preview && item.file.type.startsWith("image/") ? (
                // Local preview of a file the user just dropped.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.preview} alt="" className="size-12 rounded-md object-cover" />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-md bg-white text-xs font-semibold text-stone-500">
                  {item.file.type === "application/pdf" ? "PDF" : "IMG"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.file.name}</span>
                <span className="text-xs text-stone-500">{formatBytes(item.file.size)}</span>
              </span>
              </button>
              <button type="button" className={ghostButton} aria-label={`Remove ${item.file.name}`} onClick={() => onRemove(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={primaryButton} disabled={files.length === 0 || reading} onClick={() => onRead("replace")}>
          {reading ? "Reading…" : hasLines ? "Replace current lines" : "Read drawings"}
        </button>
        {hasLines && files.length > 0 ? (
          <button type="button" className={outlineButton} disabled={reading} onClick={() => onRead("append")}>
            Add to the quote
          </button>
        ) : null}
        <button type="button" className={ghostButton} onClick={onLoadSampleSizes}>
          Enter the sample sizes
        </button>
      </div>
      {configured === false ? (
        <p className="mt-3 text-sm text-stone-500">
          File reading needs the AI Gateway on this deployment. The sample sizes and hand entry still price a quote.
        </p>
      ) : null}
    </section>
  );
}
