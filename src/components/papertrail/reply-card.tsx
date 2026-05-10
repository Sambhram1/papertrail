"use client";

import { useState } from "react";

export function ReplyCard({ reply }: { reply: string }) {
  const [copied, setCopied] = useState(false);

  async function copyReply() {
    await navigator.clipboard.writeText(reply);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className="paper-card p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase text-neutral-500">Ready to send</p>
        <button
          type="button"
          onClick={() => void copyReply()}
          className="border border-black px-3 py-2 text-xs uppercase transition hover:bg-black hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-4 border border-black bg-white px-4 py-4 text-sm leading-7">{reply}</p>
    </article>
  );
}
