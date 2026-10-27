"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import {
  PREVIEW_COLUMNS,
  allmoxyBottomFilename,
  buildCsv,
  detectHeaderCount,
  detectOrderColumn,
  groupOrders,
  isAllmoxyBottoms,
  orderKey,
  parseCsv,
  tallyMaterials,
  type CsvRecord,
  type CsvTable,
  type OrderGroup,
} from "@/lib/bottoms/csv";
import { SAMPLE_BATCH_CSV, SAMPLE_BATCH_NAME } from "@/lib/bottoms/sample-batch";
import { downloadCsv, saveCsvFile } from "@/lib/bottoms/save-file";

type Sheet = {
  name: string;
  table: CsvTable;
  orderColumn: number;
  confident: boolean;
};

const PREVIEW_LIMIT = 200;

function subscribeFilename() {
  return () => {};
}

function serverFilename() {
  return "allmoxy bottom.csv";
}
const primaryButton =
  "inline-flex h-11 items-center justify-center rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-50";
const outlineButton =
  "inline-flex h-11 items-center justify-center rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 transition hover:border-teal-700 hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-50";
const smallButton =
  "rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 transition hover:border-teal-700 disabled:cursor-not-allowed disabled:opacity-50";
const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none ring-teal-600/15 placeholder:text-stone-400 focus:border-teal-700 focus:ring-4";

export function Trimmer() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<"keep" | "remove">("keep");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const filename = useSyncExternalStore(subscribeFilename, allmoxyBottomFilename, serverFilename);

  useEffect(() => {
    function blockNavigation(event: DragEvent) {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
    }
    window.addEventListener("dragover", blockNavigation);
    window.addEventListener("drop", blockNavigation);
    return () => {
      window.removeEventListener("dragover", blockNavigation);
      window.removeEventListener("drop", blockNavigation);
    };
  }, []);

  async function loadFile(file: File) {
    setError(null);
    setStatus(null);
    if (/\.xlsx?$/i.test(file.name)) {
      setError("That looks like an Excel file. Export the bottoms batch from Allmoxy as CSV, then drop that file.");
      return;
    }
    setReading(true);
    try {
      loadText(file.name, await file.text());
    } catch {
      setError("Could not read that file.");
    } finally {
      setReading(false);
    }
  }

  function loadText(name: string, text: string) {
    const table = parseCsv(text);
    if (table.records.length === 0) {
      setError("That file has no rows.");
      return;
    }
    const detected = detectOrderColumn(table.records);
    setSheet({ name, table, orderColumn: detected.column, confident: detected.confident });
    setRemoved(new Set());
    setQuery("");
    setPreview("keep");
    setError(null);
    setStatus(null);
  }

  function onDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  }

  const headerCount = sheet ? detectHeaderCount(sheet.table.records, sheet.orderColumn) : 0;
  const orders = useMemo(
    () => (sheet ? groupOrders(sheet.table.records, sheet.orderColumn, headerCount) : []),
    [sheet, headerCount],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) =>
      `${order.orderNumber} ${order.customer} ${order.job}`.toLowerCase().includes(needle),
    );
  }, [orders, query]);

  const removedParts = orders
    .filter((order) => removed.has(order.orderNumber))
    .reduce((total, order) => total + order.partCount, 0);
  const totalParts = orders.reduce((total, order) => total + order.partCount, 0);
  const keptParts = totalParts - removedParts;
  const removedOrders = orders.filter((order) => removed.has(order.orderNumber)).length;
  const bottoms = sheet ? isAllmoxyBottoms(sheet.table.records, sheet.orderColumn) : false;
  const materials = sheet ? tallyMaterials(sheet.table.records, removed, sheet.orderColumn, headerCount) : [];
  const numericOrders = orders.filter((order) => /^\d{4,10}$/.test(order.orderNumber)).length;
  const output = sheet ? buildCsv(sheet.table, removed, sheet.orderColumn, headerCount) : "";

  const previewRows = useMemo(() => {
    if (!sheet) return [];
    return sheet.table.records.filter((record, index) => {
      if (index < headerCount) return false;
      const marked = removed.has(orderKey(record, sheet.orderColumn));
      return preview === "remove" ? marked : !marked;
    });
  }, [sheet, headerCount, removed, preview]);

  function toggle(orderNumber: string, checked: boolean) {
    setRemoved((current) => {
      const next = new Set(current);
      if (checked) next.add(orderNumber);
      else next.delete(orderNumber);
      return next;
    });
    setStatus(null);
  }

  function markShown() {
    setRemoved((current) => {
      const next = new Set(current);
      for (const order of filtered) next.add(order.orderNumber);
      return next;
    });
    setStatus(null);
  }

  async function saveToDesktop() {
    if (!sheet || keptParts === 0) return;
    const name = allmoxyBottomFilename();
    setSaving(true);
    setStatus(null);
    try {
      const result = await saveCsvFile(output, name);
      if (result === "cancelled") {
        setStatus("Save cancelled.");
        return;
      }
      if (result === "saved") {
        setStatus(`Saved ${name}. If the dialog was open to Desktop, the file is there now.`);
        return;
      }
      setStatus(`Downloaded ${name}. If it landed in Downloads, move it onto your Desktop.`);
    } finally {
      setSaving(false);
    }
  }

  function download() {
    if (!sheet || keptParts === 0) return;
    const name = allmoxyBottomFilename();
    downloadCsv(output, name);
    setStatus(`Downloaded ${name}. If it landed in Downloads, move it onto your Desktop.`);
  }

  return (
    <div
      className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-6"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDragOver(false);
      }}
      onDrop={onDrop}
    >
      <header className="border-b border-stone-200 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/" className="text-[11px] font-semibold tracking-[0.18em] text-teal-800 uppercase">
              Operations Hub
            </Link>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Allmoxy bottoms</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600 sm:text-base">
              Drop a bottoms batch, check the orders to pull out, and save a new CSV named with today&apos;s date.
            </p>
          </div>
          <p className="font-mono text-sm text-stone-800">{filename}</p>
        </div>
      </header>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {error ? (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        {!sheet ? (
          <EmptyDrop reading={reading} onFile={(file) => void loadFile(file)} onSample={() => loadText(SAMPLE_BATCH_NAME, SAMPLE_BATCH_CSV)} />
        ) : (
          <>
            <LoadedBar
              sheet={sheet}
              orders={orders.length}
              parts={totalParts}
              reading={reading}
              onFile={(file) => void loadFile(file)}
              onColumn={(column) => {
                setSheet({ ...sheet, orderColumn: column, confident: true });
                setRemoved(new Set());
                setStatus(null);
              }}
            />

            {!sheet.confident || numericOrders / Math.max(orders.length, 1) < 0.5 ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Pick the column that holds the order numbers, like 606327. Shops and job names are shown beside each one.
              </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/90 shadow-[0_10px_28px_-22px_rgba(19,32,28,0.45)]">
                <div className="flex flex-col gap-3 border-b border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-stone-900">Orders to remove</h2>
                    <span className="text-xs text-stone-500">{filtered.length} shown</span>
                  </div>
                  <input
                    className={fieldClass}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search order, shop, or job"
                    aria-label="Search orders"
                    spellCheck={false}
                  />
                  <div className="flex gap-2">
                    <button type="button" className={smallButton} onClick={markShown} disabled={filtered.length === 0}>
                      Mark shown
                    </button>
                    <button type="button" className={smallButton} onClick={() => setRemoved(new Set())} disabled={removed.size === 0}>
                      Clear
                    </button>
                  </div>
                </div>
                <div className="h-[28rem] overflow-auto lg:h-[calc(100vh-22rem)]">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-stone-500">No orders match that search.</p>
                  ) : (
                    <ul className="flex flex-col p-2">
                      {filtered.map((order) => (
                        <OrderRow key={order.orderNumber} order={order} marked={removed.has(order.orderNumber)} onToggle={toggle} />
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/90 shadow-[0_10px_28px_-22px_rgba(19,32,28,0.45)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 p-3">
                  <h2 className="text-sm font-semibold text-stone-900">
                    {preview === "keep" ? "Parts that stay" : "Parts that will be removed"}
                  </h2>
                  <div className="flex gap-1">
                    <button type="button" className={preview === "keep" ? smallButton : `${smallButton} border-transparent`} onClick={() => setPreview("keep")} aria-pressed={preview === "keep"}>
                      Stay {keptParts}
                    </button>
                    <button type="button" className={preview === "remove" ? smallButton : `${smallButton} border-transparent`} onClick={() => setPreview("remove")} aria-pressed={preview === "remove"}>
                      Remove {removedParts}
                    </button>
                  </div>
                </div>
                {materials.length > 0 ? (
                  <p className="border-b border-stone-200 px-3 py-2 text-xs leading-5 text-stone-500">
                    Staying materials: {materials.slice(0, 4).map((item) => `${item.count} ${item.name}`).join(" · ")}
                    {materials.length > 4 ? ` · +${materials.length - 4} more` : ""}
                  </p>
                ) : null}
                <PreviewTable rows={previewRows} bottoms={bottoms} orderColumn={sheet.orderColumn} />
              </section>
            </div>
          </>
        )}
      </div>

      <footer className="sticky bottom-0 mt-4 border-t border-stone-200 bg-[#f7faf8]/95 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-stone-800">{filename}</p>
            <p className="text-sm text-stone-500" aria-live="polite">
              {!sheet
                ? "The save dialog opens on your Desktop with this name filled in."
                : keptParts === 0
                  ? "Every part is marked for removal. Uncheck an order to keep it in the file."
                  : removedParts === 0
                    ? `${totalParts} parts stay. No orders are marked, so the new file matches this batch.`
                    : `Removing ${removedParts} parts from ${removedOrders} ${removedOrders === 1 ? "order" : "orders"}. ${keptParts} parts stay.`}
            </p>
            {status ? <p className="mt-1 text-sm text-stone-800">{status}</p> : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" className={primaryButton} onClick={() => void saveToDesktop()} disabled={!sheet || keptParts === 0 || saving}>
              {saving ? "Saving…" : "Save to Desktop"}
            </button>
            <button type="button" className={outlineButton} onClick={download} disabled={!sheet || keptParts === 0}>
              Download
            </button>
          </div>
        </div>
      </footer>

      {dragOver ? (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-teal-700 bg-white/80">
          <p className="font-display text-2xl text-stone-900">Drop the bottoms CSV</p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyDrop({
  reading,
  onFile,
  onSample,
}: {
  reading: boolean;
  onFile: (file: File) => void;
  onSample: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/80 px-6 py-16 text-center">
      <h2 className="font-display text-2xl font-bold text-stone-900">Drop the Allmoxy bottoms CSV</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-stone-500">
        Headerless ARDIS bottoms batches work. The file stays in this browser. Nothing is uploaded.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <label className={primaryButton}>
          {reading ? "Reading…" : "Browse for a CSV"}
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }}
          />
        </label>
        <button type="button" className={outlineButton} onClick={onSample}>
          Try a sample batch
        </button>
      </div>
    </section>
  );
}

function LoadedBar({
  sheet,
  orders,
  parts,
  reading,
  onFile,
  onColumn,
}: {
  sheet: Sheet;
  orders: number;
  parts: number;
  reading: boolean;
  onFile: (file: File) => void;
  onColumn: (column: number) => void;
}) {
  const columnCount = Math.max(...sheet.table.records.map((record) => record.fields.length));
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/90 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-stone-900">{sheet.name}</p>
        <p className="text-xs text-stone-500">
          {parts} parts · {orders} orders
          {reading ? " · reading replacement…" : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-stone-500">
          Order column
          <select
            className="h-8 max-w-56 rounded-lg border border-stone-200 bg-white px-2 text-sm text-stone-900"
            value={sheet.orderColumn}
            onChange={(event) => onColumn(Number(event.target.value))}
            aria-label="Order number column"
          >
            {Array.from({ length: columnCount }, (_, index) => {
              const sample = sheet.table.records.find((record) => (record.fields[index] ?? "").trim())?.fields[index].trim() ?? "";
              const short = sample.length > 26 ? `${sample.slice(0, 26)}…` : sample;
              return (
                <option key={index} value={index}>
                  {index + 1}
                  {short ? ` · ${short}` : ""}
                </option>
              );
            })}
          </select>
        </label>
        <label className={smallButton}>
          Replace file
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function OrderRow({
  order,
  marked,
  onToggle,
}: {
  order: OrderGroup;
  marked: boolean;
  onToggle: (orderNumber: string, checked: boolean) => void;
}) {
  const id = useId();
  return (
    <li className={marked ? "rounded-lg bg-rose-50" : "rounded-lg"}>
      <div className="flex items-start gap-3 px-2 py-2">
        <input
          id={id}
          type="checkbox"
          className="mt-1 size-4 accent-teal-800"
          checked={marked}
          onChange={(event) => onToggle(order.orderNumber, event.target.checked)}
          aria-label={`Remove order ${order.orderNumber}`}
        />
        <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer gap-3">
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-mono text-base leading-none text-stone-900">{order.orderNumber}</span>
              {marked ? <span className="text-xs font-semibold text-rose-700">Remove</span> : null}
            </span>
            {order.customer ? <span className="mt-1 block truncate text-sm text-stone-800">{order.customer}</span> : null}
            {order.job || order.due ? (
              <span className="mt-0.5 block truncate text-xs text-stone-500">
                {[order.job, order.due ? `due ${order.due}` : ""].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 pt-0.5 text-xs text-stone-500">
            {order.partCount} {order.partCount === 1 ? "part" : "parts"}
          </span>
        </label>
      </div>
    </li>
  );
}

function PreviewTable({
  rows,
  bottoms,
  orderColumn,
}: {
  rows: CsvRecord[];
  bottoms: boolean;
  orderColumn: number;
}) {
  const columns = bottoms
    ? PREVIEW_COLUMNS
    : Array.from({ length: Math.min(6, Math.max(1, ...rows.map((row) => row.fields.length), orderColumn + 1)) }, (_, index) => ({
        index,
        label: index === orderColumn ? "Order" : `Column ${index + 1}`,
      }));
  const shown = rows.slice(0, PREVIEW_LIMIT);

  if (rows.length === 0) {
    return <p className="px-3 py-10 text-center text-sm text-stone-500">Nothing in this list.</p>;
  }

  return (
    <div className="max-h-[28rem] overflow-auto lg:max-h-[calc(100vh-22rem)]">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-white text-xs text-stone-500">
          <tr>
            {columns.map((column) => (
              <th key={column.label + column.index} className="border-b border-stone-200 px-3 py-2 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, rowIndex) => (
            <tr key={`${row.fields[orderColumn] ?? ""}-${rowIndex}`} className="odd:bg-stone-50">
              {columns.map((column) => (
                <td key={column.index} className="max-w-56 truncate border-b border-stone-200 px-3 py-1.5 font-mono text-xs text-stone-800">
                  {row.fields[column.index] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > shown.length ? (
        <p className="px-3 py-2 text-xs text-stone-500">
          Showing the first {shown.length} of {rows.length} parts. The saved file includes every part that stays.
        </p>
      ) : null}
    </div>
  );
}
