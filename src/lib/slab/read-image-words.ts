import { boxesToWords, type PageWord } from "@/lib/slab/locate-sizes";

const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js";

type OcrWord = { text?: string; bbox?: { x0: number; y0: number; x1: number; y1: number } };
type OcrWorker = {
  recognize: (image: Blob) => Promise<{ data: { words?: OcrWord[] } }>;
  terminate: () => Promise<void>;
};

/** Read printed words on a photo so size marks can sit on the numbers. */
export async function readImageWords(file: Blob): Promise<PageWord[]> {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();
  if (width <= 0 || height <= 0) return [];

  const load = new Function("url", "return import(url)") as (url: string) => Promise<{
    createWorker?: (lang: string) => Promise<OcrWorker>;
    default?: { createWorker: (lang: string) => Promise<OcrWorker> };
  }>;
  const loaded = await load(TESSERACT_URL);
  const createWorker = loaded.createWorker ?? loaded.default?.createWorker;
  if (!createWorker) throw new Error("The page reader did not start.");
  const worker = await createWorker("eng");
  try {
    const result = await Promise.race([
      worker.recognize(file),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("slow")), 20000);
      }),
    ]);
    const boxes = (result.data.words ?? []).flatMap((word) => {
      const text = word.text?.trim() ?? "";
      const box = word.bbox;
      if (!text || !box) return [];
      return [{ text, left: box.x0, top: box.y0, width: box.x1 - box.x0, height: box.y1 - box.y0 }];
    });
    return boxesToWords(boxes, width, height);
  } finally {
    await worker.terminate();
  }
}
