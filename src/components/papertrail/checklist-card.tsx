"use client";

import { useEffect, useState } from "react";
import type { AnalysisAction, AnalysisResult } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ChecklistCard({ analysis }: { analysis: AnalysisResult }) {
  const [items, setItems] = useState<AnalysisAction[]>(analysis.actions);

  useEffect(() => {
    setItems(analysis.actions);
  }, [analysis]);

  function toggleItem(id: string) {
    setItems((current) => {
      const next = current.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      );
      void saveChecklist(next);
      return next;
    });
  }

  async function saveChecklist(next: AnalysisAction[]) {
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: null };

    if (!sessionData?.session) {
      return;
    }

    await fetch(`/api/analyses/${analysis.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ actions: next })
    });
  }

  return (
    <article className="surface p-5">
      <p className="text-xs uppercase text-[var(--muted)]">Checklist</p>
      <div className="mt-4 grid gap-2">
        {items.length ? (
          items.map((item, index) => (
            <label
              key={item.id}
              className="grid cursor-pointer gap-3 border border-[var(--line)] px-4 py-4 transition hover:border-white sm:grid-cols-[28px_1fr_78px]"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleItem(item.id)}
                className="mt-1 h-4 w-4 accent-white"
              />
              <span>
                <span className="block text-sm text-[var(--paper)]">
                  {index + 1}. {item.label}
                </span>
                <span className="mt-1 block text-sm leading-6 text-[var(--paper-2)]">
                  {item.detail}
                </span>
              </span>
              <span className="text-xs uppercase text-[var(--muted)]">{item.priority}</span>
            </label>
          ))
        ) : (
          <p className="border border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)]">
            No concrete tasks were extracted. Review the summary and reply draft.
          </p>
        )}
      </div>
    </article>
  );
}
