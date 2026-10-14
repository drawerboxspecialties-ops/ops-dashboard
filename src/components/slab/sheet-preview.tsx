"use client";

import { useState } from "react";
import { PdfPage } from "@/components/slab/pdf-page";
import { formatInches, parseInches, sizeWork, type PricedLine } from "@/lib/slab/pricing";
import { openSide, spreadPins, type Side } from "@/lib/slab/sheet-layout";
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

const chipClass: Record<Side, string> = {
  top: "absolute bottom-full left-1/2 z-40 mb-1 -translate-x-1/2",
  bottom: "absolute top-full left-1/2 z-40 mt-1 -translate-x-1/2",
  left: "absolute right-full top-1/2 z-40 mr-1 -translate-y-1/2",
  right: "absolute left-full top-1/2 z-40 ml-1 -translate-y-1/2",
};

export function UploadPreview({
  files,
  selectedId,
  onSelect,
  rows,
  note,
  reading,
  onUpdate,
  onAddPiece,
  onRemovePiece,
}: {
  files: StagedFile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  rows: PricedLine[];
  note: string;
  reading: boolean;
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
  onAddPiece: (fileName: string) => string;
  onRemovePiece: (id: string) => void;
}) {
  const selected = files.find((item) => item.id === selectedId) ?? null;
  const sheetRows = selected ? rows.filter((row) => sameFile(row.line.sourceFile, selected.file.name)) : [];
  const tiedToFile = sheetRows.length > 0;
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

  const pins =
    selected && sheetRows.length > 0 ? (
      <PinLayer rows={sheetRows} page={page} activeId={active?.line.id ?? null} onChoose={choose} />
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
      <div className="mt-3 rounded-xl bg-stone-100 ring-1 ring-stone-200">
        {selected?.preview && isPdf(selected.file) ? (
          <PdfPage file={selected.file} page={page} onPages={setPageCount}>
            {pins}
          </PdfPage>
        ) : selected?.preview && selected.file.type.startsWith("image/") ? (
          <div className="flex max-h-[min(62vh,36rem)] items-center justify-center">
            <div className="relative w-fit max-w-full">
              {/* Local preview of a file the user just dropped. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.preview} alt={selected.file.name} className="block max-h-[min(62vh,36rem)] max-w-full rounded-xl object-contain" />
              {pins}
            </div>
          </div>
        ) : (
          <p className="px-4 py-16 text-center text-sm text-stone-500">
            {selected ? "This file cannot be shown here." : "Drop a photo or PDF and it stays here, next to the quote."}
          </p>
        )}
      </div>
      {selected && (sheetRows.length > 1 || pageCount > 1 || reading) ? (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {sheetRows.length > 1 ? (
            <button type="button" className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-800" onClick={() => step(-1)}>
              Previous
            </button>
          ) : null}
          <p className="min-w-0 truncate px-1 text-xs font-semibold text-stone-900">
            {reading && sheetRows.length === 0
              ? "Reading sizes on this page…"
              : active
                ? `${activeIndex + 1} of ${sheetRows.length} · ${pieceName(active)}`
                : "No sizes on this page"}
            {pageCount > 1 ? ` · page ${page}/${pageCount}` : ""}
          </p>
          {sheetRows.length > 1 ? (
            <button type="button" className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-800" onClick={() => step(1)}>
              Next
            </button>
          ) : null}
          {pageCount > 1 ? (
            <span className="ml-auto flex gap-1">
              <button type="button" className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-800" onClick={() => setManualPage(Math.max(1, page - 1))}>
                Page up
              </button>
              <button
                type="button"
                className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-800"
                onClick={() => setManualPage(Math.min(pageCount, page + 1))}
              >
                Page down
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
      {selected && active ? (
        <SizeEditor
          active={active}
          activeIndex={activeIndex}
          note={note}
          tiedToFile={tiedToFile}
          onUpdate={onUpdate}
          onRemove={onRemovePiece}
        />
      ) : null}
      {selected && !reading ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-500">
            {sheetRows.length === 0
              ? rows.length > 0
                ? "Older pieces are still on the quote. Reset removes them."
                : "Read the drawing, or type a size on it."
              : "Pins sit beside the written size. The quote is under the sheet."}
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

function PinLayer({
  rows,
  page,
  activeId,
  onChoose,
}: {
  rows: PricedLine[];
  page: number;
  activeId: string | null;
  onChoose: (id: string) => void;
}) {
  const marked = rows.flatMap((row, index) => {
    const mark = row.line.reading;
    if (!placed(mark) || mark.page !== page) return [];
    return [{ id: row.line.id, x: mark.markX, y: mark.markY, n: index + 1, row }];
  });
  const spots = spreadPins(marked);
  const byId = new Map(marked.map((item) => [item.id, item]));

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full text-stone-800/70" aria-hidden="true">
        {spots.map((spot) => {
          const moved = Math.hypot(spot.x - spot.anchorX, spot.y - spot.anchorY) > 1.5;
          if (!moved) return null;
          return (
            <line
              key={spot.id}
              x1={`${spot.anchorX}%`}
              y1={`${spot.anchorY}%`}
              x2={`${spot.x}%`}
              y2={`${spot.y}%`}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
      {spots.map((spot) => {
        const moved = Math.hypot(spot.x - spot.anchorX, spot.y - spot.anchorY) > 1.5;
        if (!moved) return null;
        return (
          <span
            key={`${spot.id}-anchor`}
            className="absolute z-20 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-800 ring-2 ring-white"
            style={{ left: `${spot.anchorX}%`, top: `${spot.anchorY}%` }}
          />
        );
      })}
      {spots.map((spot) => {
        const item = byId.get(spot.id);
        if (!item) return null;
        const on = spot.id === activeId;
        const others = spots.filter((other) => other.id !== spot.id);
        const side = openSide(spot.x, spot.y, others);
        const label = `${formatInches(item.row.line.widthIn)} × ${formatInches(item.row.line.heightIn)}`;
        return (
          <button
            key={spot.id}
            type="button"
            aria-pressed={on}
            aria-label={`${pieceName(item.row)} on the page`}
            onClick={() => onChoose(spot.id)}
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            className={`absolute z-30 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white ${
              on ? "bg-teal-800 text-white" : "bg-stone-800 text-white"
            }`}
          >
            {item.n}
            {on ? (
              <span className={`${chipClass[side]} whitespace-nowrap rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-stone-900 shadow ring-1 ring-stone-300`}>
                {label}
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );
}

function SizeEditor({
  active,
  activeIndex,
  note,
  tiedToFile,
  onUpdate,
  onRemove,
}: {
  active: PricedLine;
  activeIndex: number;
  note: string;
  tiedToFile: boolean;
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
  onRemove: (id: string) => void;
}) {
  const mark = active.line.reading;
  const work = sizeWork(active.line.widthIn, active.line.heightIn, active.line.quantity);

  return (
    <div className="mt-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
      <p className="text-xs font-semibold text-stone-500">
        {confidenceLabel(active.line.confidence) || "On the quote"}
        {placed(mark) ? "" : " · not marked on the page yet"}
      </p>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-stone-900">
          {activeIndex + 1}. {pieceName(active)}
        </p>
        <button type="button" className="shrink-0 text-xs font-semibold text-stone-500 underline" onClick={() => onRemove(active.line.id)}>
          Remove
        </button>
      </div>
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
