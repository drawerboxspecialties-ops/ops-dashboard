import { getFinish } from "@/lib/slab/catalog";
import type { Confidence, LineItem, PieceKind, PriceBasis, SizeReading } from "@/lib/slab/types";

export type StoredJob = {
  customer: string;
  jobName: string;
  jobNote: string;
  basis: PriceBasis;
  finishId: string;
  lines: LineItem[];
};

export function parseStoredJob(raw: string): StoredJob | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const finishId = typeof record.finishId === "string" ? record.finishId : "";
    if (!getFinish(finishId)) return null;
    const basis = record.basis === "minimum" ? "minimum" : record.basis === "list" ? "list" : null;
    if (!basis) return null;
    if (!Array.isArray(record.lines)) return null;
    const lines = record.lines.flatMap((item) => {
      const line = parseLine(item);
      return line ? [line] : [];
    });
    return {
      customer: asText(record.customer),
      jobName: asText(record.jobName),
      jobNote: asText(record.jobNote),
      basis,
      finishId,
      lines,
    };
  } catch {
    return null;
  }
}

function parseLine(value: unknown): LineItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id) return null;
  const finishId = typeof record.finishId === "string" ? record.finishId : "";
  if (!getFinish(finishId)) return null;
  const kind: PieceKind = record.kind === "drawer" ? "drawer" : record.kind === "door" ? "door" : "door";
  if (record.kind !== "door" && record.kind !== "drawer") return null;
  return {
    id: record.id,
    label: asText(record.label).slice(0, 80),
    kind,
    widthIn: asNumber(record.widthIn),
    heightIn: asNumber(record.heightIn),
    quantity: asNumber(record.quantity),
    hingeHolesEach: asNumber(record.hingeHolesEach),
    finishId,
    notes: asText(record.notes).slice(0, 240),
    confidence: asConfidence(record.confidence),
    sourceFile: typeof record.sourceFile === "string" ? record.sourceFile.slice(0, 180) : null,
    reading: parseReading(record.reading),
  };
}

function parseReading(value: unknown): SizeReading | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const seenAs = asText(record.seenAs).slice(0, 80);
  const explanation = asText(record.explanation).slice(0, 240);
  const markX = asPercent(record.markX);
  const markY = asPercent(record.markY);
  if (!seenAs && !explanation && markX === null && markY === null) return null;
  const page = typeof record.page === "number" && Number.isFinite(record.page) ? Math.min(30, Math.max(1, Math.round(record.page))) : 1;
  return { seenAs, explanation, markX, markY, page };
}

function asPercent(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value * 10) / 10;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asConfidence(value: unknown): Confidence | null {
  if (value === "high" || value === "medium" || value === "low") return value;
  return null;
}
