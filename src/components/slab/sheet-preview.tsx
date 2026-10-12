"use client";

import { useState } from "react";
import { PdfPage } from "@/components/slab/pdf-page";
import { formatInches, parseInches, sizeWork, type PricedLine } from "@/lib/slab/pricing";
import type { Confidence, LineItem, SizeReading } from "@/lib/slab/types";
import { cardClass, fieldClass, isPdf, type StagedFile } from "@/components/slab/sheet-ui";

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

function placed(mark: SizeReading | null): mark is SizeReading & { markX: number; markY: number } {
  return Boolean(mark && mark.markX !== null && mark.markY !== null);
}

export function UploadPreview({
  files,
  selectedId,
  onSelect,
  rows,
  note,
  reading,
  onUpdate,
  onAddPiece,
}: {
  files: StagedFile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  rows: PricedLine[];
  note: string;
  reading: boolean;
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
  onAddPiece: (fileName: string) => string;
}) {
  const selected = files.find((item) => item.id === selectedId) ?? null;
  const fromFile = selected ? rows.filter((row) => sameFile(row.line.sourceFile, selected.file.name)) : [];
  const sheetRows = fromFile.length > 0 ? fromFile : selected ? rows.filter((row) => row.line.widthIn > 0 && row.line.heightIn > 0) : [];
  const tiedToFile = fromFile.length > 0;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [manualPage, setManualPage] = useState<number | null>(null);
  const active = sheetRows.find((row) => row.line.id === activeId) ?? sheetRows[0] ?? null;
  const activeIndex = active ? Math.max(0, sheetRows.findIndex((row) => row.line.id === active.line.id)) : 0;
  const page = manualPage ?? active?.line.reading?.page ?? 1;

  function choose(id: string) {
    setManualPage(null);
    setActiveId(id);
  }

  function step(delta: number) {
    if (sheetRows.length === 0) return;
    const next = sheetRows[(activeIndex + delta + sheetRows.length) % sheetRows.length];
    choose(next.line.id);
  }

  const review =
    selected && (sheetRows.length > 0 || reading) ? (
      <SizeReview
        rows={sheetRows}
        active={active}
        activeIndex={activeIndex}
        note={note}
        tiedToFile={tiedToFile}
        reading={reading}
        page={page}
        pageCount={pageCount}
        onChoose={choose}
        onStep={step}
        onPage={(next) => setManualPage(next)}
        onUpdate={onUpdate}
      />
    ) : null;

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
          <PdfPage file={selected.file} page={page} onPages={setPageCount}>
            {review}
          </PdfPage>
        ) : selected?.preview && selected.file.type.startsWith("image/") ? (
          <div className="flex max-h-[min(62vh,36rem)] items-center justify-center">
            <div className="relative w-fit max-w-full">
              {/* Local preview of a file the user just dropped. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.preview} alt={selected.file.name} className="block max-h-[min(62vh,36rem)] max-w-full object-contain" />
              {review}
            </div>
          </div>
        ) : (
          <p className="px-4 py-16 text-center text-sm text-stone-500">
            {selected ? "This file cannot be shown here." : "Drop a photo or PDF and it stays here, next to the quote."}
          </p>
        )}
      </div>
      {selected && !reading ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-500">
            {sheetRows.length === 0 ? "Read the drawing, or type a size on it." : "Change a size on the sheet. The quote follows."}
          </p>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-800"
            onClick={() => choose(onAddPiece(selected.file.name))}
          >
            Add a size
          </button>
        </div>
      ) : null}
    </section>
  );
}

function SizeReview({
  rows,
  active,
  activeIndex,
  note,
  tiedToFile,
  reading,
  page,
  pageCount,
  onChoose,
  onStep,
  onPage,
  onUpdate,
}: {
  rows: PricedLine[];
  active: PricedLine | null;
  activeIndex: number;
  note: string;
  tiedToFile: boolean;
  reading: boolean;
  page: number;
  pageCount: number;
  onChoose: (id: string) => void;
  onStep: (delta: number) => void;
  onPage: (page: number) => void;
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
}) {
  const mark = active?.line.reading ?? null;
  const work = active ? sizeWork(active.line.widthIn, active.line.heightIn, active.line.quantity) : null;

  return (
    <>
      {rows.map((row, index) => {
        const pin = row.line.reading;
        if (!placed(pin) || pin.page !== page) return null;
        const on = row.line.id === active?.line.id;
        return (
          <button
            key={row.line.id}
            type="button"
            aria-pressed={on}
            aria-label={`${pieceName(row)} on the page`}
            onClick={() => onChoose(row.line.id)}
            style={{ left: `${pin.markX}%`, top: `${pin.markY}%` }}
            className={`absolute z-30 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white ${
              on ? "bg-teal-800 text-white" : "bg-stone-800 text-white"
            }`}
          >
            {index + 1}
          </button>
        );
      })}
      <div className="absolute inset-x-2 top-2 z-20 flex items-center gap-1">
        {rows.length > 1 ? (
          <button type="button" className="rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-stone-800 shadow ring-1 ring-stone-200" onClick={() => onStep(-1)}>
            Previous
          </button>
        ) : null}
        <p className="min-w-0 truncate rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-stone-900 shadow ring-1 ring-stone-200">
          {reading && rows.length === 0 ? "Reading sizes on this page…" : active ? `${activeIndex + 1} of ${rows.length} · ${pieceName(active)}` : "No sizes on this page"}
          {pageCount > 1 ? ` · page ${page}/${pageCount}` : ""}
        </p>
        {rows.length > 1 ? (
          <button type="button" className="rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-stone-800 shadow ring-1 ring-stone-200" onClick={() => onStep(1)}>
            Next
          </button>
        ) : null}
        {pageCount > 1 ? (
          <span className="ml-auto flex gap-1">
            <button type="button" className="rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-stone-800 shadow ring-1 ring-stone-200" onClick={() => onPage(Math.max(1, page - 1))}>
              Page up
            </button>
            <button type="button" className="rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-stone-800 shadow ring-1 ring-stone-200" onClick={() => onPage(Math.min(pageCount, page + 1))}>
              Page down
            </button>
          </span>
        ) : null}
      </div>
      {active && work ? (
        <div className="absolute inset-x-2 bottom-2 z-20 rounded-xl bg-white/95 p-2.5 text-left shadow-lg ring-1 ring-stone-300">
          <p className="text-xs font-semibold text-stone-500">
            {confidenceLabel(active.line.confidence) || "On the quote"}
            {placed(mark) ? "" : " · not marked on the page yet"}
          </p>
          <p className="text-sm font-semibold text-stone-900">
            {activeIndex + 1}. {pieceName(active)}
          </p>
          {mark?.seenAs ? <p className="mt-1 text-xs text-stone-500">Copied “{mark.seenAs}”</p> : null}
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            <LiveInch label="Width" value={active.line.widthIn} onCommit={(widthIn) => onUpdate(active.line.id, { widthIn })} />
            <LiveInch label="Height" value={active.line.heightIn} onCommit={(heightIn) => onUpdate(active.line.id, { heightIn })} />
            <LiveCount label="Qty" value={active.line.quantity} fallback={1} onCommit={(quantity) => onUpdate(active.line.id, { quantity })} />
            <LiveCount label="Hinges" value={active.line.hingeHolesEach} fallback={0} onCommit={(hingeHolesEach) => onUpdate(active.line.id, { hingeHolesEach })} />
          </div>
          <p className="mt-1.5 text-sm font-medium tabular-nums text-stone-900">{work.formula}</p>
          {mark?.explanation ? <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-500">{mark.explanation}</p> : null}
          {!placed(mark) || !tiedToFile || note ? (
            <p className="mt-1 text-[11px] leading-snug text-stone-500">
              {placed(mark) ? "" : "This size is not marked on the page yet. "}
              {!tiedToFile ? "These pieces are on the quote. " : ""}
              {note}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function LiveInch({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const text = focused || invalid ? draft : value > 0 ? formatInches(value) : "";

  return (
    <label className="block text-[10px] font-semibold text-stone-500">
      {label}
      <input
        aria-label={`${label} on the sheet`}
        inputMode="decimal"
        value={text}
        aria-invalid={invalid}
        className={`${fieldClass} mt-0.5 h-7 px-1.5 py-0 text-xs tabular-nums`}
        onFocus={() => {
          setFocused(true);
          setDraft(value > 0 ? formatInches(value) : "");
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next.trim() === "") {
            setInvalid(false);
            onCommit(0);
            return;
          }
          const parsed = parseInches(next);
          if (parsed === null) return;
          setInvalid(false);
          onCommit(parsed);
        }}
        onBlur={() => {
          setFocused(false);
          if (draft.trim() === "") {
            setInvalid(false);
            onCommit(0);
            return;
          }
          const parsed = parseInches(draft);
          if (parsed === null) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onCommit(parsed);
        }}
      />
    </label>
  );
}

function LiveCount({
  label,
  value,
  fallback,
  onCommit,
}: {
  label: string;
  value: number;
  fallback: number;
  onCommit: (value: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const text = focused ? draft : String(value);

  return (
    <label className="block text-[10px] font-semibold text-stone-500">
      {label}
      <input
        aria-label={`${label} on the sheet`}
        inputMode="numeric"
        value={text}
        className={`${fieldClass} mt-0.5 h-7 px-1.5 py-0 text-xs tabular-nums`}
        onFocus={() => {
          setFocused(true);
          setDraft(String(value));
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next.trim() === "") return;
          const parsed = Number(next);
          if (!Number.isInteger(parsed) || parsed < 0 || parsed > 500) return;
          onCommit(parsed);
        }}
        onBlur={() => {
          setFocused(false);
          if (draft.trim() === "") {
            onCommit(fallback);
            return;
          }
          const parsed = Number(draft);
          if (!Number.isInteger(parsed) || parsed < 0 || parsed > 500) return;
          onCommit(parsed);
        }}
      />
    </label>
  );
}
