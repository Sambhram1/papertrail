# PaperTrail MVP Design

## Goal

Build a consumer-friendly web app called PaperTrail that turns messy real-world admin inputs into a clear action plan. The MVP should feel polished, immediately understandable, and buildable in roughly six hours.

The product is not a chatbot. The core transformation is:

- messy input in
- structured next steps out

## Product Scope

### In scope

- Landing page with strong value proposition and before/after framing
- Drag-and-drop upload for images and PDFs
- Paste area for emails, chats, letters, or other text
- Demo examples that work without an API key
- Analysis result with:
  - document type
  - one-line summary
  - plain-English explanation
  - key dates and deadlines
  - action checklist
  - risk level
  - suggested reply
  - extracted entities
- Checklist items that can be marked done in the UI
- Copy-to-clipboard for suggested reply
- Local history using browser storage
- Graceful fallback when extraction or model output is incomplete

### Out of scope

- Authentication
- Multi-user sync
- Payment
- Background job processing
- High-accuracy OCR tuning for noisy photos
- Rich document editing or conversation threads

## User Experience

### Primary promise

Within five seconds, a user should understand that PaperTrail takes confusing life-admin inputs and turns them into a concrete action plan.

### UX principles

- Consumer-first, not enterprise SaaS
- Calm and premium, not sterile
- Strong hierarchy between messy input and clean output
- Not chat-shaped
- Easy to restart with another input
- Useful even when no API key is configured

### Primary flows

#### Flow 1: Paste text

1. User lands on `/`
2. User pastes an email, chat, or document text
3. User taps analyze
4. App transitions into an analyzing state
5. User lands on `/analyze` with structured output
6. User copies reply, checks off tasks, or starts another analysis

#### Flow 2: Upload image or PDF

1. User drops a screenshot, bill, letter, form, or PDF into the intake area
2. App extracts text locally when possible
3. App sends normalized content to the analysis route
4. User receives the same structured result view as text flow

#### Flow 3: Demo mode

1. User picks a sample input on `/`
2. App simulates analysis timing if no OpenAI key is present
3. User sees a polished result without setup friction

#### Flow 4: Revisit history

1. User opens `/history`
2. User sees recent analyses stored in local storage
3. User can reopen a prior result

## Technical Approach

### Recommendation

Use a thin Next.js App Router application with a single server analysis route. Keep the client focused on intake, result rendering, and local history. Keep extraction and model interaction on the server for a more reliable and simple MVP.

### Rationale

- Fastest path to a polished build
- Easier to keep analysis output stable
- Server-side repair logic can hide model inconsistencies
- Demo mode can share the same UI with mocked results

## Architecture

### Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI API for analysis
- Local storage for history and checklist state
- PDF text extraction fallback on the server

### Routes

- `/`
  - landing page
  - upload and paste input
  - sample demo cards
- `/analyze`
  - processing state
  - result cards
- `/history`
  - optional local-only recent analyses
- `/api/analyze`
  - accepts normalized input
  - handles extraction fallback, model call, and response repair

### Logical modules

- `app/(routes)` pages for landing, analyze, and history
- reusable UI components for intake, cards, and state transitions
- analysis utilities for normalization, schema validation, and fallback shaping
- extraction utilities for PDF parsing and basic file handling
- local history utilities for persistence and retrieval
- demo data module for seeded examples and fallback responses

## Data Model

### Analysis input

- source kind: `text`, `image`, `pdf`, or `demo`
- raw text if present
- file metadata if present
- optional extracted text

### Analysis output

- `id`
- `createdAt`
- `title`
- `documentType`
- `oneLineSummary`
- `plainEnglishExplanation`
- `deadlines`
- `actions`
- `riskLevel`
- `risks`
- `suggestedReply`
- `entities`
- `sourcePreview`

### Nested structures

`deadlines` item:

- `label`
- `date`
- `confidence`

`actions` item:

- `id`
- `label`
- `detail`
- `done`
- `priority`

`entities` item:

- `type`
- `value`

## Analysis Pipeline

### Step 1: Intake normalization

Convert pasted text, image uploads, PDF uploads, and demo selections into one normalized server payload.

### Step 2: Extraction

- If the source is text, use the text directly
- If the source is a PDF, attempt local text extraction
- If the source is an image, prefer sending the image plus any available OCR text to the model
- If extraction is weak or partial, continue with best-effort input instead of hard failing

### Step 3: Model analysis

Send normalized content to OpenAI with instructions that frame the job as life-admin action extraction, not open-ended summarization. Require strict JSON output with the exact fields expected by the frontend.

### Step 4: Response repair

If output is missing fields or contains malformed JSON:

- parse defensively
- fill missing arrays with empty arrays
- fill missing strings with a safe placeholder
- downgrade uncertainty into clear “not found” labels rather than crashing

### Step 5: Render and persist

Display the analysis in card format and save the completed result to local history.

## Prompt Design

The model prompt should explicitly optimize for:

- identifying what the document or message is
- extracting obligations, deadlines, and consequences
- translating jargon into plain English
- producing concrete next steps
- drafting a useful, ready-to-send reply

The prompt should explicitly avoid:

- generic abstract summaries
- legal or professional certainty claims beyond the source
- chatty tone
- markdown output

## UI Design

### Visual direction

- Premium consumer utility
- Warm but restrained palette
- Clear before/after transformation storytelling
- Card-based result layout with strong spacing and typography
- Subtle motion for upload, analyzing, and ready states

### Homepage sections

- headline and subhead
- intake zone with drag-and-drop and paste option
- sample messy-input cards
- transformation preview from “chaos” to “action plan”
- trust-building explanation of what gets extracted

### Analyze page sections

- compact source recap
- top summary card
- deadlines card
- action checklist card
- risk card
- suggested reply card with copy button
- entities card
- analyze another entry point

### History page

- recent items list
- document type, summary, and timestamp
- open result action
- empty state when no history exists

## Error Handling

### Missing API key

- automatically switch to demo mode for sample inputs
- show a clear local setup hint for real analysis

### Unsupported or weak input

- show a clear message when a file cannot be processed
- preserve the user’s input so they can retry

### Partial extraction

- continue with partial text and label uncertainty in the result

### Model failure

- return a controlled fallback error state
- never expose raw stack traces or raw model text in the UI

## Persistence

Use browser local storage for:

- recent analyses
- checklist completion state per analysis

No server persistence is required for the MVP.

## Testing Strategy

### Manual verification

- paste text and receive structured output
- upload a PDF with extractable text
- upload a common screenshot image
- analyze sample demo inputs with no API key
- mark checklist items done
- copy suggested reply
- revisit recent analyses in history

### Code-level verification

- utility coverage for response normalization and fallback shaping
- schema validation checks for model output parsing

## Setup

### Environment

- `OPENAI_API_KEY` for real analysis

### Demo fallback

If the API key is absent, the app should still run with seeded examples and a simulated analysis flow so the product can be demoed locally without external setup.

## Delivery Plan

Build in this order:

1. app scaffold and design system foundation
2. landing page and intake UX
3. analysis route and JSON contract
4. result rendering
5. demo mode and sample data
6. local history
7. polish and verification

## Risks and Mitigations

### Risk: extraction quality varies

Mitigation: optimize for common screenshots and text-based PDFs, and use graceful partial-analysis fallbacks rather than chasing perfect OCR.

### Risk: model output is inconsistent

Mitigation: enforce strict JSON and add server-side repair logic.

### Risk: app feels like a chatbot

Mitigation: keep the UI anchored around structured cards, action plans, and copyable outputs instead of a conversation interface.

### Risk: six-hour scope creep

Mitigation: keep persistence local-only, avoid auth, avoid background jobs, and rely on demo mode for smooth first-run experience.
