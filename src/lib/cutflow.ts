import { PDFDocument } from "pdf-lib";
import { extractText, getDocumentProxy } from "unpdf";

export type SheetKind = "top" | "parts" | "bottom";

export type SheetInfo = {
  index: number;
  orderId: string;
  orderName: string;
  customer: string;
  sideMaterial: string;
  shipDate: string;
  weekday: string;
  paperColor: string;
  paperKey: string;
  materialFamily: string;
};

export type ColorBatch = {
  paperKey: string;
  paperColor: string;
  weekday: string;
  colorHex: string;
  shipDates: string[];
  families: { family: string; pages: number; sheets: number; color: string }[];
  stack: StackRow[];
  bottomStack: StackRow[];
  counts: {
    orderPages: number;
    uniqueOrders: number;
    topPartsPages: number;
    bottomPages: number;
  };
  topPartsPdfBase64: string;
  bottomsPdfBase64: string;
};

export type StackRow = {
  pageInJob: number;
  sheet: string;
  orderId: string;
  orderName: string;
  family?: string;
  shipDate: string;
  sideMaterial?: string;
  confidence: number;
};

const FAMILY_ORDER = ["PF/UF Ply", "PF/UF Solid", "MDF / PBC", "FAA", "Other"] as const;
const FAMILY_COLORS: Record<string, string> = {
  "PF/UF Ply": "#1F6F5B",
  "PF/UF Solid": "#C45C26",
  "MDF / PBC": "#3B5B8C",
  FAA: "#7A3E6E",
  Other: "#5C5C5C",
};

const PAPER_BY_WEEKDAY: Record<string, [string, string, string]> = {
  Monday: ["Purple", "monday", "#6B3FA0"],
  Tuesday: ["Green", "tuesday", "#2F8F4E"],
  Wednesday: ["Blue", "wednesday", "#2F6FED"],
  Thursday: ["Yellow", "thursday", "#D4B200"],
  Friday: ["Red", "friday", "#C62828"],
  Saturday: ["Weekend", "weekend", "#6D6D6D"],
  Sunday: ["Weekend", "weekend", "#6D6D6D"],
};

const PAPER_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "weekend", "unknown"];

function clean(s: string, n = 60) {
  return s.replace(/\s+/g, " ").trim().slice(0, n);
}

function classifyName(name: string): SheetKind | null {
  if (/top\s*cut\s*sheet/i.test(name)) return "top";
  if (/parts?\s*cut\s*sheet/i.test(name)) return "parts";
  if (/bottom\s*cut\s*sheet/i.test(name)) return "bottom";
  return null;
}

function classifyFamily(side: string): string {
  const t = side.toUpperCase();
  if (/\bFAA\b/.test(t) || t.startsWith("FAA:")) return "FAA";
  if (/\bMDF\b/.test(t) || /\bPBC\b/.test(t)) return "MDF / PBC";
  const ufpf = /\b(?:UF|PF)\b/.test(t) || t.startsWith("UF:") || t.startsWith("PF:");
  const ply = /\bPLY\b/.test(t) || /PLYWOOD/.test(t) || /BALTIC\s*BIRCH/.test(t);
  if (ufpf && ply) return "PF/UF Ply";
  if (ufpf) return "PF/UF Solid";
  if (ply) return "PF/UF Ply";
  return "Other";
}

function parseShip(text: string) {
  const m = text.match(/Ship\s*Date\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i);
  if (!m) return { shipDate: "", weekday: "", paperColor: "Unknown", paperKey: "unknown", colorHex: "#5C5C5C" };
  const raw = m[1];
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) {
    return { shipDate: raw, weekday: "", paperColor: "Unknown", paperKey: "unknown", colorHex: "#5C5C5C" };
  }
  const weekday = dt.toLocaleDateString("en-US", { weekday: "long" });
  const shipDate = `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
  const [paperColor, paperKey, colorHex] = PAPER_BY_WEEKDAY[weekday] || ["Unknown", "unknown", "#5C5C5C"];
  return { shipDate, weekday, paperColor, paperKey, colorHex };
}

function parseMeta(text: string, kind: SheetKind) {
  let orderId = "?";
  let orderName = "";
  let customer = "";
  if (kind === "top") {
    orderId = text.match(/SALES ORDER\s+(\S+)/i)?.[1] || "?";
    orderName = clean(text.match(/PURCHASE ORDER\s+(.+)/i)?.[1] || "", 40);
    customer = clean(text.match(/Customer:\s*(.+)/i)?.[1] || "", 40);
  } else if (kind === "parts") {
    orderId = text.match(/Order\s*#\s*(\S+)/i)?.[1] || "?";
    orderName = clean(text.match(/Order Name\s*:?\s*(.+)/i)?.[1] || "", 40);
    customer = clean(text.match(/Ordered By:\s*(.+)/i)?.[1] || "", 40);
  } else {
    orderId = text.match(/(?:BOTTOM CUT SHEET|ORDER LAST 4)\s*(\S+)/i)?.[1] || "?";
    orderName = clean(text.match(/ORDER NAME\s*(.+)/i)?.[1] || "", 40);
    customer = clean(text.match(/COMPANY\s*(.+)/i)?.[1] || "", 40);
  }
  const sideMaterial = clean(
    text.match(/Side Material:\s*([\s\S]+?)(?:Top Edge:|Corner|Construction:|Page\s+\d|$)/i)?.[1] || "",
  );
  const ship = parseShip(text);
  return {
    orderId,
    orderName,
    customer,
    sideMaterial,
    materialFamily: classifyFamily(sideMaterial),
    ...ship,
  };
}

async function readInfos(bytes: Uint8Array, kind: SheetKind): Promise<SheetInfo[]> {
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const infos: SheetInfo[] = [];
  for (let i = 0; i < totalPages; i++) {
    const meta = parseMeta(pages[i] || "", kind);
    infos.push({ index: i, ...meta });
  }
  return infos;
}

async function mergePages(
  topBytes: Uint8Array,
  partsBytes: Uint8Array,
  units: { topIndex: number; partsIndex: number; family: string; shipDate: string }[],
) {
  const top = await PDFDocument.load(topBytes);
  const parts = await PDFDocument.load(partsBytes);
  const out = await PDFDocument.create();
  const familyRank = Object.fromEntries(FAMILY_ORDER.map((f, i) => [f, i]));
  const ordered = [...units].sort(
    (a, b) =>
      (a.shipDate || "9999").localeCompare(b.shipDate || "9999") ||
      (familyRank[a.family] ?? 99) - (familyRank[b.family] ?? 99) ||
      a.topIndex - b.topIndex,
  );
  for (const u of ordered) {
    const [tp] = await out.copyPages(top, [u.topIndex]);
    const [pp] = await out.copyPages(parts, [u.partsIndex]);
    out.addPage(tp);
    out.addPage(pp);
  }
  return out.save();
}

async function copyBottomPages(bottomBytes: Uint8Array, indices: number[]) {
  const src = await PDFDocument.load(bottomBytes);
  const out = await PDFDocument.create();
  if (indices.length) {
    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

export function classifyUpload(name: string) {
  return classifyName(name);
}

export async function organizeCutSheets(files: { name: string; bytes: Uint8Array }[]) {
  const byKind: Partial<Record<SheetKind, Uint8Array>> = {};
  for (const f of files) {
    const kind = classifyName(f.name);
    if (kind) byKind[kind] = f.bytes;
  }
  if (!byKind.top || !byKind.parts || !byKind.bottom) {
    throw new Error("Need Top, Parts, and Bottom cut sheet PDFs");
  }

  const topInfos = await readInfos(byKind.top, "top");
  const partsInfos = await readInfos(byKind.parts, "parts");
  const bottomInfos = await readInfos(byKind.bottom, "bottom");

  const partsOcc = new Map<string, number>();
  const partsMap = new Map<string, number>();
  for (const p of partsInfos) {
    const occ = partsOcc.get(p.orderId) || 0;
    partsMap.set(`${p.orderId}#${occ}`, p.index);
    partsOcc.set(p.orderId, occ + 1);
  }

  const seen = new Map<string, number>();
  const units = topInfos.map((top) => {
    const occ = seen.get(top.orderId) || 0;
    seen.set(top.orderId, occ + 1);
    const partsIndex = partsMap.get(`${top.orderId}#${occ}`) ?? top.index;
    const parts = partsInfos[partsIndex];
    let confidence = 1;
    const issues: string[] = [];
    if (!partsMap.has(`${top.orderId}#${occ}`)) {
      confidence = 0.72;
      issues.push("Parts matched by page index fallback");
    }
    if (parts && parts.orderId !== top.orderId && top.orderId !== "?") {
      confidence = Math.min(confidence, 0.55);
      issues.push("Order mismatch");
    }
    if (!top.shipDate) {
      confidence = Math.min(confidence, 0.7);
      issues.push("Missing ship date");
    }
    return {
      ...top,
      partsIndex,
      confidence,
      issues,
      orderName: top.orderName || parts?.orderName || "",
      customer: top.customer || parts?.customer || "",
    };
  });

  const byPaper = new Map<string, typeof units>();
  for (const u of units) {
    const key = u.paperKey || "unknown";
    if (!byPaper.has(key)) byPaper.set(key, []);
    byPaper.get(key)!.push(u);
  }

  const bottomSeen = new Map<string, number>();
  const bottomRows = bottomInfos.map((b) => {
    const occ = bottomSeen.get(b.orderId) || 0;
    bottomSeen.set(b.orderId, occ + 1);
    const unit = units.filter((u) => u.orderId === b.orderId)[occ];
    return {
      bottom: b,
      paperKey: unit?.paperKey || b.paperKey || "unknown",
      paperColor: unit?.paperColor || b.paperColor || "Unknown",
      weekday: unit?.weekday || b.weekday,
      shipDate: unit?.shipDate || b.shipDate,
    };
  });

  const colorBatches: ColorBatch[] = [];
  const keys = PAPER_ORDER.filter((k) => byPaper.has(k) || bottomRows.some((b) => b.paperKey === k));
  for (const key of keys) {
    const paperUnits = byPaper.get(key) || [];
    const paperBottoms = bottomRows.filter((b) => b.paperKey === key);
    if (!paperUnits.length && !paperBottoms.length) continue;

    const sample = paperUnits[0];
    const paperColor = sample?.paperColor || paperBottoms[0]?.paperColor || "Unknown";
    const weekday = sample?.weekday || paperBottoms[0]?.weekday || "Unknown";
    const colorHex = PAPER_BY_WEEKDAY[weekday]?.[2] || "#5C5C5C";
    const shipDates = Array.from(
      new Set([...paperUnits.map((u) => u.shipDate), ...paperBottoms.map((b) => b.shipDate)].filter(Boolean)),
    ).sort();

    const famCount = new Map<string, number>();
    for (const u of paperUnits) famCount.set(u.materialFamily, (famCount.get(u.materialFamily) || 0) + 1);
    const families = FAMILY_ORDER.filter((f) => famCount.get(f)).map((f) => ({
      family: f,
      pages: famCount.get(f)!,
      sheets: famCount.get(f)! * 2,
      color: FAMILY_COLORS[f],
    }));

    const topPartsBytes = await mergePages(
      byKind.top,
      byKind.parts,
      paperUnits.map((u) => ({
        topIndex: u.index,
        partsIndex: u.partsIndex,
        family: u.materialFamily,
        shipDate: u.shipDate,
      })),
    );
    const bottomsBytes = await copyBottomPages(
      byKind.bottom,
      paperBottoms.map((b) => b.bottom.index),
    );

    let page = 1;
    const stack: StackRow[] = [];
    const familyRank = Object.fromEntries(FAMILY_ORDER.map((f, i) => [f, i]));
    const orderedUnits = [...paperUnits].sort(
      (a, b) =>
        (a.shipDate || "").localeCompare(b.shipDate || "") ||
        (familyRank[a.materialFamily] ?? 99) - (familyRank[b.materialFamily] ?? 99) ||
        a.index - b.index,
    );
    for (const u of orderedUnits) {
      for (const sheet of ["TOP", "PARTS"] as const) {
        stack.push({
          pageInJob: page++,
          sheet,
          orderId: u.orderId,
          orderName: u.orderName,
          family: u.materialFamily,
          shipDate: u.shipDate,
          sideMaterial: u.sideMaterial,
          confidence: u.confidence,
        });
      }
    }

    colorBatches.push({
      paperKey: key,
      paperColor,
      weekday,
      colorHex,
      shipDates,
      families,
      stack,
      bottomStack: paperBottoms.map((b, i) => ({
        pageInJob: i + 1,
        sheet: "BOTTOM",
        orderId: b.bottom.orderId,
        orderName: b.bottom.orderName,
        shipDate: b.shipDate,
        confidence: 1,
      })),
      counts: {
        orderPages: paperUnits.length,
        uniqueOrders: new Set(paperUnits.map((u) => u.orderId)).size,
        topPartsPages: orderedUnits.length * 2,
        bottomPages: paperBottoms.length,
      },
      topPartsPdfBase64: Buffer.from(topPartsBytes).toString("base64"),
      bottomsPdfBase64: Buffer.from(bottomsBytes).toString("base64"),
    });
  }

  const issues: { severity: string; code: string; message: string }[] = [];
  if (topInfos.length !== partsInfos.length) {
    issues.push({
      severity: "error",
      code: "COUNT_TOP_PARTS",
      message: `Top pages (${topInfos.length}) != Parts pages (${partsInfos.length})`,
    });
  }
  const low = units.filter((u) => u.confidence < 0.9).length;
  if (low) {
    issues.push({
      severity: "warn",
      code: "LOW_CONFIDENCE",
      message: `${low} pair(s) below 90% confidence`,
    });
  }

  const avg = units.reduce((s, u) => s + u.confidence, 0) / Math.max(units.length, 1);
  let score = 100;
  for (const i of issues) score -= i.severity === "error" ? 18 : 6;
  score = Math.max(0, Math.min(100, score * 0.55 + avg * 100 * 0.45));

  return {
    accuracyScore: Math.round(score * 10) / 10,
    issues,
    colorBatches,
    paperLegend: [
      { weekday: "Monday", paperColor: "Purple", colorHex: "#6B3FA0" },
      { weekday: "Tuesday", paperColor: "Green", colorHex: "#2F8F4E" },
      { weekday: "Wednesday", paperColor: "Blue", colorHex: "#2F6FED" },
      { weekday: "Thursday", paperColor: "Yellow", colorHex: "#D4B200" },
      { weekday: "Friday", paperColor: "Red", colorHex: "#C62828" },
    ],
    counts: {
      topPages: topInfos.length,
      partsPages: partsInfos.length,
      bottomPages: bottomInfos.length,
      colorBatches: colorBatches.length,
      uniqueOrders: new Set(units.map((u) => u.orderId)).size,
    },
  };
}
