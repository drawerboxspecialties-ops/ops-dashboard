import type { Construction, Finish } from "@/lib/slab/types";

/**
 * Standard Slab Door & Drawer Front Price List, effective October 1, 2026.
 * Sheet prices are per square foot. Stored in cents, rounded half-up from
 * the workbook. Ridgemont minimum is $28.975, which rounds to $28.98.
 */
export const PRICE_LIST = {
  title: "Standard Slab Door & Drawer Front",
  effective: "October 1, 2026",
} as const;

export const SMALL_JOB_LIMIT_SF = 10;
export const SMALL_JOB_SURCHARGE_CENTS = 10_000;
export const HINGE_HOLE_CENTS = 300;

export const CONSTRUCTIONS: readonly Construction[] = [
  {
    id: "egger",
    name: "Egger 3/4\"",
    detail: "Particleboard core, .8mm edge band",
    panelLabel: "5 × 9",
    panelWidthIn: 60,
    panelHeightIn: 108,
  },
  {
    id: "melamine",
    name: "3/4\" melamine",
    detail: "Particleboard core, 1mm edge band",
    panelLabel: "4 × 8",
    panelWidthIn: 48,
    panelHeightIn: 96,
  },
  {
    id: "agt",
    name: "18mm AGT polymer",
    detail: "MDF core, 1mm edge band",
    panelLabel: "4 × 9",
    panelWidthIn: 48,
    panelHeightIn: 108,
  },
  {
    id: "paint",
    name: "3/4\" paint grade",
    detail: "MDF core, 1mm paint-grade edge band",
    panelLabel: "4 × 8",
    panelWidthIn: 48,
    panelHeightIn: 96,
  },
  {
    id: "veneer",
    name: "3/4\" hardwood veneer",
    detail: "MDF core, 1mm unfinished wood tape",
    panelLabel: "4 × 8",
    panelWidthIn: 48,
    panelHeightIn: 96,
  },
  {
    id: "ridgemont",
    name: "Ridgemont collection",
    detail: "Hardwood veneer",
    panelLabel: "4 × 8",
    panelWidthIn: 48,
    panelHeightIn: 96,
  },
] as const;

export const FINISHES: readonly Finish[] = [
  { id: "egger-alpine-white", constructionId: "egger", name: "Alpine White", listCents: 2040, minimumCents: 1855 },
  { id: "egger-cashmere-grey", constructionId: "egger", name: "Cashmere Grey", listCents: 1962, minimumCents: 1784 },
  { id: "egger-fog-grey", constructionId: "egger", name: "Fog Grey", listCents: 1910, minimumCents: 1736 },
  { id: "egger-black", constructionId: "egger", name: "Black", listCents: 1910, minimumCents: 1736 },
  { id: "egger-reed-green", constructionId: "egger", name: "Reed Green", listCents: 2040, minimumCents: 1855 },
  { id: "egger-misty-blue", constructionId: "egger", name: "Misty Blue", listCents: 2040, minimumCents: 1855 },
  { id: "egger-white-halifax-oak", constructionId: "egger", name: "White Halifax Oak", listCents: 2365, minimumCents: 2150 },
  { id: "egger-natural-halifax-oak", constructionId: "egger", name: "Natural Halifax Oak", listCents: 2365, minimumCents: 2150 },
  { id: "egger-vicenza-oak", constructionId: "egger", name: "Vicenza Oak", listCents: 2124, minimumCents: 1931 },
  { id: "egger-trondheim-ash", constructionId: "egger", name: "Trondheim Ash", listCents: 2124, minimumCents: 1931 },
  { id: "egger-fox-grey-tossini-elm", constructionId: "egger", name: "Fox Grey Tossini Elm", listCents: 2124, minimumCents: 1931 },
  { id: "egger-white-linen", constructionId: "egger", name: "White Linen", listCents: 2124, minimumCents: 1931 },
  { id: "egger-beige-textile", constructionId: "egger", name: "Beige Textile", listCents: 2117, minimumCents: 1925 },
  { id: "egger-grey-textile", constructionId: "egger", name: "Grey Textile", listCents: 2117, minimumCents: 1925 },
  { id: "egger-parona-walnut", constructionId: "egger", name: "Parona Walnut", listCents: 2124, minimumCents: 1931 },
  { id: "egger-chocolate-carini-walnut", constructionId: "egger", name: "Chocolate Carini Walnut", listCents: 2254, minimumCents: 2049 },
  { id: "melamine-white", constructionId: "melamine", name: "White Melamine", listCents: 1564, minimumCents: 1422 },
  { id: "agt-high-gloss-white", constructionId: "agt", name: "High Gloss White — 2 side", listCents: 2580, minimumCents: 2345 },
  { id: "paint-poly-bac-2", constructionId: "paint", name: "Poly Bac — 2 side", listCents: 1695, minimumCents: 1541 },
  { id: "paint-poly-bac-1", constructionId: "paint", name: "Poly Bac — 1 side / Maple 1s", listCents: 2154, minimumCents: 1958 },
  { id: "veneer-white-oak-rift", constructionId: "veneer", name: "White Oak — Rift Cut", listCents: 2859, minimumCents: 2599 },
  { id: "veneer-white-oak-plain", constructionId: "veneer", name: "White Oak — Plain Sliced", listCents: 2479, minimumCents: 2253 },
  { id: "veneer-alder-plain", constructionId: "veneer", name: "Alder — Plan Sliced", listCents: 2462, minimumCents: 2238 },
  { id: "veneer-walnut-plain", constructionId: "veneer", name: "Walnut — Plain Sliced", listCents: 2531, minimumCents: 2301 },
  { id: "ridgemont-sand-drift", constructionId: "ridgemont", name: "Sand Drift", listCents: 3187, minimumCents: 2898 },
  { id: "ridgemont-river-stone", constructionId: "ridgemont", name: "River Stone", listCents: 3187, minimumCents: 2898 },
  { id: "ridgemont-moon-glow", constructionId: "ridgemont", name: "Moon Glow", listCents: 3187, minimumCents: 2898 },
  { id: "ridgemont-summit-shadow", constructionId: "ridgemont", name: "Summit Shadow", listCents: 3187, minimumCents: 2898 },
  { id: "ridgemont-umbra-dust", constructionId: "ridgemont", name: "Umbra Dust", listCents: 3187, minimumCents: 2898 },
  { id: "ridgemont-high-desert", constructionId: "ridgemont", name: "High Desert", listCents: 3187, minimumCents: 2898 },
];

export const DEFAULT_FINISH_ID = "egger-alpine-white";

const constructionById = new Map(CONSTRUCTIONS.map((item) => [item.id, item]));
const finishById = new Map(FINISHES.map((item) => [item.id, item]));

export function getConstruction(id: string): Construction | undefined {
  return constructionById.get(id);
}

export function getFinish(id: string): Finish | undefined {
  return finishById.get(id);
}

export function finishesFor(constructionId: string): Finish[] {
  return FINISHES.filter((finish) => finish.constructionId === constructionId);
}

export function requireFinish(id: string): Finish {
  return finishById.get(id) ?? FINISHES[0];
}

export function catalogForPrompt(): string {
  return CONSTRUCTIONS.map((construction) => {
    const names = finishesFor(construction.id)
      .map((finish) => finish.name)
      .join(", ");
    return `${construction.name} (${construction.detail}, sheet ${construction.panelLabel} ft): ${names}`;
  }).join("\n");
}
