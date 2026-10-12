"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { CONSTRUCTIONS, FINISHES, HINGE_HOLE_CENTS, PRICE_LIST, SMALL_JOB_SURCHARGE_CENTS, finishesFor, getFinish } from "@/lib/slab/catalog";
import { formatInches, formatMoney, formatSquareFeet, parseInches, priceQuote, sizeWork, type PricedLine } from "@/lib/slab/pricing";
import type { Confidence, LineItem, PieceKind } from "@/lib/slab/types";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif";

export type StagedFile = { id: string; file: File; preview: string | null };

export function previewable(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

type ExtractedPiece = {
  label: string;
  kind: PieceKind;
  widthIn: number;
  heightIn: number;
  quantity: number;
  hingeHolesEach: number;
  finishId: string | null;
  materialHint: string;
  notes: string;
  confidence: Confidence;
  sourceFile: string;
  seenAs: string;
  explanation: string;
  markX: number | null;
  markY: number | null;
  page: number;
};

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
            Drop a cut list, sketch, or shop drawing. Photos and PDFs are fine. The reader pulls finished width, height, quantity, and any hinge holes it can see.
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
        <button type="button" className={primaryButton} disabled={files.length === 0 || reading} onClick={() => onRead(hasLines ? "append" : "replace")}>
          {reading ? "Reading…" : hasLines ? "Add what it finds" : "Read drawings"}
        </button>
        {hasLines && files.length > 0 ? (
          <button type="button" className={outlineButton} disabled={reading} onClick={() => onRead("replace")}>
            Replace current lines
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

function sameFile(source: string | null, name: string): boolean {
  if (!source) return false;
  const leaf = source.trim().toLowerCase().split(/[/\\]/).pop();
  return leaf === name.trim().toLowerCase();
}

function confidenceLabel(confidence: Confidence | null): string {
  if (confidence === "high") return "Printed";
  if (confidence === "medium") return "Handwritten";
  if (confidence === "low") return "Unsure — check it";
  return "";
}

export function UploadPreview({
  files,
  selectedId,
  onSelect,
  rows,
  note,
  reading,
}: {
  files: StagedFile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  rows: PricedLine[];
  note: string;
  reading: boolean;
}) {
  const selected = files.find((item) => item.id === selectedId) ?? null;
  const sheetRows = selected ? rows.filter((row) => row.line.reading && sameFile(row.line.sourceFile, selected.file.name)) : [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = sheetRows.find((row) => row.line.id === activeId) ?? sheetRows[0] ?? null;
  const page = active?.line.reading?.page ?? 1;

  return (
    <section className={`${cardClass} print:hidden xl:sticky xl:top-4`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-stone-900">Sheet</h2>
        <p className="truncate text-xs text-stone-500">{selected ? selected.file.name : "Nothing dropped yet"}</p>
      </div>
      {files.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {files.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === selected?.id}
              onClick={() => onSelect(item.id)}
              className={`max-w-40 shrink-0 truncate rounded-lg px-2 py-1 text-xs font-semibold ${
                item.id === selected?.id ? "bg-teal-800 text-white" : "bg-stone-100 text-stone-700"
              }`}
            >
              {item.file.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
        {selected?.preview && isPdf(selected.file) ? (
          <iframe
            key={`${selected.id}-${page}`}
            title={selected.file.name}
            src={`${selected.preview}#page=${page}&view=FitH`}
            className="h-[min(70vh,42rem)] w-full bg-white"
          />
        ) : selected?.preview && selected.file.type.startsWith("image/") ? (
          <div className="flex max-h-[min(70vh,42rem)] items-center justify-center">
            <div className="relative w-fit max-w-full">
              <img src={selected.preview} alt={selected.file.name} className="max-h-[min(70vh,42rem)] max-w-full object-contain" />
              {sheetRows.map((row, index) => {
                const mark = row.line.reading;
                if (!mark || mark.markX === null || mark.markY === null || mark.page !== page) return null;
                const on = row.line.id === active?.line.id;
                return (
                  <button
                    key={row.line.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${row.line.label || "Piece"} was read here`}
                    onClick={() => setActiveId(row.line.id)}
                    style={{ left: `${mark.markX}%`, top: `${mark.markY}%` }}
                    className={`absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white ${
                      on ? "bg-teal-800 text-white" : "bg-stone-800 text-white"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="px-4 py-16 text-center text-sm text-stone-500">
            {selected ? "This file cannot be shown here." : "Drop a photo or PDF and it stays here, next to the quote."}
          </p>
        )}
      </div>
      {reading && selected ? <p className="mt-3 text-sm text-stone-500">Reading the sizes on this sheet…</p> : null}
      {sheetRows.length > 0 ? (
        <div className="mt-3">
          <h3 className="text-sm font-semibold text-stone-900">How this was read</h3>
          {note ? <p className="mt-1 text-sm text-stone-500">{note}</p> : null}
          <ul className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto">
            {sheetRows.map((row, index) => {
              const work = sizeWork(row.line.widthIn, row.line.heightIn, row.line.quantity);
              const mark = row.line.reading;
              const on = row.line.id === active?.line.id;
              const holes = row.line.hingeHolesEach > 0 ? Math.round(row.line.hingeHolesEach) : 0;
              return (
                <li key={row.line.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setActiveId(row.line.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left ring-1 ${on ? "bg-teal-50 ring-teal-700" : "bg-stone-50 ring-transparent"}`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-stone-900">
                        {index + 1}. {row.line.label || (row.line.kind === "drawer" ? "Drawer front" : "Door")}
                      </span>
                      <span className="shrink-0 text-xs text-stone-500">
                        {confidenceLabel(row.line.confidence)}
                        {mark && mark.page > 1 ? ` · page ${mark.page}` : ""}
                      </span>
                    </span>
                    {mark?.seenAs ? <span className="mt-1 block text-sm text-stone-500">Copied “{mark.seenAs}”</span> : null}
                    {mark?.explanation ? <span className="mt-1 block text-sm text-stone-800">{mark.explanation}</span> : null}
                    <span className="mt-1 block text-sm tabular-nums text-stone-900">{work.formula}</span>
                    {holes > 0 ? (
                      <span className="mt-1 block text-xs text-stone-500">
                        {holes} hinge {holes === 1 ? "hole" : "holes"} on each of {Math.round(row.line.quantity)}
                      </span>
                    ) : (
                      <span className="mt-1 block text-xs text-stone-500">No hinge holes on this row</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
