import { HINGE_HOLE_CENTS, PRICE_LIST } from "@/lib/slab/catalog";
import { formatMoney, formatRate, formatSquareFeet, type Quote } from "@/lib/slab/pricing";

export function quotePlainText(input: {
  customer: string;
  jobName: string;
  jobNote: string;
  quote: Quote;
}): string {
  const { quote } = input;
  const heading = [input.customer.trim(), input.jobName.trim()].filter(Boolean).join(" — ");
  const lines = [
    heading || "Door and drawer quote",
    `${PRICE_LIST.title}, effective ${PRICE_LIST.effective}`,
    `Price basis: ${quote.basis === "list" ? "List" : "Minimum sale"}`,
    "",
  ];

  if (quote.lines.length === 0) {
    lines.push("No pieces yet.");
  }

  for (const row of quote.lines) {
    const size =
      row.squareFeet > 0
        ? `${formatInchesLoose(row.line.widthIn)} × ${formatInchesLoose(row.line.heightIn)} in`
        : "size missing";
    lines.push(
      [
        row.line.label || "Untitled",
        row.line.kind === "door" ? "door" : "drawer front",
        size,
        `qty ${row.line.quantity}`,
        `${formatSquareFeet(row.squareFeet)} sq ft`,
        row.finish.name,
        formatMoney(row.materialCents),
      ].join("  ·  "),
    );
    if (row.line.notes.trim()) lines.push(`  ${row.line.notes.trim()}`);
  }

  lines.push(
    "",
    `Pieces: ${quote.pieceCount}`,
    `Square feet: ${formatSquareFeet(quote.squareFeet)}`,
    `Material: ${formatMoney(quote.materialCents)}`,
    quote.hingeHoles > 0
      ? `Hinge boring: ${quote.hingeHoles} × ${formatMoney(HINGE_HOLE_CENTS)} = ${formatMoney(quote.hingeCents)}`
      : "Hinge boring: none",
    quote.surchargeApplies
      ? `Small-job surcharge (under 10 sq ft): ${formatMoney(quote.surchargeCents)}`
      : "Small-job surcharge: none",
    `Total: ${formatMoney(quote.totalCents)}`,
  );

  if (quote.groups.length === 1) {
    const group = quote.groups[0];
    lines.push(`Finish: ${group.finishName} (${group.constructionName}) at ${formatRate(quote.lines[0]?.unitCents ?? 0)}`);
  }

  if (input.jobNote.trim()) {
    lines.push("", input.jobNote.trim());
  }

  lines.push(
    "",
    "Square feet = width × height × quantity ÷ 144. Confirm finished sizes before ordering.",
  );
  return lines.join("\n");
}

function formatInchesLoose(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}
