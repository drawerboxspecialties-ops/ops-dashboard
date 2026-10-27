export type CsvRecord = {
  raw: string;
  fields: string[];
};

export type CsvTable = {
  records: CsvRecord[];
  newline: "\r\n" | "\n";
  trailingNewline: boolean;
};

export type OrderGroup = {
  orderNumber: string;
  customer: string;
  job: string;
  due: string;
  partCount: number;
};

const ORDER_NUMBER = /^\d{4,10}$/;
const DUE_DATE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
export const USER_TIME_ZONE = "America/Los_Angeles";

export function parseCsv(input: string): CsvTable {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const newline: "\r\n" | "\n" = text.includes("\r\n") ? "\r\n" : "\n";
  const trailingNewline = text.endsWith("\n") || text.endsWith("\r");
  const records: CsvRecord[] = [];
  const length = text.length;
  let index = 0;

  while (index < length) {
    const start = index;
    const fields: string[] = [];
    let field = "";
    let inQuotes = false;
    let ended = false;

    while (index < length) {
      const char = text[index];

      if (inQuotes) {
        if (char === '"') {
          if (text[index + 1] === '"') {
            field += '"';
            index += 2;
            continue;
          }
          inQuotes = false;
          index += 1;
          continue;
        }
        field += char;
        index += 1;
        continue;
      }

      if (char === '"') {
        if (field.length === 0) {
          inQuotes = true;
          index += 1;
          continue;
        }
        field += char;
        index += 1;
        continue;
      }

      if (char === ",") {
        fields.push(field);
        field = "";
        index += 1;
        continue;
      }

      if (char === "\n" || char === "\r") {
        fields.push(field);
        const raw = text.slice(start, index);
        if (raw.length > 0) records.push({ raw, fields });
        index += char === "\r" && text[index + 1] === "\n" ? 2 : 1;
        ended = true;
        break;
      }

      field += char;
      index += 1;
    }

    if (!ended && start < length) {
      fields.push(field);
      const raw = text.slice(start);
      if (raw.length > 0) records.push({ raw, fields });
    }
  }

  return { records, newline, trailingNewline };
}

export function detectOrderColumn(records: CsvRecord[]): {
  column: number;
  confident: boolean;
} {
  const width = Math.max(1, ...records.map((record) => record.fields.length));
  let bestColumn = Math.min(1, width - 1);
  let bestScore = -1;

  for (let column = 0; column < width; column += 1) {
    const numeric = records.filter((record) =>
      ORDER_NUMBER.test((record.fields[column] ?? "").trim()),
    );
    const coverage = numeric.length / records.length;
    if (coverage < 0.5) continue;

    const unique = new Set(numeric.map((record) => record.fields[column].trim())).size;
    const duplicateBonus = numeric.length > unique ? 2 : 0;
    const score = coverage * 10 + duplicateBonus + partIdScore(records, column);
    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }

  return { column: bestColumn, confident: bestScore >= 8 };
}

function partIdScore(records: CsvRecord[], column: number): number {
  let seen = 0;
  let hits = 0;
  for (const record of records) {
    const order = (record.fields[column] ?? "").trim();
    if (!ORDER_NUMBER.test(order)) continue;
    seen += 1;
    const prefixed = record.fields.some(
      (field, index) => index !== column && field.trim().startsWith(`${order}.`),
    );
    if (prefixed) hits += 1;
  }
  if (seen === 0) return 0;
  return hits / seen > 0.8 ? 4 : 0;
}

export function detectHeaderCount(records: CsvRecord[], orderColumn: number): number {
  if (records.length < 2) return 0;
  const first = (records[0].fields[orderColumn] ?? "").trim();
  if (ORDER_NUMBER.test(first)) return 0;
  const rest = records.slice(1);
  const numeric = rest.filter((record) =>
    ORDER_NUMBER.test((record.fields[orderColumn] ?? "").trim()),
  ).length;
  return numeric / rest.length >= 0.8 ? 1 : 0;
}

export function orderKey(record: CsvRecord, orderColumn: number): string {
  const value = (record.fields[orderColumn] ?? "").trim();
  return value || "(blank)";
}

export function groupOrders(
  records: CsvRecord[],
  orderColumn: number,
  headerCount: number,
): OrderGroup[] {
  const groups = new Map<string, OrderGroup>();

  records.forEach((record, index) => {
    if (index < headerCount) return;
    const key = orderKey(record, orderColumn);
    const existing = groups.get(key);
    if (existing) {
      existing.partCount += 1;
      existing.customer = preferText(existing.customer, customerOf(record, orderColumn));
      existing.job = preferText(existing.job, jobOf(record, orderColumn));
      existing.due = existing.due || dueOf(record, orderColumn);
      return;
    }
    groups.set(key, {
      orderNumber: key,
      customer: customerOf(record, orderColumn),
      job: jobOf(record, orderColumn),
      due: dueOf(record, orderColumn),
      partCount: 1,
    });
  });

  return [...groups.values()];
}

function preferText(current: string, next: string): string {
  if (!current) return next;
  if (!next || current === next) return current;
  return current.includes(next) ? current : `${current} · ${next}`;
}

function customerOf(record: CsvRecord, orderColumn: number): string {
  if (orderColumn === 0) return "";
  return (record.fields[0] ?? "").trim();
}

function jobOf(record: CsvRecord, orderColumn: number): string {
  if (orderColumn === 2) return "";
  return (record.fields[2] ?? "").trim();
}

function dueOf(record: CsvRecord, orderColumn: number): string {
  for (let index = 0; index < record.fields.length; index += 1) {
    if (index === orderColumn) continue;
    const value = record.fields[index].trim();
    if (DUE_DATE.test(value)) return value;
  }
  return "";
}

export function isAllmoxyBottoms(records: CsvRecord[], orderColumn: number): boolean {
  if (orderColumn !== 1) return false;
  const sample = records.find((record) => record.fields.length > 8);
  if (!sample) return false;
  const order = (sample.fields[1] ?? "").trim();
  return ORDER_NUMBER.test(order) && (sample.fields[6] ?? "").trim().startsWith(`${order}.`);
}

export function buildCsv(
  table: CsvTable,
  removed: ReadonlySet<string>,
  orderColumn: number,
  headerCount: number,
): string {
  const kept = table.records.filter((record, index) => {
    if (index < headerCount) return true;
    return !removed.has(orderKey(record, orderColumn));
  });
  if (kept.length === 0) return table.trailingNewline ? table.newline : "";
  const body = kept.map((record) => record.raw).join(table.newline);
  return table.trailingNewline ? body + table.newline : body;
}

export function allmoxyBottomFilename(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: USER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("month")}-${value("day")}-${value("year")} allmoxy bottom.csv`;
}

export function tallyMaterials(records: CsvRecord[], removed: ReadonlySet<string>, orderColumn: number, headerCount: number): { name: string; count: number }[] {
  if (!isAllmoxyBottoms(records, orderColumn)) return [];
  const counts = new Map<string, number>();
  records.forEach((record, index) => {
    if (index < headerCount) return;
    if (removed.has(orderKey(record, orderColumn))) return;
    const material = (record.fields[8] ?? "").trim();
    if (!material) return;
    counts.set(material, (counts.get(material) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const PREVIEW_COLUMNS = [
  { index: 1, label: "Order" },
  { index: 0, label: "Shop" },
  { index: 2, label: "Job" },
  { index: 4, label: "Due" },
  { index: 5, label: "Qty" },
  { index: 6, label: "Part" },
  { index: 7, label: "Label" },
  { index: 8, label: "Material" },
] as const;
