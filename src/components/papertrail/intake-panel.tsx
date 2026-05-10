"use client";

import { useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";

type CaptureKind = "image" | "pdf" | "text" | "calendar" | "link";

type LinkPreview = {
  title: string;
  description: string;
  thumbnailUrl: string;
  siteName: string;
};

const captureOptions: {
  id: CaptureKind;
  label: string;
  heading: string;
  help: string;
  accept?: string;
  placeholder?: string;
}[] = [
  {
    id: "image",
    label: "Image / screenshot",
    heading: "Turn an image into a card.",
    help: "Upload a screenshot, receipt, form photo, notice, or app message.",
    accept: "image/*"
  },
  {
    id: "pdf",
    label: "PDF",
    heading: "Turn a PDF into a card.",
    help: "Upload a bill, policy, school form, letter, invoice, or ticket.",
    accept: "application/pdf"
  },
  {
    id: "text",
    label: "Text",
    heading: "Paste text into a card.",
    help: "Use emails, chats, copied notes, client requests, and admin messages.",
    placeholder: "Paste the email, chat, notice, invoice, or confusing message..."
  },
  {
    id: "calendar",
    label: "Calendar",
    heading: "Capture a deadline.",
    help: "Use invites, reminders, date changes, deadlines, and scheduling notes.",
    placeholder: "Paste a calendar invite, meeting change, reminder, or deadline..."
  },
  {
    id: "link",
    label: "Reel / blog / Twitter",
    heading: "Save a post with context.",
    help: "Paste the URL and PaperTrail will try to pull a title and thumbnail.",
    placeholder: "Paste a reel, blog, Twitter/X post, YouTube link, or saved thread..."
  }
];

export function IntakePanel({
  draftText,
  error,
  isBusy,
  onAnalyze,
  onDraftChange
}: {
  draftText: string;
  error: string;
  isBusy: boolean;
  onAnalyze: (options: {
    text?: string;
    file?: File | null;
    sourceNote?: string;
    sourceUrl?: string;
    sourceTitle?: string;
    sourceThumbnailUrl?: string;
  }) => Promise<void>;
  onDraftChange: (value: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [activeKind, setActiveKind] = useState<CaptureKind>("image");
  const [sourceNote, setSourceNote] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeOption = captureOptions.find((option) => option.id === activeKind) ?? captureOptions[0];
  const usesUpload = activeKind === "image" || activeKind === "pdf";
  const usesLink = activeKind === "link";

  const canAnalyze = useMemo(() => {
    if (usesUpload) {
      return Boolean(file);
    }

    if (usesLink) {
      return Boolean(linkUrl.trim());
    }

    return Boolean(draftText.trim());
  }, [draftText, file, linkUrl, usesLink, usesUpload]);

  function selectKind(kind: CaptureKind) {
    setActiveKind(kind);
    setFile(null);
    setFilePreviewUrl("");
    setLinkPreview(null);
    onDraftChange("");
    setLinkUrl("");
  }

  function setSelectedFile(nextFile: File | null) {
    setFile(nextFile);
    setFilePreviewUrl("");

    if (nextFile?.type.startsWith("image/")) {
      setFilePreviewUrl(URL.createObjectURL(nextFile));
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setSelectedFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function loadLinkPreview() {
    if (!linkUrl.trim()) {
      return;
    }

    setPreviewBusy(true);

    try {
      const response = await fetch("/api/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl.trim() })
      });
      const data = (await response.json()) as LinkPreview;
      setLinkPreview(response.ok ? data : null);
    } finally {
      setPreviewBusy(false);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {captureOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => selectKind(option.id)}
            className={`border px-3 py-3 text-left text-xs uppercase transition ${
              activeKind === option.id
                ? "border-white bg-white text-black"
                : "border-[var(--line)] text-[var(--paper-2)] hover:border-white hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="surface-muted p-4">
          <p className="text-xs uppercase text-[var(--muted)]">{activeOption.label}</p>
          <h2 className="display-title mt-2 text-4xl leading-none text-[var(--paper)] sm:text-6xl">
            {activeOption.heading}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--paper-2)]">
            {activeOption.help}
          </p>

          <div className="mt-5">
            {usesUpload ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="grid min-h-[360px] w-full place-items-center border border-dashed border-[var(--line-strong)] bg-black p-4 text-left transition hover:border-white"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={activeOption.accept}
                  className="hidden"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="w-full max-w-md border border-white bg-white text-black">
                    {filePreviewUrl ? (
                      <div className="relative aspect-[4/3] bg-black">
                        <img
                          src={filePreviewUrl}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="grid aspect-[4/3] place-items-center bg-neutral-100 px-6 text-center">
                        <span className="display-title text-5xl">PDF</span>
                      </div>
                    )}
                    <div className="p-4">
                      <p className="break-all text-sm">{file.name}</p>
                      <p className="mt-1 text-xs uppercase text-neutral-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="display-title text-center text-4xl leading-none text-[var(--paper)]">
                    Choose file or drag here
                  </span>
                )}
              </button>
            ) : usesLink ? (
              <div className="grid gap-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                  <input
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder={activeOption.placeholder}
                    className="border border-[var(--line)] bg-black px-4 py-4 text-sm text-[var(--paper)] outline-none placeholder:text-[var(--muted)] focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={() => void loadLinkPreview()}
                    className="mono-button px-4 py-4 text-xs uppercase"
                  >
                    {previewBusy ? "Loading" : "Preview"}
                  </button>
                </div>
                <PreviewCard
                  fallbackTitle={linkUrl || "Paste a reel, blog, or Twitter link"}
                  note={sourceNote}
                  preview={linkPreview}
                  thumbnailUrl={linkPreview?.thumbnailUrl}
                />
              </div>
            ) : (
              <textarea
                value={draftText}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={activeOption.placeholder}
                className="min-h-[360px] w-full resize-none border border-[var(--line)] bg-black px-4 py-4 text-sm leading-6 text-[var(--paper)] outline-none placeholder:text-[var(--muted)] focus:border-white"
              />
            )}
          </div>
        </div>

        <aside className="grid content-start gap-3">
          <div className="paper-card p-4">
            <p className="text-xs uppercase text-neutral-500">Your description</p>
            <textarea
              value={sourceNote}
              onChange={(event) => setSourceNote(event.target.value)}
              placeholder="Write what you want to remember, ask, do, or schedule from this."
              className="mt-3 min-h-32 w-full resize-none border border-black bg-white px-3 py-3 text-sm leading-6 text-black outline-none"
            />
          </div>

          <button
            type="button"
            disabled={!canAnalyze || isBusy}
            onClick={() =>
              void onAnalyze({
                file: usesUpload ? file : null,
                text: usesUpload ? sourceNote : usesLink ? `${linkUrl}\n\n${sourceNote}` : draftText,
                sourceNote,
                sourceUrl: usesLink ? linkUrl : undefined,
                sourceTitle: linkPreview?.title,
                sourceThumbnailUrl: linkPreview?.thumbnailUrl
              })
            }
            className="mono-button min-h-28 p-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="display-title block text-3xl leading-none">
              {isBusy ? "Saving" : "Save and plan"}
            </span>
            <span className="mt-3 block text-xs uppercase">Supabase + action plan</span>
          </button>

          {error ? (
            <p className="border border-white bg-white px-3 py-3 text-sm leading-6 text-black">
              {error}
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function PreviewCard({
  fallbackTitle,
  note,
  preview,
  thumbnailUrl
}: {
  fallbackTitle: string;
  note: string;
  preview: LinkPreview | null;
  thumbnailUrl?: string;
}) {
  return (
    <article className="max-w-md border border-white bg-white text-black">
      <div className="relative grid aspect-video place-items-center overflow-hidden bg-neutral-200">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={preview?.title ?? fallbackTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="display-title px-6 text-center text-4xl leading-none">Preview</span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase text-neutral-500">{preview?.siteName ?? "Saved link"}</p>
        <h3 className="mt-2 text-base font-bold leading-6">{preview?.title || fallbackTitle}</h3>
        {preview?.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
            {preview.description}
          </p>
        ) : null}
        {note ? <p className="mt-3 border-t border-black pt-3 text-sm leading-6">{note}</p> : null}
      </div>
    </article>
  );
}
