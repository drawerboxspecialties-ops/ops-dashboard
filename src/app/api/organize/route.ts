import { NextRequest, NextResponse } from "next/server";
import { classifyUpload, organizeCutSheets } from "@/lib/cutflow";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("files");
    const parsed: { name: string; bytes: Uint8Array }[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;
      const kind = classifyUpload(file.name);
      if (!kind) continue;
      const buf = new Uint8Array(await file.arrayBuffer());
      parsed.push({ name: file.name, bytes: buf });
    }

    const result = await organizeCutSheets(parsed);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Organize failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
