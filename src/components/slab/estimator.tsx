"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DEFAULT_FINISH_ID, HINGE_HOLE_CENTS, PRICE_LIST, getConstruction, requireFinish } from "@/lib/slab/catalog";
import { getJobSnapshot, getServerJob, subscribeJob, updateJob } from "@/lib/slab/job-store";
import { formatMoney, formatRate, formatSquareFeet, priceQuote } from "@/lib/slab/pricing";
import { quotePlainText } from "@/lib/slab/quote-text";
import { blankLine, haleSampleLines } from "@/lib/slab/sample";
import type { Confidence, PieceKind } from "@/lib/slab/types";
import {
  BasisButton,
  FinishSelect,
  LineSheet,
  PriceBook,
  PrintQuote,
  SummaryRow,
  TextField,
  UploadPreview,
  UploadTray,
  fieldClass,
  ghostButton,
  isAccepted,
  outlineButton,
  previewable,
  toLine,
} from "@/components/slab/sheet";

const MAX_FILES = 6;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

type ReaderStatus = { configured: boolean; model: string };

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

type StagedFile = { id: string; file: File; preview: string | null };
type Notice = { tone: "ok" | "err"; text: string };

export function SlabEstimator() {
  const job = useSyncExternalStore(subscribeJob, getJobSnapshot, getServerJob);
  const { customer, jobName, jobNote, basis, finishId, lines } = job;
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [reading, setReading] = useState(false);
  const [reader, setReader] = useState<ReaderStatus | null>(null);
  const [readNote, setReadNote] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const shownPreviewId = files.some((item) => item.id === previewId) ? previewId : (files.at(-1)?.id ?? null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/read", { signal: controller.signal, credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as ReaderStatus;
        if (typeof body.configured === "boolean") setReader(body);
      })
      .catch(() => {
        if (!controller.signal.aborted) setReader(null);
      });
    return () => controller.abort();
  }, []);

  const quote = useMemo(() => priceQuote(lines, basis), [lines, basis]);
  const mixedFinishes = lines.some((line) => line.finishId !== finishId);
  const finish = requireFinish(finishId);
  const construction = getConstruction(finish.constructionId);

  const addFiles = useCallback((incoming: File[]) => {
    const accepted: File[] = [];
    for (const file of incoming) {
      if (!isAccepted(file)) {
        setNotice({ tone: "err", text: `${file.name || "That file"} needs to be a JPEG, PNG, WebP, GIF, or PDF.` });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setNotice({ tone: "err", text: `${file.name} is over 15 MB.` });
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;
    setFiles((current) => {
      const room = MAX_FILES - current.length;
      if (room <= 0) {
        setNotice({ tone: "err", text: `Read up to ${MAX_FILES} files at a time.` });
        return current;
      }
      const next = accepted.slice(0, room);
      if (next.length < accepted.length) {
        setNotice({ tone: "err", text: `Only ${MAX_FILES} files can sit in the tray.` });
      }
      const staged = next.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: previewable(file) ? URL.createObjectURL(file) : null,
      }));
      const newest = staged.at(-1);
      if (newest) setPreviewId(newest.id);
      return [...current, ...staged];
    });
  }, []);

  function removeFile(id: string) {
    setFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.id !== id);
    });
  }

  function loadSampleSizes() {
    updateJob((current) => ({
      ...current,
      customer: "Hale Residence",
      jobName: "Kitchen",
      finishId: DEFAULT_FINISH_ID,
      lines: haleSampleLines(),
    }));
    setReadNote("These sizes were typed from the Hale Residence sample schedule.");
    setNotice({ tone: "ok", text: "Sample sizes entered." });
  }

  async function readFiles(mode: "append" | "replace") {
    if (files.length === 0 || reading) return;
    setReading(true);
    setNotice(null);
    try {
      const body = new FormData();
      body.set("defaultFinishId", finishId);
      for (const item of files) body.append("files", item.file);
      const response = await fetch("/api/read", { method: "POST", body, credentials: "same-origin" });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        documentNotes?: string;
        pieces?: ExtractedPiece[];
      };
      if (!response.ok) {
        setNotice({ tone: "err", text: payload.message || "The drawing could not be read." });
        return;
      }
      const pieces = payload.pieces ?? [];
      if (pieces.length === 0) {
        setReadNote(payload.documentNotes || "No doors or drawer fronts were found on that file.");
        setNotice({ tone: "err", text: "No doors or drawer fronts were found." });
        return;
      }
      const created = pieces.map((piece) => toLine(piece, finishId));
      const matched = new Set(created.map((line) => line.finishId));
      updateJob((current) => ({
        ...current,
        lines: mode === "replace" ? created : [...current.lines, ...created],
        finishId:
          (mode === "replace" || current.lines.length === 0) && matched.size === 1
            ? created[0].finishId
            : current.finishId,
      }));
      const note = payload.documentNotes?.trim();
      setReadNote(
        note
          ? note
          : `Read ${created.length} ${created.length === 1 ? "piece" : "pieces"}. Check anything marked low before you send the quote.`,
      );
      setNotice({ tone: "ok", text: `Added ${created.length} ${created.length === 1 ? "piece" : "pieces"}.` });
    } catch {
      setNotice({ tone: "err", text: "The reader did not respond. Check the connection and try again." });
    } finally {
      setReading(false);
    }
  }

  function clearQuote() {
    updateJob(() => ({
      customer: "",
      jobName: "",
      jobNote: "",
      basis: "list",
      finishId: DEFAULT_FINISH_ID,
      lines: [],
    }));
    setReadNote("");
    setConfirmClear(false);
  }

  async function copyQuote() {
    const text = quotePlainText({ customer, jobName, jobNote, quote });
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: "ok", text: "Quote copied." });
    } catch {
      setNotice({ tone: "err", text: "Could not copy from this browser." });
    }
  }

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-6 pb-28 sm:px-6 lg:pb-10">
      <header className="border-b border-stone-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="text-[11px] font-semibold tracking-[0.18em] text-teal-800 uppercase">
            Operations Hub
          </a>
          <p className="text-sm text-stone-500">Effective {PRICE_LIST.effective}</p>
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Slab Measure</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600 sm:text-base">
          Turn a door schedule into square footage and a price. The October 2026 slab list covers doors and drawer fronts.
        </p>
      </header>

      {notice ? (
        <p
          className={`print:hidden mt-4 rounded-xl px-4 py-3 text-sm ${
            notice.tone === "err" ? "bg-rose-50 text-rose-800" : "bg-teal-50 text-teal-900"
          }`}
          role="status"
        >
          {notice.text}
          <button type="button" className="ml-3 underline" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,32rem)_22rem]">
        <div className="order-1 flex flex-col gap-6 xl:col-start-1">
          <div className="print:hidden">
            <UploadTray
              files={files}
              reading={reading}
              configured={reader ? reader.configured : null}
              hasLines={lines.length > 0}
              onAdd={addFiles}
              onRemove={removeFile}
              onRead={readFiles}
              onLoadSampleSizes={loadSampleSizes}
              selectedId={shownPreviewId}
              onSelect={setPreviewId}
            />
          </div>
          {readNote ? (
            <p className="print:hidden rounded-xl bg-white/80 px-4 py-3 text-sm text-stone-800 ring-1 ring-stone-200">
              {readNote}
              <button type="button" className="ml-3 underline" onClick={() => setReadNote("")}>
                Dismiss
              </button>
            </p>
          ) : null}
        </div>
        <div className="print:hidden order-4 flex flex-col gap-6 xl:col-start-1">
          <div>
            <LineSheet
              rows={quote.lines}
              onAdd={() =>
                updateJob((current) => ({
                  ...current,
                  lines: [...current.lines, blankLine(crypto.randomUUID(), current.finishId)],
                }))
              }
              onUpdate={(id, patch) =>
                updateJob((current) => ({
                  ...current,
                  lines: current.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
                }))
              }
              onRemove={(id) =>
                updateJob((current) => ({
                  ...current,
                  lines: current.lines.filter((line) => line.id !== id),
                }))
              }
            />
          </div>
          <div>
            <PriceBook />
          </div>
        </div>

        <div className="print:hidden order-2 xl:sticky xl:top-4 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <UploadPreview files={files} selectedId={shownPreviewId} onSelect={setPreviewId} />
        </div>

        <aside className="print:hidden order-3 rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-[0_10px_28px_-22px_rgba(19,32,28,0.45)] sm:p-5 xl:sticky xl:top-4 xl:col-start-3 xl:row-span-2 xl:row-start-1">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-stone-500 uppercase">Quote</p>
          <p className="mt-1 font-display text-4xl font-bold tabular-nums text-stone-900">{formatSquareFeet(quote.squareFeet)}</p>
          <p className="text-sm text-stone-500">square feet · {quote.pieceCount} pieces</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-stone-900">{formatMoney(quote.totalCents)}</p>
          <p className="text-sm text-stone-500">{basis === "list" ? "List" : "Minimum sale"} total</p>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1">
            <BasisButton pressed={basis === "list"} onClick={() => updateJob((current) => ({ ...current, basis: "list" }))}>
              List
            </BasisButton>
            <BasisButton pressed={basis === "minimum"} onClick={() => updateJob((current) => ({ ...current, basis: "minimum" }))}>
              Minimum
            </BasisButton>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <SummaryRow label="Material" value={formatMoney(quote.materialCents)} />
            <SummaryRow
              label={quote.hingeHoles > 0 ? `Hinge boring · ${quote.hingeHoles} × ${formatMoney(HINGE_HOLE_CENTS)}` : "Hinge boring"}
              value={formatMoney(quote.hingeCents)}
            />
            <SummaryRow label="Under 10 sq ft" value={quote.surchargeApplies ? formatMoney(quote.surchargeCents) : "—"} />
          </dl>

          {quote.surchargeApplies ? (
            <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-950">
              This job is under 10 square feet, so the October list adds a $100 surcharge.
            </p>
          ) : quote.squareFeet >= 10 ? (
            <p className="mt-3 text-sm text-stone-500">At 10 square feet or more, the small-job surcharge stays off.</p>
          ) : null}

          <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <TextField
                label="Customer"
                value={customer}
                placeholder="Hale Residence"
                onChange={(value) => updateJob((current) => ({ ...current, customer: value }))}
              />
              <TextField
                label="Job"
                value={jobName}
                placeholder="Kitchen"
                onChange={(value) => updateJob((current) => ({ ...current, jobName: value }))}
              />
            </div>
            <label className="block text-xs font-semibold text-stone-600">
              Finish for new pieces
              <FinishSelect
                label="Finish for new pieces"
                value={finishId}
                onChange={(value) => updateJob((current) => ({ ...current, finishId: value }))}
                className="mt-1"
              />
            </label>
            <p className="text-xs text-stone-500">
              {finish.name}
              {construction ? ` · ${construction.name}` : ""} · {formatRate(basis === "list" ? finish.listCents : finish.minimumCents)}
              {basis === "list" ? ` list, ${formatRate(finish.minimumCents)} minimum` : ` minimum, ${formatRate(finish.listCents)} list`}
            </p>
            {mixedFinishes ? (
              <button
                type="button"
                className={outlineButton}
                onClick={() =>
                  updateJob((current) => ({
                    ...current,
                    lines: current.lines.map((line) => ({ ...line, finishId: current.finishId })),
                  }))
                }
              >
                Use this finish on every line
              </button>
            ) : null}
            {quote.groups.length > 1 ? (
              <ul className="space-y-1 text-sm">
                {quote.groups.map((group) => (
                  <li key={group.finishId} className="flex justify-between gap-3 tabular-nums">
                    <span className="truncate">
                      {group.finishName}
                      <span className="text-stone-500"> · {formatSquareFeet(group.squareFeet)} sf</span>
                    </span>
                    <span>{formatMoney(group.materialCents)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="block text-xs font-semibold text-stone-600">
              Note on the quote
              <textarea
                value={jobNote}
                rows={3}
                placeholder="Delivery, grain direction, or a room name"
                onChange={(event) => updateJob((current) => ({ ...current, jobNote: event.target.value }))}
                className={`${fieldClass} mt-1`}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={outlineButton} onClick={() => void copyQuote()}>
              Copy
            </button>
            <button type="button" className={outlineButton} onClick={() => window.print()}>
              Print
            </button>
            <button
              type="button"
              className={ghostButton}
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  return;
                }
                clearQuote();
              }}
              onBlur={() => setConfirmClear(false)}
            >
              {confirmClear ? "Clear quote?" : "Clear"}
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-stone-500">
            {PRICE_LIST.title}, effective {PRICE_LIST.effective}. Unit prices are rounded to the cent. Doors and drawer fronts share the same price per square foot.
          </p>
        </aside>
      </div>

      <div className="print:hidden fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[90rem] items-baseline justify-between">
          <p className="text-sm text-stone-500">
            <span className="font-medium text-stone-900 tabular-nums">{formatSquareFeet(quote.squareFeet)}</span> sq ft
          </p>
          <p className="font-display text-2xl font-bold tabular-nums">{formatMoney(quote.totalCents)}</p>
        </div>
      </div>

      <PrintQuote customer={customer} jobName={jobName} jobNote={jobNote} quote={quote} />
    </div>
  );
}
