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
  cta?: string;
  alongsidePages?: boolean;
  extraLinks?: ExtraLink[];
};

export const APP_EXTRA_LINKS: Record<string, ExtraLink[]> = {
  "dbs-safety": [
    { label: "Sign-in", url: "https://drawerboxspecialties-ops.github.io/dbs-safety/meetings/sign-in/" },
    { label: "This month", url: "https://drawerboxspecialties-ops.github.io/dbs-safety/meetings/" },
  ],
};

export const PAGE_APP_OVERRIDES: Record<string, { title: string; description: string }> = {
  "dbs-safety": {
    title: "DBS Safety",
    description: "Safety meetings, sign-in, and training record. Catch a department when you have time.",
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
    name: "dbs-cv-helpbot",
    title: "CV Help",
    description: "Cabinet Vision 2026 assistant. Ask about a screen, command, or setting.",
    url: "https://dbs-cv-helpbot.vercel.app",
    host: "Vercel",
    updated_at: "2026-09-24T00:00:00.000Z",
  },
  {
    name: "cutflow",
    title: "CutFlow",
    description: "Local cut-sheet organizer + HP M611 print. Opens the shop PC app only (Always On must be running).",
    url: "http://127.0.0.1:5055",
    host: "Local",
    cta: "Open local",
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
    description: "Shipping, Margin Desk, and Manufacturing Desk in one hub.",
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
  {
    name: "allmoxy-ops-chat",
    title: "Allmoxy Chatbot",
    description: "Ask about orders, customers, invoices, and payments.",
    url: "https://allmoxy-ops-chat.vercel.app",
    host: "Vercel",
    updated_at: "2026-07-24T00:00:00.000Z",
  },
];

export function formatAppName(name: string) {
  return String(name || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const HUB_SECTIONS = [
  { id: "shipping", title: "Shipping", blurb: "Routes, printouts, scan, and UPS" },
  { id: "reports", title: "Reports", blurb: "Shipping, margin, and manufacturing" },
  { id: "calculators", title: "Calculators", blurb: "Quotes, specs, and pricing" },
  { id: "shop", title: "Shop", blurb: "Bottoms, cut sheets, and the shop PC" },
  { id: "help", title: "Help", blurb: "Cabinet Vision, Allmoxy, and safety" },
  { id: "other", title: "Other", blurb: "" },
] as const;

export type HubSectionId = (typeof HUB_SECTIONS)[number]["id"];

const APP_SECTION: Record<string, HubSectionId> = {
  "dbs-route-live": "shipping",
  "dbs-route-printouts": "shipping",
  "route-xl-to-csv": "shipping",
  "dbs-ship-scan": "shipping",
  "ups-packaging": "shipping",
  "dbs-reports": "reports",
  "slab-measure": "calculators",
  "allmoxy-top-edge-calculator": "calculators",
  "dbs-u-shape-spec-calculator": "calculators",
  "dbs-rta-quote-calculator": "calculators",
  "dbs-trash-can-cutout-spec": "calculators",
  "allmoxy-bottoms": "shop",
  opticutexportappv2: "shop",
  cutflow: "shop",
  "dbs-cv-helpbot": "help",
  "allmoxy-ops-chat": "help",
  "dbs-safety": "help",
};

const SECTION_ORDER: Record<HubSectionId, string[]> = {
  shipping: [
    "dbs-route-live",
    "dbs-route-printouts",
    "route-xl-to-csv",
    "dbs-ship-scan",
    "ups-packaging",
  ],
  reports: ["dbs-reports"],
  calculators: [
    "slab-measure",
    "allmoxy-top-edge-calculator",
    "dbs-u-shape-spec-calculator",
    "dbs-rta-quote-calculator",
    "dbs-trash-can-cutout-spec",
  ],
  shop: ["allmoxy-bottoms", "opticutexportappv2", "cutflow"],
  help: ["dbs-cv-helpbot", "allmoxy-ops-chat", "dbs-safety"],
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
