"use client";

import { useState } from "react";
import { CONSTRUCTIONS, FINISHES, HINGE_HOLE_CENTS, PRICE_LIST, SMALL_JOB_SURCHARGE_CENTS, finishesFor, getFinish } from "@/lib/slab/catalog";
import { formatMoney, formatSquareFeet, parseInches, formatInches, priceQuote, type PricedLine } from "@/lib/slab/pricing";
import type { Confidence, LineItem, PieceKind } from "@/lib/slab/types";
import { cardClass, fieldClass, ghostButton, outlineButton, FinishSelect, SummaryRow } from "@/components/slab/sheet-ui";

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
    reading: {
      seenAs: piece.seenAs?.trim() ?? "",
      explanation: piece.explanation?.trim() ?? "",
      markX: piece.markX,
      markY: piece.markY,
      page: piece.page > 0 ? piece.page : 1,
    },
  };
}
