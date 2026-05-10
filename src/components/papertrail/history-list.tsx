"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/papertrail/activity-feed";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AnalysisResult } from "@/lib/types";

export function HistoryList() {
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadRemoteHistory() {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setReady(true);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/analyses", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (response.ok) {
        const data = (await response.json()) as { analyses?: AnalysisResult[] };
        setHistory(data.analyses ?? []);
      }

      setReady(true);
    }

    void loadRemoteHistory();
  }, []);

  return (
    <main className="paper-shell min-h-screen px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto grid max-w-[1180px] gap-3">
        <header className="surface flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase text-[var(--muted)]">Activity history</p>
            <h1 className="display-title mt-2 text-5xl leading-none text-[var(--paper)] sm:text-7xl">
              Saved by day.
            </h1>
          </div>
          <Link href="/" className="mono-button px-4 py-3 text-xs uppercase">
            Inbox
          </Link>
        </header>

        {!ready ? (
          <div className="surface p-8 text-center">
            <p className="text-sm text-[var(--muted)]">Loading history...</p>
          </div>
        ) : (
          <ActivityFeed items={history} title="Scroll by the day you saved it" />
        )}
      </div>
    </main>
  );
}
