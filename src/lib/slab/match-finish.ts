import { FINISHES } from "@/lib/slab/catalog";

const STOP = new Set([
  "the",
  "and",
  "with",
  "side",
  "finish",
  "color",
  "colour",
  "slab",
  "door",
  "doors",
  "drawer",
  "front",
]);

const ALIASES: Record<string, string> = {
  alpine: "egger-alpine-white",
  "alpine white": "egger-alpine-white",
  cashmere: "egger-cashmere-grey",
  "cashmere grey": "egger-cashmere-grey",
  "cashmere gray": "egger-cashmere-grey",
  fog: "egger-fog-grey",
  "fog grey": "egger-fog-grey",
  "fog gray": "egger-fog-grey",
  black: "egger-black",
  "reed green": "egger-reed-green",
  "misty blue": "egger-misty-blue",
  "white halifax": "egger-white-halifax-oak",
  "white halifax oak": "egger-white-halifax-oak",
  "halifax oak white": "egger-white-halifax-oak",
  "natural halifax": "egger-natural-halifax-oak",
  "natural halifax oak": "egger-natural-halifax-oak",
  vicenza: "egger-vicenza-oak",
  "vicenza oak": "egger-vicenza-oak",
  trondheim: "egger-trondheim-ash",
  "trondheim ash": "egger-trondheim-ash",
  tossini: "egger-fox-grey-tossini-elm",
  "fox grey": "egger-fox-grey-tossini-elm",
  "fox gray": "egger-fox-grey-tossini-elm",
  "white linen": "egger-white-linen",
  "beige textile": "egger-beige-textile",
  "grey textile": "egger-grey-textile",
  "gray textile": "egger-grey-textile",
  parona: "egger-parona-walnut",
  "parona walnut": "egger-parona-walnut",
  carini: "egger-chocolate-carini-walnut",
  "chocolate carini": "egger-chocolate-carini-walnut",
  "chocolate carini walnut": "egger-chocolate-carini-walnut",
  melamine: "melamine-white",
  "white melamine": "melamine-white",
  "high gloss white": "agt-high-gloss-white",
  "high gloss white 2 side": "agt-high-gloss-white",
  agt: "agt-high-gloss-white",
  "poly bac 2 side": "paint-poly-bac-2",
  "poly bac 2": "paint-poly-bac-2",
  "poly both sides": "paint-poly-bac-2",
  "poly bac 1 side": "paint-poly-bac-1",
  "poly bac 1 side maple": "paint-poly-bac-1",
  "rift white oak": "veneer-white-oak-rift",
  "white oak rift": "veneer-white-oak-rift",
  "white oak rift cut": "veneer-white-oak-rift",
  "rift cut white oak": "veneer-white-oak-rift",
  "plain sliced white oak": "veneer-white-oak-plain",
  "white oak plain sliced": "veneer-white-oak-plain",
  alder: "veneer-alder-plain",
  "alder plain sliced": "veneer-alder-plain",
  "alder plan sliced": "veneer-alder-plain",
  "plain sliced alder": "veneer-alder-plain",
  "plain sliced walnut": "veneer-walnut-plain",
  "walnut plain sliced": "veneer-walnut-plain",
  "sand drift": "ridgemont-sand-drift",
  "river stone": "ridgemont-river-stone",
  "moon glow": "ridgemont-moon-glow",
  "summit shadow": "ridgemont-summit-shadow",
  "umbra dust": "ridgemont-umbra-dust",
  "high desert": "ridgemont-high-desert",
};

export function normalizeFinish(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalizeFinish(value)
    .split(" ")
    .filter((token) => token && !STOP.has(token));
}

export function matchFinish(hint: string): string | null {
  const normalized = normalizeFinish(hint);
  if (!normalized) return null;

  const alias = ALIASES[normalized];
  if (alias) return alias;

  const exact = FINISHES.find((finish) => normalizeFinish(finish.name) === normalized);
  if (exact) return exact.id;

  const hintTokens = new Set(tokens(hint));
  if (hintTokens.size === 0) return null;

  const scored = FINISHES.map((finish) => {
    const finishTokens = tokens(finish.name);
    const overlap = finishTokens.filter((token) => hintTokens.has(token)).length;
    return {
      id: finish.id,
      overlap,
      coverage: finishTokens.length === 0 ? 0 : overlap / finishTokens.length,
    };
  }).filter((row) => row.overlap > 0);

  const full = scored.filter((row) => row.coverage === 1);
  if (full.length === 1) return full[0].id;
  if (full.length > 1) {
    const maxOverlap = Math.max(...full.map((row) => row.overlap));
    const best = full.filter((row) => row.overlap === maxOverlap);
    return best.length === 1 ? best[0].id : null;
  }

  const strong = scored.filter((row) => row.coverage >= 0.67);
  if (strong.length === 1) return strong[0].id;
  return null;
}
