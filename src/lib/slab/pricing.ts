import {
  HINGE_HOLE_CENTS,
  SMALL_JOB_LIMIT_SF,
  SMALL_JOB_SURCHARGE_CENTS,
  getConstruction,
  requireFinish,
} from "@/lib/slab/catalog";
import type { Finish, LineItem, PriceBasis } from "@/lib/slab/types";

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": " 1/2",
  "⅓": " 1/3",
  "⅔": " 2/3",
  "¼": " 1/4",
  "¾": " 3/4",
  "⅛": " 1/8",
  "⅜": " 3/8",
  "⅝": " 5/8",
  "⅞": " 7/8",
};

export function parseInches(raw: string): number | null {
  let text = raw.trim().toLowerCase();
  if (!text) return null;
  for (const [glyph, fraction] of Object.entries(UNICODE_FRACTIONS)) {
    text = text.replaceAll(glyph, fraction);
  }
  text = text
    .replace(/[″”"]/g, "")
    .replace(/\b(inches|inch|in)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  if (/^\d+(\.\d+)?$/.test(text)) {
    return acceptInches(Number(text));
  }

  const mixed = text.match(/^(\d+)(?:\s+|-|\s*-\s*)(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    return acceptInches(Number(mixed[1]) + Number(mixed[2]) / denominator);
  }

  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return acceptInches(Number(fraction[1]) / denominator);
  }

  return null;
}

function acceptInches(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || value > 240) return null;
  return value;
}

export function formatInches(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

export function squareInches(widthIn: number, heightIn: number, quantity: number): number {
  if (![widthIn, heightIn, quantity].every(Number.isFinite)) return 0;
  if (widthIn <= 0 || heightIn <= 0 || quantity <= 0) return 0;
  return widthIn * heightIn * quantity;
}

export function squareFeetFromInches(area: number): number {
  if (!Number.isFinite(area) || area <= 0) return 0;
  return area / 144;
}

/** Line material price in cents, rounded half-up from square inches. */
export function materialCents(
  widthIn: number,
  heightIn: number,
  quantity: number,
  unitCents: number,
): number {
  const area = squareInches(widthIn, heightIn, quantity);
  if (area <= 0 || !Number.isFinite(unitCents)) return 0;
  return Math.round((area * unitCents) / 144);
}

export function pieceFitsSheet(
  widthIn: number,
  heightIn: number,
  panelWidthIn: number,
  panelHeightIn: number,
): boolean {
  if (!(widthIn > 0) || !(heightIn > 0)) return true;
  return (
    (widthIn <= panelWidthIn && heightIn <= panelHeightIn) ||
    (widthIn <= panelHeightIn && heightIn <= panelWidthIn)
  );
}

export type PricedLine = {
  line: LineItem;
  finish: Finish;
  constructionName: string;
  panelLabel: string;
  squareFeet: number;
  hingeHoles: number;
  unitCents: number;
  materialCents: number;
  hingeCents: number;
  fitsSheet: boolean;
};

export type FinishGroup = {
  finishId: string;
  finishName: string;
  constructionName: string;
  squareFeet: number;
  materialCents: number;
};

export type Quote = {
  lines: PricedLine[];
  squareFeet: number;
  materialCents: number;
  hingeHoles: number;
  hingeCents: number;
  surchargeCents: number;
  surchargeApplies: boolean;
  totalCents: number;
  basis: PriceBasis;
  groups: FinishGroup[];
  pieceCount: number;
};

export function unitCentsFor(finish: Finish, basis: PriceBasis): number {
  return basis === "list" ? finish.listCents : finish.minimumCents;
}

export function priceQuote(lines: LineItem[], basis: PriceBasis): Quote {
  const priced: PricedLine[] = lines.map((line) => {
    const finish = requireFinish(line.finishId);
    const construction = getConstruction(finish.constructionId);
    const quantity = sanitizeCount(line.quantity, 999);
    const hingeEach = sanitizeCount(line.hingeHolesEach, 48);
    const area = squareInches(line.widthIn, line.heightIn, quantity);
    const unit = unitCentsFor(finish, basis);
    const holes = quantity > 0 ? quantity * hingeEach : 0;
    return {
      line,
      finish,
      constructionName: construction?.name ?? "",
      panelLabel: construction?.panelLabel ?? "",
      squareFeet: squareFeetFromInches(area),
      hingeHoles: holes,
      unitCents: unit,
      materialCents: materialCents(line.widthIn, line.heightIn, quantity, unit),
      hingeCents: holes * HINGE_HOLE_CENTS,
      fitsSheet: construction
        ? pieceFitsSheet(
            line.widthIn,
            line.heightIn,
            construction.panelWidthIn,
            construction.panelHeightIn,
          )
        : true,
    };
  });

  let squareFeet = 0;
  let material = 0;
  let hingeHoles = 0;
  let hingeCents = 0;
  let pieceCount = 0;
  const groupMap = new Map<string, FinishGroup>();

  for (const row of priced) {
    squareFeet += row.squareFeet;
    material += row.materialCents;
    hingeHoles += row.hingeHoles;
    hingeCents += row.hingeCents;
    const quantity = sanitizeCount(row.line.quantity, 999);
    if (row.squareFeet > 0) pieceCount += quantity;
    const existing = groupMap.get(row.finish.id);
    if (existing) {
      existing.squareFeet += row.squareFeet;
      existing.materialCents += row.materialCents;
    } else {
      groupMap.set(row.finish.id, {
        finishId: row.finish.id,
        finishName: row.finish.name,
        constructionName: row.constructionName,
        squareFeet: row.squareFeet,
        materialCents: row.materialCents,
      });
    }
  }

  const surchargeApplies = squareFeet > 0 && squareFeet < SMALL_JOB_LIMIT_SF;
  const surchargeCents = surchargeApplies ? SMALL_JOB_SURCHARGE_CENTS : 0;

  return {
    lines: priced,
    squareFeet,
    materialCents: material,
    hingeHoles,
    hingeCents,
    surchargeCents,
    surchargeApplies,
    totalCents: material + hingeCents + surchargeCents,
    basis,
    groups: [...groupMap.values()],
    pieceCount,
  };
}

function sanitizeCount(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(max, Math.round(value));
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatSquareFeet(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatRate(cents: number): string {
  return `${formatMoney(cents)} / sq ft`;
}
