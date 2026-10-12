import { DEFAULT_FINISH_ID } from "@/lib/slab/catalog";
import type { LineItem } from "@/lib/slab/types";

/** Sizes printed on the Hale Residence sample schedule. */
export function haleSampleLines(finishId: string = DEFAULT_FINISH_ID): LineItem[] {
  return [
    line("sample-u1", "U1 upper door", "door", 14.5, 30, 2, 2, finishId),
    line("sample-u2", "U2 upper door", "door", 17.75, 30, 1, 2, finishId),
    line("sample-df1", "DF1 drawer front", "drawer", 23.5, 6.5, 4, 0, finishId),
    line("sample-df2", "DF2 drawer front", "drawer", 23.5, 8, 2, 0, finishId),
    line("sample-b1", "B1 base door", "door", 23.875, 42, 1, 3, finishId),
  ];
}

function line(
  id: string,
  label: string,
  kind: LineItem["kind"],
  widthIn: number,
  heightIn: number,
  quantity: number,
  hingeHolesEach: number,
  finishId: string,
): LineItem {
  return {
    id,
    label,
    kind,
    widthIn,
    heightIn,
    quantity,
    hingeHolesEach,
    finishId,
    notes: "",
    confidence: null,
    sourceFile: null,
    reading: null,
  };
}

export function blankLine(id: string, finishId: string): LineItem {
  return {
    id,
    label: "",
    kind: "door",
    widthIn: 0,
    heightIn: 0,
    quantity: 1,
    hingeHolesEach: 0,
    finishId,
    notes: "",
    confidence: null,
    sourceFile: null,
    reading: null,
  };
}
