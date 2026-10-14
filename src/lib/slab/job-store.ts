import { DEFAULT_FINISH_ID } from "@/lib/slab/catalog";
import type { StoredJob } from "@/lib/slab/storage";

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
const listeners = new Set<() => void>();

function discardSavedJob() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked. The quote still starts empty.
  }
}

if (typeof window !== "undefined") {
  discardSavedJob();
}

export function subscribeJob(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getJobSnapshot(): StoredJob {
  return snapshot;
}

export function getServerJob(): StoredJob {
  return EMPTY_JOB;
}

export function updateJob(recipe: (current: StoredJob) => StoredJob) {
  if (typeof window === "undefined") return;
  snapshot = recipe(snapshot);
  discardSavedJob();
  for (const listener of listeners) listener();
}
