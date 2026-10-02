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
