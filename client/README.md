# GuruSheet

Turn a textbook chapter into a print-ready, difficulty-tiered worksheet.

One teacher, thirty-six children, five reading levels. Teaching at the Right
Level (TaRL) is a proven intervention, but it dies on the material bottleneck:
nobody has time to write three versions of every worksheet. This removes that
bottleneck. **Chat is the remote control; the A4 page is the product.**

## Run it

```bash
cd client
npm install
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env.local
npm run smoke   # verifies the model answers AND returns schema-valid objects
npm run dev
```

On first launch, GuruSheet asks for the teacher's name and an existing absolute
parent folder. It creates `Guru Sheet/books` and `Guru Sheet/chats` there, then
stores the machine-local config in `guru-sheet.config.json`. PDFs, indexes, and
chat history live only in that chosen Guru Sheet folder. The old `data/` demo
folder is not used after setup.

## NCERT ZIP imports

In **Library**, choose **Import NCERT ZIP folder**, select a folder containing
NCERT ZIP files, and enter the collection name, class, and subject. GuruSheet
recursively finds ZIP files, indexes each PDF inside them as one chapter, and
uses the first page to name that chapter (falling back to the PDF filename).
It keeps both the original ZIPs and extracted chapter PDFs in the configured
Guru Sheet data home.

`npm run smoke` is the gate. It checks two things: that the provider responds at
all, and that structured output validates against the worksheet schema. If the
second check fails, nothing downstream will work — fix it before anything else.

## The demo path

Dashboard → Library → *Science — Class 8* → **Generate** on a chapter → ask for a
worksheet → it renders on the right → **Print**. Then ask *"make question 3
easier"* and watch that one question change while the rest stay put.

## Inference

Every model call goes through `lib/ai/model.ts`. Nothing else in the codebase
names a provider, so moving inference on-device is a one-line change there.

Today it runs on `google/gemma-4-26b-a4b-it:free` via OpenRouter — hosted, not
local. **Say so if asked.** The honest framing: *inference sits behind one
interface; today it's hosted, the local path is a provider swap, and the
architecture was built for it.* Don't stage an unplug-the-wifi beat while calling
a hosted API.

Model choice is not arbitrary. The obvious pick, `gemma-4-31b-it:free`, does
**not** advertise `structured_outputs` on OpenRouter, which is exactly the
capability `/api/worksheet` depends on. The 26b-a4b variant does, and is also
free. If it ever stops working, `google/gemma-4-31b-it` (paid, ~cents/day) is the
drop-in.

## Layout

| Path | What |
|---|---|
| `lib/ai/model.ts` | The only file naming a provider |
| `lib/ai/schema.ts` | Zod worksheet contract — tiers, marks, misconceptions |
| `lib/ai/prompts.ts` | System prompts. Chapter text goes in *system*, never user |
| `lib/ai/fallback.ts` | Hardcoded schema-valid sheet for when the model dies on stage |
| `lib/config.ts` | First-run config and Guru Sheet data-home setup |
| `lib/store.ts` | Every disk read/write under the configured Guru Sheet folder |
| `lib/indexer.ts` | PDF → chapters: outline, then headings, then whole-book |
| `app/api/chat` | Streaming prose for the left panel |
| `app/api/worksheet` | Structured object for the right panel |
| `components/Worksheet.tsx` | The thing that actually gets printed |

Two model routes on purpose: streamed prose and structured output do not mix.

Chapter boundaries are found structurally, never by asking the model — a model
split is slow, and a wrong one stays invisible until the worksheet comes out
subtly wrong.

## Things that will bite you

- **Scanned chapters.** A chapter under 500 characters is a scanned image, not
  text. The library flags it, the Generate button is disabled, and
  `/api/worksheet` returns 422. Both use the same threshold on purpose — when
  they disagreed, the model confidently wrote questions about figure numbers.
- **Structured output fails roughly 1 call in 10** on the free tier. The route
  retries once, then serves `FALLBACK_WORKSHEET` with `fallback: true` and the UI
  shows a notice. It never shows an error state.
- **Marks are recomputed server-side.** The model cannot reliably add up.
- **Print is the deliverable.** Verify with real Print-to-PDF, not the on-screen
  preview. The worksheet lands on one A4 page; the answer key breaks onto its own.
