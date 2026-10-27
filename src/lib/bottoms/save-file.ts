type SavePicker = (options: {
  suggestedName?: string;
  startIn?: "desktop" | "documents" | "downloads";
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;

export type SaveResult = "saved" | "downloaded" | "cancelled";

export async function saveCsvFile(contents: string, filename: string): Promise<SaveResult> {
  const picker = (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await openPicker(picker, filename, true);
      await writeHandle(handle, contents);
      return "saved";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
      try {
        const handle = await openPicker(picker, filename, false);
        await writeHandle(handle, contents);
        return "saved";
      } catch (retryError) {
        if (isAbort(retryError)) return "cancelled";
      }
    }
  }

  downloadCsv(contents, filename);
  return "downloaded";
}

export function downloadCsv(contents: string, filename: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function openPicker(picker: SavePicker, filename: string, startOnDesktop: boolean) {
  return picker({
    suggestedName: filename,
    startIn: startOnDesktop ? "desktop" : "downloads",
    types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
  });
}

async function writeHandle(handle: FileSystemFileHandle, contents: string) {
  const writable = await handle.createWritable();
  await writable.write(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  await writable.close();
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
