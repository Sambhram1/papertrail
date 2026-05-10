import Link from "next/link";
import type { AnalysisResult } from "@/lib/types";

export function ResultHeader({ analysis }: { analysis: AnalysisResult }) {
  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="surface p-5">
        <p className="text-xs uppercase text-[var(--muted)]">{analysis.documentType}</p>
        <h1 className="display-title mt-5 max-w-5xl text-5xl leading-none text-[var(--paper)] sm:text-7xl">
          {analysis.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--paper-2)]">
          {analysis.oneLineSummary}
        </p>
      </div>

      <div className="paper-card p-5">
        {analysis.sourceThumbnailUrl || analysis.sourceFile?.url ? (
          <div className="overflow-hidden border border-black bg-white">
            <img
              src={analysis.sourceThumbnailUrl || analysis.sourceFile?.url || ""}
              alt={analysis.sourceTitle ?? analysis.title}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/" className="mono-button-dark px-3 py-3 text-center text-xs uppercase">
            New item
          </Link>
          <Link href="/history" className="border border-black px-3 py-3 text-center text-xs uppercase">
            History
          </Link>
        </div>
      </div>
    </section>
  );
}
