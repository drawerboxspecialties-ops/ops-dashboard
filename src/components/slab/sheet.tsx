"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { CONSTRUCTIONS, FINISHES, HINGE_HOLE_CENTS, PRICE_LIST, SMALL_JOB_SURCHARGE_CENTS, finishesFor, getFinish } from "@/lib/slab/catalog";
import { formatInches, formatMoney, formatSquareFeet, parseInches, priceQuote, sizeWork, type PricedLine } from "@/lib/slab/pricing";
import type { Confidence, LineItem, PieceKind } from "@/lib/slab/types";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif";

export type StagedFile = { id: string; file: File; preview: string | null };

export function previewable(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

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
  seenAs: string;
  explanation: string;
  markX: number | null;
  markY: number | null;
  page: number;
};
