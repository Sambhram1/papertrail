"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/papertrail/activity-feed";
import { IntakePanel } from "@/components/papertrail/intake-panel";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AnalysisResult } from "@/lib/types";

export default function HomePage() {
  const [draftText, setDraftText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [lastSaved, setLastSaved] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(data.session.user.email ?? "");
      await loadRemoteHistory(data.session.access_token);
      setReady(true);
    });
  }, []);

  async function loadRemoteHistory(accessToken: string) {
    const response = await fetch("/api/analyses", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      setHistory([]);
      return;
    }

    const data = (await response.json()) as { analyses?: AnalysisResult[] };
    setHistory(data.analyses ?? []);
  }

  async function handleAnalyze(options: {
    text?: string;
    file?: File | null;
    sourceNote?: string;
    sourceUrl?: string;
    sourceTitle?: string;
    sourceThumbnailUrl?: string;
  }) {
    setError("");
    setIsBusy(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: null };
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        window.location.href = "/login";
        return;
      }

      const formData = new FormData();

      if (options.text) {
        formData.append("text", options.text);
      }

      if (options.file) {
        formData.append("file", options.file);
      }

      if (options.sourceNote) {
        formData.append("sourceNote", options.sourceNote);
      }

      if (options.sourceUrl) {
        formData.append("sourceUrl", options.sourceUrl);
      }

      if (options.sourceTitle) {
        formData.append("sourceTitle", options.sourceTitle);
      }

      if (options.sourceThumbnailUrl) {
        formData.append("sourceThumbnailUrl", options.sourceThumbnailUrl);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed.");
      }

      const analysis = data as AnalysisResult;
      setLastSaved(analysis);
      setHistory((current) => [analysis, ...current.filter((item) => item.id !== analysis.id)]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "PaperTrail could not analyze that item."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    window.location.href = "/login";
  }

  if (!ready) {
    return (
      <main className="paper-shell grid min-h-screen place-items-center px-4">
        <section className="surface p-8 text-center">
          <p className="text-xs uppercase text-[var(--muted)]">PaperTrail</p>
          <h1 className="display-title mt-4 text-5xl leading-none">Loading inbox</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="paper-shell min-h-screen px-3 py-3 sm:px-5 sm:py-5">
      <div className="grid min-h-[calc(100vh-2.5rem)] gap-3 lg:grid-cols-[230px_minmax(0,1fr)_390px]">
        <aside className="surface flex flex-col justify-between p-4">
          <div>
            <Link href="/" className="display-title text-3xl leading-none text-[var(--paper)]">
              PaperTrail
            </Link>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Save by day. Review by day. Open the card you made.
            </p>

            <nav className="mt-8 grid gap-2 text-sm">
              {[["Capture", "#capture"], ["Activity", "#activity"], ["History", "/history"]].map(
                ([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    className="flex items-center justify-between border border-[var(--line)] px-3 py-3 text-[var(--paper-2)] transition hover:border-white hover:text-white"
                  >
                    <span>{label}</span>
                    <span aria-hidden="true">+</span>
                  </a>
                )
              )}
            </nav>
          </div>

          <div className="border border-[var(--line)] p-3">
            <p className="text-[10px] uppercase text-[var(--muted)]">Signed in</p>
            <p className="mt-2 truncate text-xs text-[var(--paper)]">{userEmail}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-3 w-full border border-[var(--line)] px-2 py-2 text-xs uppercase transition hover:border-white"
            >
              Sign out
            </button>
          </div>
        </aside>

        <section id="capture" className="surface min-w-0 p-4 sm:p-5">
          <div className="border-b border-[var(--line)] pb-5">
            <p className="text-xs uppercase text-[var(--muted)]">Capture board</p>
            <h1 className="display-title mt-2 max-w-5xl text-5xl leading-none text-[var(--paper)] sm:text-7xl">
              Make every file a saved card.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--paper-2)]">
              Images show as post cards. PDFs show as document cards. Reels, blogs, and tweets save
              with a note and sit in the activity feed by the day you captured them.
            </p>
          </div>

          <div className="mt-5">
            <IntakePanel
              draftText={draftText}
              error={error}
              isBusy={isBusy}
              onAnalyze={handleAnalyze}
              onDraftChange={setDraftText}
            />
          </div>

          {lastSaved ? (
            <div className="mt-4 border border-white bg-white p-4 text-black">
              <p className="text-xs uppercase text-neutral-500">Saved locally in this session</p>
              <p className="mt-2 text-sm font-bold">{lastSaved.title}</p>
              <p className="mt-1 text-xs">
                This item is now in your activity feed by the day you captured it.
              </p>
            </div>
          ) : null}
        </section>

        <aside id="activity" className="surface grid content-start gap-3 p-4">
          <ActivityFeed items={history} title="Saved by day" compact />

          <section className="paper-card p-4">
            <p className="text-xs uppercase text-neutral-500">Storage status</p>
            <p className="mt-3 text-sm leading-6">
              Each upload, thumbnail, note, and result row is stored in Supabase. The timeline is
              grouped by the saved date, not the due date.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
