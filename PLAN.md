# GuruSheet — Remaining Plan

## Required before submission

- [x] Add a 1–2 minute demo video link to the root README.
- [ ] Confirm the final team name; update the README if it differs from **GuruSheet**.

## Recommended polish

- [ ] Test one complete flow with a real NCERT ZIP: import → generate → revise → export PDF.
- [ ] Test a local Ollama configuration and document the exact model/setup used if on-device inference is part of the demo.
- [ ] Add a clear user-facing privacy note: source books and saved work stay local; only chapter text is sent to the selected model provider when using hosted inference.
- [ ] Verify the app at laptop and small-screen widths.
- [ ] Create a short judge-facing demo script focused on the classroom problem, Gemma's structured generation, and the print-ready result.

## Known limitation

- `ChatWorkspace.tsx` currently imports the deleted `StudyArtifacts.tsx` component. Until that import is removed or replaced, the production build will not complete.

## Completed

- [x] Root project README
- [x] MIT License
- [x] PDF/NCERT import flow
- [x] Worksheets, short notes, mind maps, tags, and PDF export workflow
