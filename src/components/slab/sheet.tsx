"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { CONSTRUCTIONS, FINISHES, HINGE_HOLE_CENTS, PRICE_LIST, SMALL_JOB_SURCHARGE_CENTS, finishesFor, getFinish } from "@/lib/slab/catalog";
import { formatInches, formatMoney, formatSquareFeet, parseInches, priceQuote, type PricedLine } from "@/lib/slab/pricing";
import type { Confidence, LineItem, PieceKind } from "@/lib/slab/types";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif";

type StagedFile = { id: string; file: File; preview: string | null };

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
}: {
  files: StagedFile[];
  reading: boolean;
  configured: boolean | null;
  hasLines: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRead: (mode: "append" | "replace") => void;
  onLoadSampleSizes: () => void;
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
            <li key={item.id} className="flex items-center gap-3 rounded-lg bg-stone-50 px-2 py-2">
              {item.preview ? (
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

export function LineSheet({
  rows,
  onAdd,
  onUpdate,
  onRemove,
}: {
  rows: PricedLine[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-stone-900">Pieces</h2>
          <p className="mt-1 text-sm text-stone-500">
            Sizes are finished inches. 14 1/2 and 14.5 are the same. Square feet is width × height × quantity ÷ 144.
          </p>
        </div>
        <button type="button" className={outlineButton} onClick={onAdd}>
          Add a piece
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-sm text-stone-500">Nothing to price yet. Read a drawing, or add a door and type the opening size.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.line.id}
              className={`rounded-xl bg-stone-50/80 p-3 ring-1 ${
                row.line.confidence === "low" || !row.fitsSheet ? "ring-amber-700/30" : "ring-stone-200"
              }`}
            >
              <div className="flex flex-wrap items-start gap-2">
                <input
                  aria-label={`Label for ${row.line.label || "piece"}`}
                  value={row.line.label}
                  placeholder="Label, such as U1"
                  onChange={(event) => onUpdate(row.line.id, { label: event.target.value })}
                  className={`${fieldClass} min-w-40 flex-1`}
                />
                <select
                  aria-label="Piece type"
                  value={row.line.kind}
                  onChange={(event) => onUpdate(row.line.id, { kind: event.target.value as PieceKind })}
                  className={`${fieldClass} w-auto`}
                >
                  <option value="door">Door</option>
                  <option value="drawer">Drawer front</option>
                </select>
                <button type="button" className={ghostButton} aria-label={`Remove ${row.line.label || "piece"}`} onClick={() => onRemove(row.line.id)}>
                  Remove
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <InchField label="Width" value={row.line.widthIn} onCommit={(widthIn) => onUpdate(row.line.id, { widthIn })} />
                <InchField label="Height" value={row.line.heightIn} onCommit={(heightIn) => onUpdate(row.line.id, { heightIn })} />
                <CountField label="Quantity" value={row.line.quantity} fallback={1} onCommit={(quantity) => onUpdate(row.line.id, { quantity })} />
                <CountField
                  label="Hinge holes each"
                  value={row.line.hingeHolesEach}
                  fallback={0}
                  onCommit={(hingeHolesEach) => onUpdate(row.line.id, { hingeHolesEach })}
                />
              </div>

              <div className="mt-2">
                <FinishSelect
                  label={`Finish for ${row.line.label || "piece"}`}
                  value={row.line.finishId}
                  onChange={(next) => onUpdate(row.line.id, { finishId: next })}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium tabular-nums">{formatSquareFeet(row.squareFeet)} sq ft</span>
                <span className="tabular-nums">{formatMoney(row.materialCents)}</span>
                <span className="text-stone-500">{row.finish.name}</span>
                {row.hingeHoles > 0 ? (
                  <span className="text-stone-500 tabular-nums">
                    {row.hingeHoles} hinge {row.hingeHoles === 1 ? "hole" : "holes"}
                  </span>
                ) : null}
                {row.line.confidence ? (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                      row.line.confidence === "low" ? "bg-rose-50 text-rose-800" : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {row.line.confidence} read
                  </span>
                ) : null}
              </div>

              {!row.fitsSheet ? (
                <p className="mt-2 text-sm text-amber-800">
                  This piece may not fit a {row.panelLabel} ft {row.constructionName} sheet, even if the grain is turned.
                </p>
              ) : null}
              {row.line.sourceFile ? <p className="mt-1 text-xs text-stone-500">From {row.line.sourceFile}</p> : null}
              <input
                aria-label={`Note for ${row.line.label || "piece"}`}
                value={row.line.notes}
                placeholder="Note, optional"
                onChange={(event) => onUpdate(row.line.id, { notes: event.target.value })}
                className={`${fieldClass} mt-2`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PriceBook() {
  return (
    <details className={cardClass}>
      <summary className="cursor-pointer">
        <span className="font-display text-xl font-bold text-stone-900">Price book</span>
        <span className="mt-1 block text-sm text-stone-500">
          {PRICE_LIST.title}, effective {PRICE_LIST.effective}. Hinge boring is {formatMoney(HINGE_HOLE_CENTS)} a hole. Jobs under 10 sq ft add{" "}
          {formatMoney(SMALL_JOB_SURCHARGE_CENTS)}.
        </span>
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs tracking-wide text-stone-500 uppercase">
              <th className="py-2 pr-3 font-semibold">Finish</th>
              <th className="py-2 pr-3 font-semibold">Construction</th>
              <th className="py-2 pr-3 font-semibold">Sheet</th>
              <th className="py-2 pr-3 text-right font-semibold">List</th>
              <th className="py-2 text-right font-semibold">Minimum</th>
            </tr>
          </thead>
          <tbody>
            {CONSTRUCTIONS.flatMap((item) =>
              finishesFor(item.id).map((finish) => (
                <tr key={finish.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3 font-medium">{finish.name}</td>
                  <td className="py-2 pr-3">
                    <span className="block">{item.name}</span>
                    <span className="text-xs text-stone-500">{item.detail}</span>
                  </td>
                  <td className="py-2 pr-3">{item.panelLabel} ft</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(finish.listCents)}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(finish.minimumCents)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
        <p className="pt-2 text-xs text-stone-500">{FINISHES.length} finishes. Alder is listed as “Plan Sliced” on the October sheet.</p>
      </div>
    </details>
  );
}

export function PrintQuote({
  customer,
  jobName,
  jobNote,
  quote,
}: {
  customer: string;
  jobName: string;
  jobNote: string;
  quote: ReturnType<typeof priceQuote>;
}) {
  const heading = [customer.trim(), jobName.trim()].filter(Boolean).join(" — ");
  return (
    <section className="hidden print:block">
      <header className="border-b border-black pb-3">
        <p className="text-xs tracking-widest uppercase">Slab Measure</p>
        <h1 className="font-display text-3xl font-bold">{heading || "Door and drawer quote"}</h1>
        <p className="text-sm">
          {PRICE_LIST.title}, effective {PRICE_LIST.effective}. {quote.basis === "list" ? "List" : "Minimum sale"} prices.
        </p>
      </header>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1 pr-2 font-medium">Piece</th>
            <th className="py-1 pr-2 font-medium">Size</th>
            <th className="py-1 pr-2 font-medium">Qty</th>
            <th className="py-1 pr-2 font-medium">Sq ft</th>
            <th className="py-1 pr-2 font-medium">Finish</th>
            <th className="py-1 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((row) => (
            <tr key={row.line.id} className="border-b border-neutral-200 align-top">
              <td className="py-1 pr-2">
                {row.line.label || "Untitled"}
                <span className="block text-xs text-neutral-600">
                  {row.line.kind === "door" ? "Door" : "Drawer front"}
                  {row.line.notes ? ` · ${row.line.notes}` : ""}
                </span>
              </td>
              <td className="py-1 pr-2 tabular-nums">
                {row.line.widthIn} × {row.line.heightIn}
              </td>
              <td className="py-1 pr-2 tabular-nums">{row.line.quantity}</td>
              <td className="py-1 pr-2 tabular-nums">{formatSquareFeet(row.squareFeet)}</td>
              <td className="py-1 pr-2">{row.finish.name}</td>
              <td className="py-1 text-right tabular-nums">{formatMoney(row.materialCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-4 ml-auto w-72 text-sm">
        <SummaryRow label="Square feet" value={formatSquareFeet(quote.squareFeet)} />
        <SummaryRow label="Material" value={formatMoney(quote.materialCents)} />
        <SummaryRow label={`Hinge boring (${quote.hingeHoles} × ${formatMoney(HINGE_HOLE_CENTS)})`} value={formatMoney(quote.hingeCents)} />
        <SummaryRow label="Small-job surcharge" value={formatMoney(quote.surchargeCents)} />
        <SummaryRow label="Total" value={formatMoney(quote.totalCents)} />
      </dl>
      {jobNote.trim() ? <p className="mt-4 text-sm">{jobNote.trim()}</p> : null}
      <p className="mt-6 text-xs">Square feet = width × height × quantity ÷ 144. Confirm finished sizes before ordering.</p>
    </section>
  );
}

export function FinishSelect({
  value,
  onChange,
  label,
  className = "",
}: {
  value: string;
  onChange: (finishId: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} ${className}`}>
      {CONSTRUCTIONS.map((item) => (
        <optgroup key={item.id} label={`${item.name} · ${item.panelLabel} ft`}>
          {finishesFor(item.id).map((finish) => (
            <option key={finish.id} value={finish.id}>
              {finish.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function InchField({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const text = focused || invalid ? draft : value > 0 ? formatInches(value) : "";

  return (
    <label className="block text-xs font-semibold text-stone-600">
      {label}
      <input
        aria-label={label}
        inputMode="decimal"
        value={text}
        aria-invalid={invalid}
        placeholder="0"
        className={`${fieldClass} mt-1 tabular-nums ${invalid ? "border-rose-400" : ""}`}
        onFocus={() => {
          setFocused(true);
          setDraft(value > 0 ? formatInches(value) : "");
        }}
        onChange={(event) => {
          setInvalid(false);
          setDraft(event.target.value);
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

function CountField({
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
    <label className="block text-xs font-semibold text-stone-600">
      {label}
      <input
        aria-label={label}
        inputMode="numeric"
        value={text}
        className={`${fieldClass} mt-1 tabular-nums`}
        onFocus={() => {
          setFocused(true);
          setDraft(String(value));
        }}
        onChange={(event) => setDraft(event.target.value)}
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

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-xs font-semibold text-stone-600">
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} mt-1`} />
    </label>
  );
}

export function BasisButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold ${pressed ? "bg-teal-800 text-white" : "text-stone-600"}`}
    >
      {children}
    </button>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function toLine(piece: ExtractedPiece, fallbackFinish: string): LineItem {
  const note = [piece.notes, piece.materialHint && !piece.finishId ? `Finish on the sheet: ${piece.materialHint}` : ""]
    .filter(Boolean)
    .join(" ");
  return {
    id: crypto.randomUUID(),
    label: piece.label,
    kind: piece.kind,
    widthIn: piece.widthIn,
    heightIn: piece.heightIn,
    quantity: piece.quantity,
    hingeHolesEach: piece.hingeHolesEach,
    finishId: piece.finishId && getFinish(piece.finishId) ? piece.finishId : fallbackFinish,
    notes: note,
    confidence: piece.confidence,
    sourceFile: piece.sourceFile || null,
  };
}

export function isAccepted(file: File): boolean {
  const type = file.type.toLowerCase();
  if (
    type === "image/jpeg" ||
    type === "image/png" ||
    type === "image/webp" ||
    type === "image/gif" ||
    type === "application/pdf"
  ) {
    return true;
  }
  const name = file.name.toLowerCase();
  return [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"].some((suffix) => name.endsWith(suffix));
}

function hasFiles(event: DragEvent) {
  return [...event.dataTransfer.types].includes("Files");
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none ring-teal-600/15 placeholder:text-stone-400 focus:border-teal-700 focus:ring-4";
const primaryButton =
  "rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-50";
export const outlineButton =
  "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:border-teal-700 hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-50";
export const ghostButton = "rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:bg-stone-100";
const cardClass = "rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-[0_10px_28px_-22px_rgba(19,32,28,0.45)] sm:p-5";
