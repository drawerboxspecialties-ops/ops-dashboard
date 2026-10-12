import { DEFAULT_FINISH_ID } from "@/lib/slab/catalog";
import { parseStoredJob, type StoredJob } from "@/lib/slab/storage";

export const STORAGE_KEY = "slab-measure.v1";

export const EMPTY_JOB: StoredJob = {
  customer: "",
  jobName: "",
  jobNote: "",
  basis: "list",
  finishId: DEFAULT_FINISH_ID,
  lines: [],
};

let snapshot: StoredJob = EMPTY_JOB;
let started = false;
const listeners = new Set<() => void>();

export function subscribeJob(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getJobSnapshot(): StoredJob {
  if (typeof window === "undefined") return EMPTY_JOB;
  if (!started) {
    started = true;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = parseStoredJob(raw);
      if (parsed) snapshot = parsed;
    }
  }
  return snapshot;
}

export function getServerJob(): StoredJob {
  return EMPTY_JOB;
}

export function updateJob(recipe: (current: StoredJob) => StoredJob) {
  if (typeof window === "undefined") return;
  const next = recipe(getJobSnapshot());
  snapshot = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}
