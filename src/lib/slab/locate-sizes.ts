import { parseInches } from "@/lib/slab/pricing";

/** A word on the page. x, y, w, h are percentages of the page. */
export type PageWord = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SizeTarget = {
  id: string;
  widthIn: number;
  heightIn: number;
  quantity: number;
};

/** Highlight over the printed width and height, and where the pin should sit. */
export type SizeHit = {
  id: string;
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

type Span = PageWord & { value: number; right: number; bottom: number };

/** True when every guess sits in one clump, so it is not a row-by-row reading. */
export function marksAreBunched(points: { x: number; y: number }[]): boolean {
  if (points.length < 3) return false;
  let max = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      max = Math.max(max, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
    }
  }
  return max < 16;
}

export function boxesToWords(
  items: { text: string; left: number; top: number; width: number; height: number }[],
  pageWidth: number,
  pageHeight: number,
): PageWord[] {
  if (pageWidth <= 0 || pageHeight <= 0) return [];
  return items
    .filter((item) => item.text.trim() && item.width > 0 && item.height > 0)
    .map((item) => ({
      text: item.text,
      x: (item.left / pageWidth) * 100,
      y: (item.top / pageHeight) * 100,
      w: (item.width / pageWidth) * 100,
      h: (item.height / pageHeight) * 100,
    }));
}

/** Turn PDF.js text items into page percentages. `transform` is pdfjs Util.transform. */
export function pdfTextToWords(
  items: readonly unknown[],
  page: { width: number; height: number; transform: number[] },
  transform: (matrix: number[], item: number[]) => number[],
): PageWord[] {
  const boxes: { text: string; left: number; top: number; width: number; height: number }[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as { str?: string; transform?: number[]; width?: number };
    const text = item.str?.trim() ?? "";
    if (!text || !item.transform || item.width === undefined || item.width <= 0) continue;
    const tx = transform(page.transform, item.transform);
    const height = Math.hypot(tx[2], tx[3]);
    if (height <= 0) continue;
    boxes.push({ text, left: tx[4], top: tx[5] - height, width: item.width, height });
  }
  return boxesToWords(boxes, page.width, page.height);
}

/**
 * Find each piece on the printed width and height.
 * A model point in the middle of the page is ignored once the numbers are found.
 */
export function locateSizes(words: PageWord[], targets: SizeTarget[]): SizeHit[] {
  const usable = targets.filter((target) => target.widthIn > 0 && target.heightIn > 0);
  if (usable.length === 0 || words.length === 0) return [];

  const rows = lineGroups(words);
  type Candidate = { targetIndex: number; rowIndex: number; score: number; hit: SizeHit };
  const candidates: Candidate[] = [];

  rows.forEach((row, rowIndex) => {
    const spans = numericSpans(row);
    usable.forEach((target, targetIndex) => {
      const pair = bestPair(spans, target.widthIn, target.heightIn);
      if (!pair) return;
      const qty = quantitySpan(spans, target.quantity, pair.widthSpan);
      const score = 100 - pair.gap * 0.35 + (qty ? 8 : 0);
      candidates.push({
        targetIndex,
        rowIndex,
        score,
        hit: hitFrom(target.id, pair.widthSpan, pair.heightSpan),
      });
    });
  });

  candidates.sort((a, b) => b.score - a.score || a.rowIndex - b.rowIndex || a.targetIndex - b.targetIndex);
  const usedTargets = new Set<number>();
  const usedRows = new Set<number>();
  const hits: SizeHit[] = [];
  for (const candidate of candidates) {
    if (usedTargets.has(candidate.targetIndex) || usedRows.has(candidate.rowIndex)) continue;
    usedTargets.add(candidate.targetIndex);
    usedRows.add(candidate.rowIndex);
    hits.push(candidate.hit);
  }
  return hits;
}

function hitFrom(id: string, widthSpan: Span, heightSpan: Span): SizeHit {
  const pad = 0.35;
  const left = clampBox(Math.min(widthSpan.x, heightSpan.x) - pad);
  const top = clampBox(Math.min(widthSpan.y, heightSpan.y) - pad);
  const right = clampBox(Math.max(widthSpan.right, heightSpan.right) + pad);
  const bottom = clampBox(Math.max(widthSpan.bottom, heightSpan.bottom) + pad);
  const pinX = clampBox(widthSpan.x - 3.2);
  const pinY = widthSpan.y + widthSpan.h / 2;
  return {
    id,
    x: pinX,
    y: clampBox(pinY),
    left,
    top,
    width: Math.max(1.2, right - left),
    height: Math.max(1.6, bottom - top),
  };
}

function bestPair(spans: Span[], width: number, height: number): { widthSpan: Span; heightSpan: Span; gap: number } | null {
  let best: { widthSpan: Span; heightSpan: Span; gap: number } | null = null;
  for (const left of spans) {
    if (!closeSize(left.value, width)) continue;
    for (const right of spans) {
      if (right === left || right.x <= left.x) continue;
      if (!closeSize(right.value, height)) continue;
      const gap = right.x - left.right;
      if (gap > 28) continue;
      if (!best || gap < best.gap) best = { widthSpan: left, heightSpan: right, gap };
    }
  }
  return best;
}

function quantitySpan(spans: Span[], quantity: number, widthSpan: Span): Span | null {
  if (quantity <= 0) return null;
  let best: Span | null = null;
  for (const span of spans) {
    if (Math.abs(span.value - quantity) > 0.01) continue;
    if (span.right > widthSpan.x + 0.2) continue;
    if (!best || span.x > best.x) best = span;
  }
  return best;
}

function numericSpans(words: PageWord[]): Span[] {
  const spans: Span[] = [];
  for (let start = 0; start < words.length; start += 1) {
    let text = "";
    let end = start;
    for (let index = start; index < Math.min(words.length, start + 3); index += 1) {
      if (index > start && !adjacent(words[index - 1], words[index])) break;
      text = text ? `${text} ${words[index].text}` : words[index].text;
      end = index;
      const value = readNumber(text);
      if (value === null || value <= 0) continue;
      const slice = words.slice(start, end + 1);
      spans.push(unionSpan(slice, value));
    }
  }
  return spans;
}

function unionSpan(words: PageWord[], value: number): Span {
  const x = Math.min(...words.map((word) => word.x));
  const y = Math.min(...words.map((word) => word.y));
  const right = Math.max(...words.map((word) => word.x + word.w));
  const bottom = Math.max(...words.map((word) => word.y + word.h));
  return { text: words.map((word) => word.text).join(" "), x, y, w: right - x, h: bottom - y, value, right, bottom };
}

function adjacent(left: PageWord, right: PageWord): boolean {
  const gap = right.x - (left.x + left.w);
  return gap < 2.2 && gap > -0.4;
}

function lineGroups(words: PageWord[]): PageWord[][] {
  const ordered = [...words].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2) || a.x - b.x);
  const groups: PageWord[][] = [];
  for (const word of ordered) {
    const center = word.y + word.h / 2;
    const current = groups.at(-1);
    const previous = current?.at(-1);
    const previousCenter = previous ? previous.y + previous.h / 2 : 0;
    const limit = Math.max(0.8, ((previous?.h ?? word.h) + word.h) * 0.45);
    if (!current || Math.abs(center - previousCenter) > limit) groups.push([word]);
    else current.push(word);
  }
  return groups.map((group) => group.sort((a, b) => a.x - b.x));
}

function readNumber(text: string): number | null {
  const cleaned = text
    .replace(/[|]/g, " ")
    .replace(/,/g, ".")
    .replace(/[^\d./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned.includes(" ") && !cleaned.includes("-")) {
    const glued = readGluedFraction(cleaned);
    if (glued !== null) return glued;
  }
  return parseInches(cleaned);
}

/** OCR often prints 23 1/2 as 231/2, and sometimes inserts a stray digit. */
function readGluedFraction(text: string): number | null {
  const match = text.match(/^(\d+)(\d)\/(\d+)$/);
  if (!match) return null;
  const whole = Number(match[1]);
  const numerator = Number(match[2]);
  const dens = [match[3]];
  if (match[3].length > 1) dens.push(match[3][0], match[3][match[3].length - 1]);
  for (const raw of dens) {
    const denominator = Number(raw);
    if (![2, 4, 8, 16, 32].includes(denominator) || numerator >= denominator) continue;
    return whole + numerator / denominator;
  }
  return null;
}

function closeSize(found: number, wanted: number): boolean {
  const diff = Math.abs(found - wanted);
  return diff <= 0.05 || diff / Math.max(wanted, 1) <= 0.015;
}

function clampBox(value: number): number {
  return Math.min(98, Math.max(0, value));
}
