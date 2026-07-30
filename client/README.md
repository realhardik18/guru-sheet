# GuruSheet

Turn a textbook chapter into a print-ready, difficulty-tiered worksheet.

One teacher, thirty-six children, five reading levels. Teaching at the Right
Level (TaRL) is a proven intervention, but it dies on the material bottleneck:
nobody has time to write three versions of every worksheet. GuruSheet removes
that bottleneck. **Chat is the remote control; the printed A4 page is the
product.**

It runs entirely on your own machine. PDFs, indexed chapter text, chat
history, and generated worksheets are all stored in a local folder you choose
— nothing is uploaded anywhere except the text sent to the model provider to
generate a worksheet.

## What it does

- **Upload or bulk-import textbook PDFs.** Drop in a single PDF, or point it
  at a folder of NCERT ZIP files and it indexes every chapter PDF inside them.
- **Splits books into chapters automatically** using the PDF's own outline,
  then a heading regex, then falls back to treating the whole file as one
  chapter — never by asking a model to guess.
- **Chat-driven worksheet generation.** Describe what you need ("20-minute
  worksheet, three levels, no calculator") and GuruSheet writes a
  difficulty-tiered worksheet (below / at / stretch) grounded only in that
  chapter's text — no invented facts.
- **Per-question editing.** Click any question on the sheet to make it
  harder, make it easier, or type your own instruction ("turn this into a
  word problem") — only that question is regenerated, everything else stays
  put.
- **Page citations.** Where available, each question shows the book page it
  was drawn from, so you can flip straight to the source.
- **Print-ready output.** The worksheet is styled to look like an actual
  class handout — name/class/date fields, a score box, bubbled MCQ options,
  tiered sections — and prints cleanly to one A4 page via the browser's own
  Print dialog (Print → Save as PDF works too).

## Prerequisites

- **Node.js 18.18+** (LTS recommended)
- An API provider: OpenRouter, Gemini, or a local Ollama server.

## Quick start

```bash
cd client
npm install
cp .env.example .env.local
# Edit .env.local: choose AI_PROVIDER and add that provider's key.
npm run smoke   # verifies the model responds AND returns schema-valid objects
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run smoke` is the gate — run it before anything else. It checks two
things: that the provider responds at all, and that structured output
validates against the worksheet schema. If the second check fails, worksheet
generation will not work; the script prints a fallback model to try.

## First-run setup

On first launch GuruSheet asks for:

1. **Your name** — shown in the dashboard greeting.
2. **An existing, absolute parent folder** — e.g. `/Users/you/Documents`.

It creates a `Guru Sheet/` folder inside that parent, with `books/`,
`chats/`, and `collections/` subfolders, and remembers the choice in
`guru-sheet.config.json` (in the project root, gitignored — this file is
machine-local, not something you commit or share). Every PDF, index, chat,
and worksheet lives inside that chosen `Guru Sheet/` folder from then on.

To reconfigure (change the teacher name or move the library), edit or delete
`guru-sheet.config.json` and restart — deleting it re-triggers first-run
setup, but does **not** delete your existing `Guru Sheet/` data folder.

## Using it

**Add books** — in *Library*, either:
- Drag a single textbook PDF onto the upload dropzone, or
- Use **Import NCERT ZIP folder**: point it at a folder containing NCERT ZIP
  files, name the collection, pick a class and subject. GuruSheet recurses
  into the ZIPs, indexes every PDF inside as one chapter, and names each
  chapter from its first page (falling back to the filename).

**Generate a worksheet** — open a book, click **Generate** on a chapter
(disabled if the chapter has almost no extractable text — likely a scanned
page), then describe what you want in the chat panel. The worksheet renders
on the right as it's built.

**Refine a single question** — click any question on the sheet. An inline
editor appears with **Easier** / **Harder** buttons and a free-text box for
your own instruction. Only that question is rewritten; marks are
recalculated automatically.

**Print** — click **Print** and use your browser's print dialog. The layout
is tuned for one clean A4 page per worksheet, Name/Class/Date fields
included, ready to photocopy.

## Configuration & data layout

| Location | Purpose |
|---|---|
| `client/.env.local` | `AI_PROVIDER` plus `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, or local Ollama settings — never committed |
| `client/guru-sheet.config.json` | Machine-local: teacher name + chosen data folder path. Gitignored. |
| `<your folder>/Guru Sheet/books/` | Uploaded/imported PDFs + extracted chapter text |
| `<your folder>/Guru Sheet/chats/` | Chat history and saved worksheets, one JSON file per chat |
| `<your folder>/Guru Sheet/collections/` | NCERT ZIP imports, grouped by collection |

`client/data/` is bundled demo content (a sample Class 8 Science book and a
couple of seed chats) used only before first-run setup completes. Once you
configure a real data folder, it's no longer read.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at `localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run smoke` | Verify the model provider works before touching anything else |

## Architecture

Two model routes on purpose — streamed prose and structured output don't mix:

| Path | What |
|---|---|
| `lib/ai/model.ts` | The **only** file that names an inference provider. Swapping providers, or moving inference on-device, is a one-line change here. |
| `lib/ai/schema.ts` | Zod contract for a worksheet — tiers, marks, misconceptions, page citations |
| `lib/ai/prompts.ts` | System prompts. Chapter text always goes in the *system* prompt, never a user message |
| `lib/ai/fallback.ts` | A hardcoded, schema-valid worksheet served if the model fails twice in a row |
| `lib/config.ts` | First-run setup and the Guru Sheet data-home config |
| `lib/store.ts` | Every disk read/write, scoped to the configured Guru Sheet folder |
| `lib/indexer.ts` | PDF → chapters: outline, then headings, then whole-book. Embeds `[[page N]]` markers so questions can cite a source page |
| `app/api/chat` | Streaming prose for the chat panel |
| `app/api/worksheet` | Structured worksheet generation/regeneration |
| `app/api/worksheet/question` | Structured single-question revision (Easier / Harder / custom instruction) |
| `components/Worksheet.tsx` | The component that actually gets printed |

Chapter boundaries are found structurally, never by asking the model — a
model split is slow, and a wrong one stays invisible until the worksheet
comes out subtly wrong.

## Inference

Today it runs on `google/gemma-4-26b-a4b-it:free` via OpenRouter — hosted,
not local. Model choice isn't arbitrary: the more obvious pick
(`gemma-4-31b-it:free`) doesn't advertise `structured_outputs` on OpenRouter,
which is exactly what `/api/worksheet` depends on. The 26b-a4b variant does,
and is free. If it ever stops working, `google/gemma-4-31b-it` (paid, roughly
cents/day) is a drop-in replacement in `lib/ai/model.ts`.

## Things that will bite you

- **Scanned chapters.** A chapter with fewer than 500 extracted characters is
  treated as a scanned image, not text. The library flags it, the Generate
  button is disabled, and `/api/worksheet` returns 422 if you get around
  that. Both use the same threshold on purpose.
- **Structured output occasionally fails** (roughly 1 call in 10 on the free
  tier). The route retries once, then serves a known-good fallback worksheet
  with a visible notice — it never shows a hard error.
- **Marks are recomputed server-side.** The model is unreliable at
  arithmetic, so `totalMarks` is always the actual sum of the individual
  question marks.
- **Page citations only appear for newly indexed books.** They rely on
  `[[page N]]` markers embedded at indexing time; books indexed before that
  feature existed won't have them, and the model is instructed to omit the
  citation rather than guess.
- **Print is the deliverable.** Verify with an actual Print → Save as PDF,
  not just the on-screen preview.
