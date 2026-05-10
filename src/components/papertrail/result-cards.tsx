import { ChecklistCard } from "./checklist-card";
import { ReplyCard } from "./reply-card";
import { StateBadge } from "./state-badge";
import type { AnalysisResult } from "@/lib/types";

export function ResultCards({ analysis }: { analysis: AnalysisResult }) {
  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="grid gap-3">
        <article className="paper-card p-5">
          <p className="text-xs uppercase text-neutral-500">Plain English</p>
          <p className="mt-4 text-base leading-8">{analysis.plainEnglishExplanation}</p>
        </article>

        <article className="surface p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase text-[var(--muted)]">Calendar candidates</p>
            <StateBadge kind={analysis.riskLevel}>
              {analysis.deadlines.length ? "Dates found" : "No dates"}
            </StateBadge>
          </div>
          <div className="mt-4 grid gap-2">
            {analysis.deadlines.length ? (
              analysis.deadlines.map((deadline) => (
                <div
                  key={`${deadline.label}-${deadline.date}`}
                  className="grid gap-2 border border-[var(--line)] px-4 py-4 sm:grid-cols-[1fr_140px_110px]"
                >
                  <p className="text-sm text-[var(--paper)]">{deadline.label}</p>
                  <p className="text-sm text-[var(--paper-2)]">{deadline.date}</p>
                  <p className="text-xs uppercase text-[var(--muted)]">{deadline.confidence}</p>
                </div>
              ))
            ) : (
              <p className="border border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)]">
                No concrete deadline was found. Review the source before ignoring it.
              </p>
            )}
          </div>
        </article>

        <ChecklistCard analysis={analysis} />
      </div>

      <div className="grid content-start gap-3">
        <article className="surface p-5">
          <p className="text-xs uppercase text-[var(--muted)]">Risks if ignored</p>
          <div className="mt-4 grid gap-2">
            {analysis.risks.length ? (
              analysis.risks.map((risk) => (
                <div key={risk} className="border border-[var(--line)] px-4 py-4">
                  <p className="text-sm leading-6 text-[var(--paper-2)]">{risk}</p>
                </div>
              ))
            ) : (
              <p className="border border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)]">
                No major consequence language was detected.
              </p>
            )}
          </div>
        </article>

        <ReplyCard reply={analysis.suggestedReply} />

        <article className="surface p-5">
          <p className="text-xs uppercase text-[var(--muted)]">Extracted entities</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {analysis.entities.length ? (
              analysis.entities.map((entity) => (
                <span
                  key={`${entity.type}-${entity.value}`}
                  className="border border-[var(--line)] px-3 py-2 text-xs text-[var(--paper-2)]"
                >
                  <span className="mr-2 text-[var(--muted)]">{entity.type}</span>
                  {entity.value}
                </span>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">
                No names, amounts, or dates stood out in the extracted content.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
