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
  if (confidence === "low") return "Unsure \u2014 check it";
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
              {/* Local preview of a file the user just dropped. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
      {reading && selected ? <p className="mt-3 text-sm text-stone-500">Reading the sizes on this sheet\u2026</p> : null}
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
                        {mark && mark.page > 1 ? ` \u00b7 page ${mark.page}` : ""}
                      </span>
                    </span>
                    {mark?.seenAs ? <span className="mt-1 block text-sm text-stone-500">Copied \u201c{mark.seenAs}\u201d</span> : null}
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
