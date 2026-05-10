"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ResultHeader } from "./result-header";
import { ResultCards } from "./result-cards";
import type { AnalysisResult } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AnalyzeShell() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("id");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadAnalysis() {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setAnalysis(null);
        setReady(true);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      if (!analysisId) {
        setAnalysis(null);
        setReady(true);
        return;
      }

      const response = await fetch(`/api/analyses/${analysisId}`, {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        setAnalysis(null);
        setReady(true);
        return;
      }

      setAnalysis((await response.json()) as AnalysisResult);
      setReady(true);
    }

    void loadAnalysis();
  }, [analysisId]);

  return (
    <main className="paper-shell min-h-screen px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto grid max-w-[1440px] gap-3">
        <header className="surface flex flex-wrap items-center justify-between gap-3 p-4">
          <Link href="/" className="display-title text-3xl leading-none">
            PaperTrail
          </Link>
          <div className="flex gap-2 text-xs uppercase">
            <Link href="/" className="mono-button px-3 py-2">
              Inbox
            </Link>
            <Link href="/history" className="mono-button-dark px-3 py-2">
              History
            </Link>
          </div>
        </header>

        {!ready ? (
          <section className="surface p-8 text-center">
            <p className="text-xs uppercase text-[var(--muted)]">Analyzing</p>
            <h1 className="display-title mt-4 text-5xl leading-none text-[var(--paper)]">
              Building the action plan
            </h1>
          </section>
        ) : analysis ? (
          <div className="grid gap-3">
            <ResultHeader analysis={analysis} />
            <ResultCards analysis={analysis} />
          </div>
        ) : (
          <section className="surface p-8 text-center">
            <p className="text-xs uppercase text-[var(--muted)]">No active analysis</p>
            <h1 className="display-title mt-4 text-5xl leading-none text-[var(--paper)]">
              Nothing in the queue.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--paper-2)]">
              Upload a file, paste a message, or drop in a link from the inbox.
            </p>
            <Link href="/" className="mono-button mt-6 inline-flex px-5 py-3 text-sm uppercase">
              Open inbox
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
