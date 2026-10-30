export const ORG_NAME = "drawerboxspecialties-ops";

export type ExtraLink = {
  label: string;
  url: string;
};

export type HubApp = {
  name: string;
  title: string;
  description: string;
  url: string;
  host: string;
  updated_at: string;
  alongsidePages?: boolean;
  extraLinks?: ExtraLink[];
};

export const APP_EXTRA_LINKS: Record<string, ExtraLink[]> = {
  "dbs-safety": [
    { label: "Sign-in", url: "https://drawerboxspecialties-ops.github.io/dbs-safety/meetings/sign-in/" },
    { label: "This month", url: "https://drawerboxspecialties-ops.github.io/dbs-safety/meetings/" },
  ],
};

export const PAGE_APP_OVERRIDES: Record<string, { title?: string; description?: string }> = {
  "dbs-safety": {
    title: "DBS Safety",
    description: "Safety meetings, sign-in, and training record. Catch a department when you have time.",
  },
  "dbs-u-shape-spec-calculator": {
    title: "DBS U-Shape Spec Calculator",
    description: "U-shape drawer box cut specs and printable shop sheets.",
  },
  "allmoxy-top-edge-calculator": {
    description: "Turn an Allmoxy top-edge CSV into parts, boxes, heights, and cut layouts.",
  },
  opticutexportappv2: {
    title: "OptiCut Export",
    description: "Turn an Allmoxy CSV into a Weinig OptiCut cut list.",
  },
};

export const VERCEL_APPS: HubApp[] = [
  {
    name: "allmoxy-bottoms",
    title: "Allmoxy Bottoms",
    description: "Drop a bottoms batch, remove orders by number, and save today's CSV to the Desktop.",
    url: "https://allmoxy-bottoms.vercel.app",
    host: "Vercel",
    updated_at: "2026-10-26T17:00:00.000Z",
  },
  {
    name: "slab-measure",
    title: "Slab Measure",
    description: "Read a door schedule from a photo or PDF, then price slab doors and drawer fronts from the October 2026 list.",
    url: "https://dbs-ops-hub.vercel.app/slab",
    host: "Vercel",
    updated_at: "2026-10-12T16:00:00.000Z",
  },
  {
    name: "route-xl-to-csv",
    title: "Route XL to CSV",
    description: "Paste Route XL text and save the OptimoRoute CSV, with boxes, payment terms, and dollar totals.",
    url: "https://dbs-ops-hub.vercel.app/RouteXL-to-CSV.html",
    host: "Vercel",
    updated_at: "2026-10-03T02:00:00.000Z",
  },
  {
    name: "cutflow",
    title: "CutFlow",
    description: "Local cut-sheet organizer + HP M611 print. Opens the shop PC app only (Always On must be running).",
    url: "http://127.0.0.1:5055",
    host: "Local",
    alongsidePages: true,
    updated_at: "2026-08-14T00:00:00.000Z",
  },
  {
    name: "dbs-rta-quote-calculator",
    title: "DBS RTA Quote Calculator",
    description: "RTA cabinet quotes, Sheets sync, and built-in material requests in one app.",
    url: "https://dbs-rta-quote-calculator.vercel.app/quote/index.html",
    host: "Vercel",
    updated_at: "2026-07-31T00:00:00.000Z",
  },
  {
    name: "ups-packaging",
    title: "UPS Packaging",
    description: "Pack cartons, shop UPS rates, and print 4×6 labels from Allmoxy orders.",
    url: "https://ups-packaging.vercel.app",
    host: "Vercel",
    updated_at: "2026-08-21T00:00:00.000Z",
  },
  {
    name: "shipflow",
    title: "ShipFlow",
    description: "Local shipper + invoice organizer and HP M611 staple print. Opens the shop PC app (Start ShipFlow.bat must be running).",
    url: "http://127.0.0.1:5056",
    host: "Local",
    extraLinks: [{ label: "Cloud download", url: "https://shipflow-snowy.vercel.app" }],
    updated_at: "2026-10-30T20:52:00.000Z",
  },
  {
    name: "dbs-ship-scan",
    title: "Ship Scan",
    description: "Scan and collect Allmoxy orders, then schedule or post status to Shipped.",
    url: "https://dbs-ship-scan.vercel.app",
    host: "Vercel",
    updated_at: "2026-09-16T00:00:00.000Z",
  },
  {
    name: "dbs-reports",
    title: "DBS Reports",
    description: "Shipping, margin, manufacturing, commission, transfer, company limits, and trash.",
    url: "https://dbs-shipping-report.vercel.app",
    host: "Vercel",
    updated_at: "2026-07-29T00:00:00.000Z",
  },
  {
    name: "dbs-route-printouts",
    title: "DBS Route Printouts",
    description: "Tablet shipping and driver printouts. Calendar opens live OptimoRoute or saved daily reports.",
    url: "https://dbs-route-printouts.vercel.app",
    host: "Vercel",
    updated_at: "2026-09-29T00:00:00.000Z",
  },
  {
    name: "dbs-route-live",
    title: "DBS Route Live",
    description: "Live OptimoRoute status, map, signatures, and photos. Separate from Route Printouts.",
    url: "https://dbs-route-live.vercel.app",
    host: "Vercel",
    updated_at: "2026-10-23T00:00:00.000Z",
  },
];

export function formatAppName(name: string) {
  return String(name || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const HUB_SECTIONS = [
  { id: "shipping", title: "Shipping", blurb: "Routes, printouts, scan, UPS, and shippers", bg: "#e7eef8", header: "#d5e3f4", ink: "#0b3a6e" },
  { id: "reports", title: "Reports", blurb: "Shipping, margin, and manufacturing", bg: "#e5f6f4", header: "#d2eeeb", ink: "#0f766e" },
  { id: "calculators", title: "Calculators", blurb: "Quotes and pricing", bg: "#f8f1e3", header: "#f0e4cc", ink: "#8a5a12" },
  { id: "shop", title: "Shop", blurb: "Specs, bottoms, cut sheets, and the shop PC", bg: "#e8f6ea", header: "#d4edd8", ink: "#1f6b3a" },
  { id: "help", title: "Help", blurb: "Safety meetings and training", bg: "#f4eef8", header: "#e6dcf2", ink: "#5b3d82" },
  { id: "other", title: "Other", blurb: "", bg: "#f4f4f5", header: "#e7e5e4", ink: "#44403c" },
] as const;

export type HubSectionId = (typeof HUB_SECTIONS)[number]["id"];

const APP_SECTION: Record<string, HubSectionId> = {
  "dbs-route-live": "shipping",
  "dbs-route-printouts": "shipping",
  "route-xl-to-csv": "shipping",
  "dbs-ship-scan": "shipping",
  "ups-packaging": "shipping",
  shipflow: "shipping",
  "dbs-reports": "reports",
  "slab-measure": "calculators",
  "dbs-rta-quote-calculator": "calculators",
  "allmoxy-bottoms": "shop",
  "allmoxy-top-edge-calculator": "shop",
  "dbs-u-shape-spec-calculator": "shop",
  "dbs-trash-can-cutout-spec": "shop",
  opticutexportappv2: "shop",
  cutflow: "shop",
  "dbs-safety": "help",
};

const SECTION_ORDER: Record<HubSectionId, string[]> = {
  shipping: [
    "dbs-route-live",
    "dbs-route-printouts",
    "route-xl-to-csv",
    "dbs-ship-scan",
    "ups-packaging",
    "shipflow",
  ],
  reports: ["dbs-reports"],
  calculators: ["slab-measure", "dbs-rta-quote-calculator"],
  shop: [
    "allmoxy-bottoms",
    "allmoxy-top-edge-calculator",
    "dbs-u-shape-spec-calculator",
    "dbs-trash-can-cutout-spec",
    "opticutexportappv2",
    "cutflow",
  ],
  help: ["dbs-safety"],
  other: [],
};

export function sectionForApp(app: HubApp): HubSectionId {
  return APP_SECTION[app.name.toLowerCase()] ?? "other";
}

export function compareInSection(a: HubApp, b: HubApp, section: HubSectionId) {
  const order = SECTION_ORDER[section];
  const rank = (app: HubApp) => {
    const index = order.indexOf(app.name.toLowerCase());
    return index === -1 ? order.length : index;
  };
  const byRank = rank(a) - rank(b);
  if (byRank !== 0) return byRank;
  return a.title.localeCompare(b.title);
}
