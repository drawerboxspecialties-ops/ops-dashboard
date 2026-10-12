export type PieceKind = "door" | "drawer";

export type PriceBasis = "list" | "minimum";

export type Confidence = "high" | "medium" | "low";

export type LineItem = {
  id: string;
  label: string;
  kind: PieceKind;
  widthIn: number;
  heightIn: number;
  quantity: number;
  hingeHolesEach: number;
  finishId: string;
  notes: string;
  confidence: Confidence | null;
  sourceFile: string | null;
};

export type Construction = {
  id: string;
  name: string;
  detail: string;
  panelLabel: string;
  panelWidthIn: number;
  panelHeightIn: number;
};

export type Finish = {
  id: string;
  constructionId: string;
  name: string;
  /** List price in cents per square foot. */
  listCents: number;
  /** Minimum sale price in cents per square foot. */
  minimumCents: number;
};
