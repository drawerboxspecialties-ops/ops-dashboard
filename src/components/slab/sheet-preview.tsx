"use client";

import { useState } from "react";
import { sizeWork, type PricedLine } from "@/lib/slab/pricing";
import type { Confidence } from "@/lib/slab/types";
import { cardClass, isPdf, type StagedFile } from "@/components/slab/sheet-ui";

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

function pieceName(row: PricedLine): string {
  return row.line.label || (row.line.kind === "drawer" ? "Drawer front" : "Door");
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
  const fromFile = selected
    ? rows.filter((row) => sameFile(row.line.sourceFile, selected.file.name) && (row.line.widthIn > 0 || row.line.heightIn > 0))
    : [];
  const sheetRows = fromFile.length > 0 ? fromFile : selected ? rows.filter((row) => row.line.widthIn > 0 && row.line.heightIn > 0) : [];
  const tiedToFile = fromFile.length > 0;
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = sheetRows.find((row) => row.line.id === activeId) ?? sheetRows[0] ?? null;
  const activeIndex = active ? Math.max(0, sheetRows.findIndex((row) => row.line.id === active.line.id)) : 0;
  const page = active?.line.reading?.page ?? 1;
  const mark = active?.line.reading ?? null;
  const work = active ? sizeWork(active.line.widthIn, active.line.heightIn, active.line.quantity) : null;
  const holes = active && active.line.hingeHolesEach > 0 ? Math.round(active.line.hingeHolesEach) : 0;

  function step(delta: number) {
    if (sheetRows.length === 0) return;
    const next = sheetRows[(activeIndex + delta + sheetRows.length) % sheetRows.length];
    setActiveId(next.line.id);
  }

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
            className="h-[min(34vh,18rem)] w-full bg-white"
          />
        ) : selected?.preview && selected.file.type.startsWith("image/") ? (
          <div className="flex h-[min(34vh,18rem)] items-center justify-center">
            <div className="relative h-full w-fit max-w-full">
              {/* Local preview of a file the user just dropped. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.preview} alt={selected.file.name} className="h-full max-w-full object-contain" />
              {sheetRows.map((row, index) => {
                const pin = row.line.reading;
                if (!pin || pin.markX === null || pin.markY === null || pin.page !== page) return null;
                const on = row.line.id === active?.line.id;
                return (
                  <button
                    key={row.line.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${pieceName(row)} was read here`}
                    onClick={() => setActiveId(row.line.id)}
                    style={{ left: `${pin.markX}%`, top: `${pin.markY}%` }}
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

      {selected && active && work ? (
        <div className="mt-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-900">How this size was worked out</h3>
            <span className="text-xs text-stone-500">
              {activeIndex + 1} of {sheetRows.length}
            </span>
          </div>
          <div className="mt-2 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-stone-900">
              {activeIndex + 1}. {pieceName(active)}
            </p>
            <p className="shrink-0 text-xs text-stone-500">
              {confidenceLabel(active.line.confidence)}
              {mark && mark.page > 1 ? ` · page ${mark.page}` : ""}
            </p>
          </div>
          {mark?.seenAs ? <p className="mt-1 text-sm text-stone-500">Copied “{mark.seenAs}”</p> : null}
          {mark?.explanation ? <p className="mt-1 text-sm text-stone-800">{mark.explanation}</p> : null}
          <p className="mt-2 text-sm font-medium tabular-nums text-stone-900">{work.formula}</p>
          <p className="mt-1 text-xs text-stone-500">
            {holes > 0
              ? `${holes} hinge ${holes === 1 ? "hole" : "holes"} on each of ${Math.round(active.line.quantity)}.`
              : "No hinge holes on this row."}
            {mark ? "" : " Read the sheet again to keep the words the model copied."}
            {!tiedToFile ? " These pieces are on the quote. Read the sheet again to tie each one to this file." : ""}
          </p>
          {note ? <p className="mt-1 text-xs text-stone-500">{note}</p> : null}
          {sheetRows.length > 1 ? (
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-stone-800 ring-1 ring-stone-200" onClick={() => step(-1)}>
                Previous
              </button>
              <div className="flex min-w-0 gap-1 overflow-x-auto">
                {sheetRows.map((row, index) => {
                  const on = row.line.id === active.line.id;
                  return (
                    <button
                      key={row.line.id}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${pieceName(row)} calculation`}
                      onClick={() => setActiveId(row.line.id)}
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        on ? "bg-teal-800 text-white" : "bg-white text-stone-800 ring-1 ring-stone-200"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-stone-800 ring-1 ring-stone-200" onClick={() => step(1)}>
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {reading && selected ? <p className="mt-3 text-sm text-stone-500">Reading the sizes on this sheet…</p> : null}
      {selected && sheetRows.length === 0 && !reading ? (
        <p className="mt-3 text-sm text-stone-500">No sizes yet. Read the drawing and the working for each piece shows here, on the sheet.</p>
      ) : null}
    </section>
  );
}
