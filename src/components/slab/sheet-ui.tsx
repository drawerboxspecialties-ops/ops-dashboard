"use client";

import { CONSTRUCTIONS, finishesFor } from "@/lib/slab/catalog";
import { type DragEvent } from "react";

export type StagedFile = { id: string; file: File; preview: string | null };

export function previewable(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none ring-teal-600/15 placeholder:text-stone-400 focus:border-teal-700 focus:ring-4";
export const primaryButton =
  "rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-50";
export const outlineButton =
  "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:border-teal-700 hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-50";
export const ghostButton = "rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:bg-stone-100";
export const cardClass = "rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-[0_10px_28px_-22px_rgba(19,32,28,0.45)] sm:p-5";

export function FinishSelect({
  value,
  onChange,
  label,
  className = "",
}: {
  value: string;
  onChange: (finishId: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} ${className}`}>
      {CONSTRUCTIONS.map((item) => (
        <optgroup key={item.id} label={`${item.name} · ${item.panelLabel} ft`}>
          {finishesFor(item.id).map((finish) => (
            <option key={finish.id} value={finish.id}>
              {finish.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-xs font-semibold text-stone-600">
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} mt-1`} />
    </label>
  );
}

export function BasisButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold ${pressed ? "bg-teal-800 text-white" : "text-stone-600"}`}
    >
      {children}
    </button>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function isAccepted(file: File): boolean {
  const type = file.type.toLowerCase();
  if (
    type === "image/jpeg" ||
    type === "image/png" ||
    type === "image/webp" ||
    type === "image/gif" ||
    type === "application/pdf"
  ) {
    return true;
  }
  const name = file.name.toLowerCase();
  return [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"].some((suffix) => name.endsWith(suffix));
}

export function hasFiles(event: DragEvent) {
  return [...event.dataTransfer.types].includes("Files");
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
