"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Layers3, Upload } from "lucide-react";

type Batch = {
  paperKey: string;
  paperColor: string;
  weekday: string;
  colorHex: string;
  shipDates: string[];
  families: { family: string; pages: number; sheets: number; color: string }[];
  stack: {
    pageInJob: number;
    sheet: string;
    orderId: string;
    orderName: string;
    family?: string;
    shipDate: string;
    confidence: number;
  }[];
  bottomStack: {
    pageInJob: number;
    sheet: string;
    orderId: string;
    orderName: string;
    shipDate: string;
  }[];
  counts: {
    orderPages: number;
    uniqueOrders: number;
    topPartsPages: number;
    bottomPages: number;
  };
  topPartsPdfBase64: string;
  bottomsPdfBase64: string;
};

type Session = {
  accuracyScore: number;
  issues: { severity: string; code: string; message: string }[];
  colorBatches: Batch[];
  paperLegend: { weekday: string; paperColor: string; colorHex: string }[];
  counts: {
    topPages: number;
    partsPages: number;
    bottomPages: number;
    colorBatches: number;
    uniqueOrders: number;
  };
};

function downloadBase64(b64: string, filename: string) {
  const a = document.createElement("a");
  a.href = `data:application/pdf;base64,${b64}`;
  a.download = filename;
  a.click();
}

export default function OpsDashboardPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [activePaper, setActivePaper] = useState("");
  const [tab, setTab] = useState<"stack" | "bottoms" | "preflight">("stack");
  const [over, setOver] = useState(false);

  const batch = useMemo(
    () => session?.colorBatches.find((b) => b.paperKey === activePaper) || null,
    [session, activePaper],
  );

  const organize = useCallback(async (fileList: FileList | File[]) => {
    const files = [...fileList].filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      files.forEach((f) => body.append("files", f));
      const res = await fetch("/api/organize", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Organize failed");
      setSession(data);
      setActivePaper(data.colorBatches?.[0]?.paperKey || "");
      setTab("stack");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Organize failed");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-24">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#163f36] font-display text-xl font-bold text-[#eef7f3]">
            OD
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Ops Dashboard</h1>
            <p className="text-sm text-[var(--muted)]">CutFlow · ship-date paper colors · material families</p>
          </div>
        </div>
        <span className="rounded-full bg-[#163f36] px-3 py-1 text-xs font-bold text-[#eef7f3]">
          Live on Vercel
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <section className="space-y-4">
          <div
            className={`rounded-[28px] border border-dashed border-[color-mix(in_srgb,var(--good)_45%,var(--line))] bg-[var(--panel)] p-6 shadow-sm ${over ? "ring-4 ring-[rgba(31,111,91,0.12)]" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              organize(e.dataTransfer.files);
            }}
          >
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#163f36] text-[#e8f5f0]">
              <Upload size={22} />
            </div>
            <h2 className="font-display text-2xl font-semibold">Dump cut sheet PDFs</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Drop Top, Parts, and Bottom PDFs. Cloud organize by paper color + material family. Download print-ready
              jobs (local printer trays stay on your workstation CutFlow).
            </p>
            <label className="mt-4 inline-flex cursor-pointer rounded-full border border-[var(--line)] px-4 py-2 text-sm font-bold">
              Choose PDFs
              <input
                type="file"
                accept="application/pdf"
                multiple
                hidden
                disabled={busy}
                onChange={(e) => e.target.files && organize(e.target.files)}
              />
            </label>
          </div>

          <div className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm">
            <h3 className="mb-2 font-bold">Paper color legend</h3>
            <div className="space-y-2 text-sm">
              {(session?.paperLegend || [
                { weekday: "Monday", paperColor: "Purple", colorHex: "#6B3FA0" },
                { weekday: "Tuesday", paperColor: "Green", colorHex: "#2F8F4E" },
                { weekday: "Wednesday", paperColor: "Blue", colorHex: "#2F6FED" },
                { weekday: "Thursday", paperColor: "Yellow", colorHex: "#D4B200" },
                { weekday: "Friday", paperColor: "Red", colorHex: "#C62828" },
              ]).map((row) => (
                <div key={row.weekday} className="grid grid-cols-[16px_1fr_auto] items-center gap-2">
                  <i className="h-3.5 w-3.5 rounded" style={{ background: row.colorHex }} />
                  <strong>{row.weekday}</strong>
                  <span className="text-[var(--muted)]">{row.paperColor}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {!session && (
            <div className="grid min-h-[360px] place-content-center gap-3 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center shadow-sm">
              <Layers3 className="mx-auto" size={40} />
              <h2 className="font-display text-2xl font-semibold">Ready for production batches</h2>
              <p className="mx-auto max-w-md text-sm text-[var(--muted)]">
                Mon Purple · Tue Green · Wed Blue · Thu Yellow · Fri Red. Organize in the cloud, download each color
                job, print from your M611 with tray swaps.
              </p>
            </div>
          )}

          {session && (
            <>
              <div className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-6">
                  <div
                    className="grid h-28 w-28 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(${session.accuracyScore >= 95 ? "var(--good)" : "var(--warn)"} ${session.accuracyScore * 3.6}deg, #d5dfd9 0)`,
                    }}
                  >
                    <div className="grid h-[5.5rem] w-[5.5rem] place-content-center rounded-full bg-[var(--panel)] text-center">
                      <strong className="font-display text-3xl">{session.accuracyScore.toFixed(0)}%</strong>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">accuracy</span>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[var(--muted)]">Unique orders</span>
                      <strong className="block text-lg">{session.counts.uniqueOrders}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Paper colors</span>
                      <strong className="block text-lg">{session.counts.colorBatches}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Top / Parts / Bottom</span>
                      <strong className="block text-lg">
                        {session.counts.topPages}/{session.counts.partsPages}/{session.counts.bottomPages}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Issues</span>
                      <strong className="block text-lg">
                        {session.issues.filter((i) => i.severity === "error").length} err ·{" "}
                        {session.issues.filter((i) => i.severity === "warn").length} warn
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {session.colorBatches.map((b) => (
                  <button
                    key={b.paperKey}
                    type="button"
                    onClick={() => setActivePaper(b.paperKey)}
                    className={`overflow-hidden rounded-2xl border bg-[var(--panel)] text-left shadow-sm transition ${
                      activePaper === b.paperKey ? "ring-2" : ""
                    }`}
                    style={{ borderColor: b.colorHex, ["--tw-ring-color" as string]: b.colorHex }}
                  >
                    <div className="flex">
                      <div className="w-3" style={{ background: b.colorHex }} />
                      <div className="p-3">
                        <strong>{b.paperColor}</strong>
                        <div className="text-sm text-[var(--muted)]">{b.weekday}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {b.counts.orderPages} units · {b.counts.bottomPages} bottoms
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {batch && (
                <div
                  className="rounded-3xl border border-[var(--line)] border-t-4 bg-[var(--panel)] p-5 shadow-sm"
                  style={{ borderTopColor: batch.colorHex }}
                >
                  <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: batch.colorHex }}>
                    Download this color job
                  </p>
                  <h2 className="font-display text-2xl font-semibold">
                    {batch.paperColor} paper · {batch.weekday}
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    Ship dates: {batch.shipDates.join(", ") || "—"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white"
                      onClick={() =>
                        downloadBase64(
                          batch.topPartsPdfBase64,
                          `CutFlow-${batch.paperColor}-Top-Parts.pdf`,
                        )
                      }
                    >
                      <Download size={16} /> Top+Parts PDF
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-[#163f36] px-4 py-2 text-sm font-bold text-white"
                      onClick={() =>
                        downloadBase64(batch.bottomsPdfBase64, `CutFlow-${batch.paperColor}-Bottoms.pdf`)
                      }
                    >
                      <Download size={16} /> Bottoms PDF
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {batch.families.map((f) => (
                      <div
                        key={f.family}
                        className="rounded-xl border-l-4 bg-white p-3 text-sm"
                        style={{ borderLeftColor: f.color }}
                      >
                        <strong>{f.family}</strong>
                        <div className="text-[var(--muted)]">
                          {f.pages} pages · {f.sheets} sheets
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(
                      [
                        ["stack", "Top+Parts stack"],
                        ["bottoms", "Bottoms"],
                        ["preflight", "Preflight"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                          tab === id ? "bg-[#163f36] text-white" : "bg-[#e5ece8] text-[var(--muted)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 max-h-[420px] space-y-1.5 overflow-auto">
                    {tab === "stack" &&
                      batch.stack.map((row) => (
                        <div
                          key={`${row.pageInJob}-${row.sheet}`}
                          className="grid grid-cols-[40px_70px_90px_1fr_70px] gap-2 rounded-xl bg-white px-3 py-2 text-sm"
                        >
                          <span className="font-mono text-[var(--muted)]">{row.pageInJob}</span>
                          <span className="text-xs font-extrabold">{row.sheet}</span>
                          <strong className="font-mono">{row.orderId}</strong>
                          <span>{row.family}</span>
                          <span className="text-right font-mono text-[var(--muted)]">
                            {Math.round(row.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    {tab === "bottoms" &&
                      batch.bottomStack.map((row) => (
                        <div
                          key={row.pageInJob}
                          className="grid grid-cols-[40px_70px_90px_1fr] gap-2 rounded-xl bg-white px-3 py-2 text-sm"
                        >
                          <span className="font-mono text-[var(--muted)]">{row.pageInJob}</span>
                          <span className="text-xs font-extrabold">BOTTOM</span>
                          <strong className="font-mono">{row.orderId}</strong>
                          <span>{row.shipDate}</span>
                        </div>
                      ))}
                    {tab === "preflight" && (
                      <div className="space-y-2">
                        {!session.issues.length && (
                          <div className="flex items-center gap-2 font-bold text-[var(--good)]">
                            <CheckCircle2 size={18} /> No issues — batch looks clean.
                          </div>
                        )}
                        {session.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-2 rounded-xl border p-3 text-sm ${
                              issue.severity === "error" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
                            }`}
                          >
                            <AlertTriangle size={16} />
                            <div>
                              <strong>{issue.code}</strong>
                              <p className="text-[var(--muted)]">{issue.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {(error || busy) && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                error ? "bg-[#ffe8e5] text-[var(--bad)]" : "bg-[#14201c] text-white"
              }`}
            >
              {error || "Organizing batch in the cloud…"}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
