# PaperTrail MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished Next.js MVP that turns pasted text, screenshots, and PDFs into a structured action plan with demo fallback and local history.

**Architecture:** This app is a fresh Next.js App Router project with a single analysis API route, a client-side intake and result flow, and local storage for recent analyses. Text, image, and PDF inputs normalize into one server contract; the server extracts PDF text when possible, calls OpenAI when configured, repairs incomplete output, and falls back to seeded demo analyses when needed.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, OpenAI SDK, `pdf-parse`, Zod, localStorage, React client components

---

## File Structure

### App shell and config

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `components.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

### App routes

- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `src/app/analyze/page.tsx`
- Create: `src/app/history/page.tsx`
- Create: `src/app/api/analyze/route.ts`

### UI components

- Create: `src/components/papertrail/logo.tsx`
- Create: `src/components/papertrail/hero.tsx`
- Create: `src/components/papertrail/intake-panel.tsx`
- Create: `src/components/papertrail/sample-gallery.tsx`
- Create: `src/components/papertrail/transform-preview.tsx`
- Create: `src/components/papertrail/analyze-shell.tsx`
- Create: `src/components/papertrail/result-header.tsx`
- Create: `src/components/papertrail/result-cards.tsx`
- Create: `src/components/papertrail/checklist-card.tsx`
- Create: `src/components/papertrail/reply-card.tsx`
- Create: `src/components/papertrail/history-list.tsx`
- Create: `src/components/papertrail/state-badge.tsx`

### Lib and types

- Create: `src/lib/types.ts`
- Create: `src/lib/demo-data.ts`
- Create: `src/lib/storage.ts`
- Create: `src/lib/utils.ts`
- Create: `src/lib/analysis/schema.ts`
- Create: `src/lib/analysis/prompt.ts`
- Create: `src/lib/analysis/normalize.ts`
- Create: `src/lib/analysis/repair.ts`
- Create: `src/lib/analysis/client.ts`
- Create: `src/lib/extraction/pdf.ts`
- Create: `src/lib/extraction/file.ts`

### Tests

- Create: `src/lib/analysis/schema.test.ts`
- Create: `src/lib/analysis/repair.test.ts`
- Create: `src/lib/analysis/normalize.test.ts`

## Task 1: Scaffold the Next.js App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Write the initial `package.json` and core config files**

```json
{
  "name": "papertrail",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "node --test --import tsx"
  },
  "dependencies": {
    "next": "^16.0.0",
    "openai": "^5.0.0",
    "pdf-parse": "^1.1.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Add a minimal root layout**

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PaperTrail",
  description: "Turn messy life-admin into a clear action plan."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Add a temporary landing placeholder**

```tsx
export default function HomePage() {
  return <main>PaperTrail</main>;
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`  
Expected: install completes and `package-lock.json` is created

- [ ] **Step 5: Start the app once**

Run: `npm run dev`  
Expected: Next.js starts locally without config errors

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs .gitignore src/app/layout.tsx src/app/globals.css src/app/page.tsx
git commit -m "chore: scaffold PaperTrail app"
```

## Task 2: Define Types, Demo Data, and Parsing Contracts

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/demo-data.ts`
- Create: `src/lib/analysis/schema.ts`
- Create: `src/lib/analysis/repair.ts`
- Test: `src/lib/analysis/schema.test.ts`
- Test: `src/lib/analysis/repair.test.ts`

- [ ] **Step 1: Write the failing schema parsing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseAnalysisResult } from "./schema";

test("parseAnalysisResult fills stable required fields", () => {
  const parsed = parseAnalysisResult({
    documentType: "Invoice",
    oneLineSummary: "Payment due in 3 days"
  });

  assert.equal(parsed.documentType, "Invoice");
  assert.deepEqual(parsed.deadlines, []);
  assert.equal(parsed.suggestedReply.length > 0, true);
});
```

- [ ] **Step 2: Run the schema test to confirm failure**

Run: `npm test -- src/lib/analysis/schema.test.ts`  
Expected: FAIL because `parseAnalysisResult` does not exist

- [ ] **Step 3: Implement the shared types and schema parser**

```ts
import { z } from "zod";

const deadlineSchema = z.object({
  label: z.string().default("Untitled deadline"),
  date: z.string().default("Not found"),
  confidence: z.enum(["high", "medium", "low"]).default("low")
});

export const analysisSchema = z.object({
  id: z.string().default(""),
  createdAt: z.string().default(""),
  title: z.string().default("Untitled item"),
  documentType: z.string().default("Unknown"),
  oneLineSummary: z.string().default("No summary available."),
  plainEnglishExplanation: z.string().default("PaperTrail could not fully explain this item."),
  deadlines: z.array(deadlineSchema).default([]),
  actions: z.array(z.object({
    id: z.string().default(""),
    label: z.string().default("Review this item"),
    detail: z.string().default(""),
    done: z.boolean().default(false),
    priority: z.enum(["high", "medium", "low"]).default("medium")
  })).default([]),
  riskLevel: z.enum(["high", "medium", "low"]).default("low"),
  risks: z.array(z.string()).default([]),
  suggestedReply: z.string().default("No suggested reply available."),
  entities: z.array(z.object({
    type: z.string().default("unknown"),
    value: z.string().default("")
  })).default([]),
  sourcePreview: z.string().default("")
});
```

- [ ] **Step 4: Add demo examples shaped exactly like production results**

```ts
export const demoAnalyses = [
  {
    id: "demo-landlord-rent",
    title: "Landlord move-out notice",
    documentType: "Housing notice",
    oneLineSummary: "Your landlord wants a response and likely charges may follow if you ignore it.",
    plainEnglishExplanation: "This looks like a move-out or repair-related notice. The main issue is responding quickly and documenting your position in writing.",
    deadlines: [{ label: "Reply to notice", date: "Within 3 days", confidence: "medium" }],
    actions: [
      { id: "a1", label: "Reply in writing", detail: "Ask for itemized charges and photo evidence.", done: false, priority: "high" }
    ],
    riskLevel: "medium",
    risks: ["You may lose leverage if you wait too long."],
    suggestedReply: "Hi, I received your notice. Please send the itemized breakdown and supporting photos so I can review it promptly.",
    entities: [{ type: "person", value: "Landlord" }],
    sourcePreview: "Subject: Move-out deductions..."
  }
];
```

- [ ] **Step 5: Run schema and repair tests**

Run: `npm test -- src/lib/analysis/schema.test.ts src/lib/analysis/repair.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/demo-data.ts src/lib/analysis/schema.ts src/lib/analysis/repair.ts src/lib/analysis/schema.test.ts src/lib/analysis/repair.test.ts
git commit -m "feat: add PaperTrail analysis schema and demo data"
```

## Task 3: Build the Landing Experience

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/papertrail/logo.tsx`
- Create: `src/components/papertrail/hero.tsx`
- Create: `src/components/papertrail/intake-panel.tsx`
- Create: `src/components/papertrail/sample-gallery.tsx`
- Create: `src/components/papertrail/transform-preview.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write a temporary render test checklist in the task notes**

Expected manual checks:
- hero explains value in one glance
- intake supports paste and file selection
- sample inputs are visible above the fold
- layout works on mobile width

- [ ] **Step 2: Build the hero and transformation preview**

```tsx
export function Hero() {
  return (
    <section>
      <p>Turn life-admin chaos into a clear next step.</p>
      <h1>Drop in the mess. Get the action plan.</h1>
      <p>PaperTrail decodes emails, screenshots, PDFs, and forms into deadlines, risks, and a ready-to-send reply.</p>
    </section>
  );
}
```

- [ ] **Step 3: Build the intake panel as a client component**

```tsx
"use client";

export function IntakePanel() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <section>
      <input type="file" accept="image/*,application/pdf" />
      <textarea value={text} onChange={(event) => setText(event.target.value)} />
      <button type="button">Analyze</button>
    </section>
  );
}
```

- [ ] **Step 4: Style the page with a distinct visual system**

Use `src/app/globals.css` to define:
- warm paper-toned background variables
- accent colors for risk and action states
- serif or expressive display typography
- card shadows and rounded shapes

- [ ] **Step 5: Run the app and verify the homepage manually**

Run: `npm run dev`  
Expected: landing page looks polished, intake is interactive, no hydration errors

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/globals.css src/components/papertrail/logo.tsx src/components/papertrail/hero.tsx src/components/papertrail/intake-panel.tsx src/components/papertrail/sample-gallery.tsx src/components/papertrail/transform-preview.tsx
git commit -m "feat: build PaperTrail landing page"
```

## Task 4: Implement Normalization and Extraction Helpers

**Files:**
- Create: `src/lib/analysis/normalize.ts`
- Create: `src/lib/extraction/pdf.ts`
- Create: `src/lib/extraction/file.ts`
- Test: `src/lib/analysis/normalize.test.ts`

- [ ] **Step 1: Write the failing normalization test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSubmission } from "./normalize";

test("normalizeSubmission tags plain text inputs", async () => {
  const result = await normalizeSubmission({ text: "Pay this by Friday" });
  assert.equal(result.sourceKind, "text");
  assert.equal(result.normalizedText.includes("Friday"), true);
});
```

- [ ] **Step 2: Run the normalization test to confirm failure**

Run: `npm test -- src/lib/analysis/normalize.test.ts`  
Expected: FAIL because `normalizeSubmission` does not exist

- [ ] **Step 3: Implement minimal normalization**

```ts
export async function normalizeSubmission(input: {
  text?: string;
  fileName?: string;
  fileType?: string;
  fileBuffer?: Buffer;
  demoId?: string;
}) {
  if (input.demoId) return { sourceKind: "demo", normalizedText: input.demoId };
  if (input.text?.trim()) return { sourceKind: "text", normalizedText: input.text.trim() };
  if (input.fileType === "application/pdf" && input.fileBuffer) {
    return {
      sourceKind: "pdf",
      normalizedText: await extractPdfText(input.fileBuffer),
      fileName: input.fileName ?? "document.pdf"
    };
  }
  return {
    sourceKind: "image",
    normalizedText: "",
    fileName: input.fileName ?? "upload"
  };
}
```

- [ ] **Step 4: Implement PDF extraction with best-effort failure handling**

```ts
import pdf from "pdf-parse";

export async function extractPdfText(buffer: Buffer) {
  try {
    const result = await pdf(buffer);
    return result.text.trim();
  } catch {
    return "";
  }
}
```

- [ ] **Step 5: Run normalization tests**

Run: `npm test -- src/lib/analysis/normalize.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/analysis/normalize.ts src/lib/extraction/pdf.ts src/lib/extraction/file.ts src/lib/analysis/normalize.test.ts
git commit -m "feat: add PaperTrail intake normalization"
```

## Task 5: Implement the Analysis Route

**Files:**
- Create: `src/app/api/analyze/route.ts`
- Create: `src/lib/analysis/prompt.ts`
- Create: `src/lib/analysis/client.ts`
- Modify: `src/lib/analysis/schema.ts`
- Modify: `src/lib/analysis/repair.ts`
- Modify: `src/lib/demo-data.ts`

- [ ] **Step 1: Define the analysis prompt builder**

```ts
export function buildAnalysisPrompt(sourceText: string) {
  return `
You are PaperTrail, a consumer tool that converts messy admin content into clear action.
Return strict JSON only.
Extract:
- documentType
- oneLineSummary
- plainEnglishExplanation
- deadlines
- actions
- riskLevel
- risks
- suggestedReply
- entities

Source:
${sourceText}
`.trim();
}
```

- [ ] **Step 2: Implement the OpenAI client wrapper**

```ts
import OpenAI from "openai";

export async function analyzeWithOpenAI(input: { prompt: string; hasVision?: boolean }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: input.prompt
  });

  return response.output_text;
}
```

- [ ] **Step 3: Implement the route handler with demo fallback**

```ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const text = formData.get("text")?.toString() ?? "";
  const demoId = formData.get("demoId")?.toString() ?? "";

  if (demoId) {
    return Response.json(findDemoAnalysis(demoId));
  }

  const normalized = await normalizeRequestFormData(formData);
  const raw = await analyzeWithOpenAI({ prompt: buildAnalysisPrompt(normalized.normalizedText) });
  const repaired = repairAnalysisResult(raw, normalized);

  return Response.json(repaired);
}
```

- [ ] **Step 4: Add guarded behavior for incomplete model output**

Implement:
- null response uses a local fallback analysis
- invalid JSON routes through `repairAnalysisResult`
- empty normalized text returns a `400` with a user-safe message

- [ ] **Step 5: Run lint and targeted tests**

Run: `npm run lint`  
Expected: PASS

Run: `npm test -- src/lib/analysis/schema.test.ts src/lib/analysis/repair.test.ts src/lib/analysis/normalize.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/analyze/route.ts src/lib/analysis/prompt.ts src/lib/analysis/client.ts src/lib/analysis/schema.ts src/lib/analysis/repair.ts src/lib/demo-data.ts
git commit -m "feat: add PaperTrail analysis route"
```

## Task 6: Build the Analyze Page and Result Cards

**Files:**
- Create: `src/app/analyze/page.tsx`
- Create: `src/components/papertrail/analyze-shell.tsx`
- Create: `src/components/papertrail/result-header.tsx`
- Create: `src/components/papertrail/result-cards.tsx`
- Create: `src/components/papertrail/checklist-card.tsx`
- Create: `src/components/papertrail/reply-card.tsx`
- Create: `src/components/papertrail/state-badge.tsx`

- [ ] **Step 1: Build the analyze shell with loading and error states**

```tsx
"use client";

export function AnalyzeShell() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("id");

  if (!analysisId) return <div>No analysis selected.</div>;
  return <ResultCards analysisId={analysisId} />;
}
```

- [ ] **Step 2: Build the summary, deadlines, risks, and entities cards**

```tsx
export function ResultCards({ analysis }: { analysis: AnalysisResult }) {
  return (
    <section>
      <article>{analysis.oneLineSummary}</article>
      <article>{analysis.plainEnglishExplanation}</article>
    </section>
  );
}
```

- [ ] **Step 3: Build the checklist card with local completion toggles**

```tsx
"use client";

export function ChecklistCard({ analysis }: { analysis: AnalysisResult }) {
  const [items, setItems] = useChecklistState(analysis.id, analysis.actions);
  return items.map((item) => (
    <label key={item.id}>
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => toggleItem(item.id)}
      />
      {item.label}
    </label>
  ));
}
```

- [ ] **Step 4: Build the reply card with copy interaction**

```tsx
"use client";

export function ReplyCard({ reply }: { reply: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(reply)}
    >
      Copy reply
    </button>
  );
}
```

- [ ] **Step 5: Verify the analyze page manually**

Run: `npm run dev`  
Expected: analyze page shows polished cards, copy button works, checklist state updates without reload errors

- [ ] **Step 6: Commit**

```bash
git add src/app/analyze/page.tsx src/components/papertrail/analyze-shell.tsx src/components/papertrail/result-header.tsx src/components/papertrail/result-cards.tsx src/components/papertrail/checklist-card.tsx src/components/papertrail/reply-card.tsx src/components/papertrail/state-badge.tsx
git commit -m "feat: render PaperTrail analysis results"
```

## Task 7: Add Client Persistence and History

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/app/history/page.tsx`
- Create: `src/components/papertrail/history-list.tsx`
- Modify: `src/components/papertrail/intake-panel.tsx`
- Modify: `src/components/papertrail/analyze-shell.tsx`

- [ ] **Step 1: Implement storage helpers**

```ts
const HISTORY_KEY = "papertrail-history";

export function saveAnalysis(result: AnalysisResult) {
  const current = loadHistory();
  localStorage.setItem(HISTORY_KEY, JSON.stringify([result, ...current].slice(0, 12)));
}

export function loadHistory(): AnalysisResult[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}
```

- [ ] **Step 2: Save analyses after successful processing**

Add a client-side save call after the analyze result resolves and before navigation settles.

- [ ] **Step 3: Render the `/history` page**

```tsx
export default function HistoryPage() {
  return <HistoryList />;
}
```

- [ ] **Step 4: Add reopen and clear empty-state interactions**

Implement:
- open a past item on `/analyze`
- empty state copy when history is blank
- visible timestamp and document type labels

- [ ] **Step 5: Verify history manually**

Run: `npm run dev`  
Expected: completed analyses appear in history, reopen works, checklist state persists per item

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/app/history/page.tsx src/components/papertrail/history-list.tsx src/components/papertrail/intake-panel.tsx src/components/papertrail/analyze-shell.tsx
git commit -m "feat: add PaperTrail local history"
```

## Task 8: Polish, Docs, and Final Verification

**Files:**
- Create: `.env.example`
- Create: `README.md`
- Modify: `src/app/page.tsx`
- Modify: `src/app/analyze/page.tsx`
- Modify: `src/app/history/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add environment setup docs**

`.env.example`

```bash
OPENAI_API_KEY=
```

`README.md`

```md
## Setup

1. `npm install`
2. Create `.env.local` with `OPENAI_API_KEY`
3. `npm run dev`

If no API key is set, PaperTrail still works in demo mode.
```

- [ ] **Step 2: Polish empty, loading, and error states**

Ensure:
- upload state feels active
- analyze state feels calm and trustworthy
- errors are specific and recoverable
- “Analyze another” is easy to find

- [ ] **Step 3: Run the full verification set**

Run: `npm run lint`  
Expected: PASS

Run: `npm test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Perform final manual QA**

Manual checks:
- paste flow
- PDF flow
- demo flow with no API key
- copy reply
- mark done
- mobile layout

- [ ] **Step 5: Commit**

```bash
git add .env.example README.md src/app/page.tsx src/app/analyze/page.tsx src/app/history/page.tsx src/app/globals.css
git commit -m "docs: finalize PaperTrail MVP setup and polish"
```

## Notes for Execution

- Prefer strict Zod parsing at every server boundary.
- Keep `analyze` rendering card-based, not conversational.
- Do not spend time on advanced OCR cleanup; only support common screenshot and extractable PDF cases.
- If OpenAI responses API shape differs during implementation, keep the wrapper isolated inside `src/lib/analysis/client.ts`.
- If Tailwind v4 setup creates friction in this environment, downgrade immediately to the simplest supported Tailwind config that works with Next.js App Router.

## Local Commands Reference

- `npm install`
- `npm run dev`
- `npm run lint`
- `npm test`
- `npm run build`
