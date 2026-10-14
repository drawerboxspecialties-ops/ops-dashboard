export type SheetIdentity = {
  customer: string;
  jobName: string;
};

/** Collapse a name copied off a sheet. Blank stays blank. */
export function cleanSheetName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

/**
 * Use a customer or PO/job written on the upload.
 * A blank read leaves a name the shop already typed. Replace uses the sheet when it names one.
 */
export function applySheetIdentity(
  current: SheetIdentity,
  found: SheetIdentity,
  mode: "append" | "replace",
): SheetIdentity & { filledCustomer: boolean; filledJob: boolean } {
  const customer = choose(current.customer, found.customer, mode);
  const jobName = choose(current.jobName, found.jobName, mode);
  return {
    customer,
    jobName,
    filledCustomer: customer !== current.customer,
    filledJob: jobName !== current.jobName,
  };
}

export function identityNotice(filledCustomer: boolean, filledJob: boolean): string {
  if (filledCustomer && filledJob) return "Customer and PO filled from the sheet.";
  if (filledCustomer) return "Customer filled from the sheet.";
  if (filledJob) return "PO filled from the sheet.";
  return "";
}

function choose(current: string, found: string, mode: "append" | "replace"): string {
  const next = cleanSheetName(found);
  if (!next) return current;
  if (mode === "replace" || !current.trim()) return next;
  return current;
}
