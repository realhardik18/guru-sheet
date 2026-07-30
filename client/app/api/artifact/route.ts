import { generateText } from 'ai';
import { z } from 'zod';
import { worksheetModel } from '@/lib/ai/model';
import { getBook, getChapterText } from '@/lib/store';
import { getAppConfig } from '@/lib/config';
import { LOW_TEXT_THRESHOLD, type MindMapArtifact, type NotesArtifact, type NotesStyle } from '@/lib/types';

export const maxDuration = 45;

const NotesSchema = z.object({ title: z.string().describe('A concise chapter title.'), sections: z.array(z.object({ heading: z.string(), points: z.array(z.string()).min(1) })).min(1), recap: z.array(z.string()).min(1) });
const MindMapSchema = z.object({
  title: z.string().max(42),
  branches: z.array(z.object({
    label: z.string().max(24),
    children: z.array(z.string().max(36)).min(1).max(4),
  })).min(3).max(6),
});
const JsonEnvelopeSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({ heading: z.string(), points: z.array(z.string()).min(1) })).optional(),
  recap: z.array(z.string()).optional(),
  branches: z.array(z.object({
    label: z.string().max(24),
    children: z.array(z.string().max(36)).min(1).max(4),
  })).optional(),
});

function firstJsonObject(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('model did not return a JSON object');
  return text.slice(start, end + 1);
}

function parseModelJson(text: string) {
  const raw = firstJsonObject(text);
  try {
    return JSON.parse(raw);
  } catch {
    const repaired = raw
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/,\s*"style\\":\\"[^"]+\\"/g, '')
      .replace(/,\s*"style"\s*:\s*"[^"]+"/g, '');
    return JSON.parse(repaired);
  }
}

function normalizeNotes(output: unknown, style: NotesStyle) {
  const envelope = JsonEnvelopeSchema.parse(output);
  const parsed = NotesSchema.parse({
    title: envelope.title,
    sections: envelope.sections,
    recap: envelope.recap,
  });
  return { ...parsed, style };
}

function normalizeMindMap(output: unknown) {
  const envelope = JsonEnvelopeSchema.parse(output);
  return MindMapSchema.parse({
    title: envelope.title,
    branches: envelope.branches,
  });
}

const notesStyleInstruction: Record<NotesStyle, string> = {
  'study-sheet': [
    'Artifact mode: SHORT NOTES. Selected style: STUDY SHEET.',
    'Create a teacher-printable study sheet with clear section headings, short explanatory points and a recap.',
    'Use 4–7 sections. Each section should have 2–5 concise points. Keep points useful for revision, not chatty.',
  ].join('\n'),
  'bullet-summary': [
    'Artifact mode: SHORT NOTES. Selected style: BULLET SUMMARY.',
    'Create the most compact, high-signal bullet summary possible.',
    'Use short fragments instead of paragraphs. Prefer 4–6 sections and 2–4 bullets per section. No long explanations.',
  ].join('\n'),
  'exam-revision': [
    'Artifact mode: SHORT NOTES. Selected style: EXAM REVISION.',
    'Prioritize definitions, key facts, common confusions and exam-ready recall points.',
    'Make bullets easy to memorize and mark. Include only material answerable from the chapter.',
  ].join('\n'),
  'formula-sheet': [
    'Artifact mode: SHORT NOTES. Selected style: FORMULA SHEET.',
    'Prioritize formulas, symbols, units, quantities and how to use them.',
    'If the chapter has no formulas, say that plainly in the notes and summarize related measurable quantities or key terms instead.',
  ].join('\n'),
};

function notesPrompt(style: NotesStyle, instruction?: string, previous?: NotesArtifact | MindMapArtifact) {
  if (!previous) {
    return `Create the initial ${style.replaceAll('-', ' ')} notes artifact. Return one valid JSON object only. The JSON must have exactly these top-level keys: title, sections, recap. Do not include style. Do not wrap the JSON in markdown.`;
  }
  return [
    `Revise the existing ${style.replaceAll('-', ' ')} notes artifact.`,
    'Keep artifact mode as SHORT NOTES. Do not convert it into a worksheet, question paper or mind map.',
    `Teacher request: ${instruction?.trim() || 'Improve the notes while preserving the selected style.'}`,
    'Existing notes JSON:',
    JSON.stringify(previous),
    'Return one valid JSON object only. The JSON must have exactly these top-level keys: title, sections, recap. Do not include style. Do not wrap the JSON in markdown.',
  ].join('\n');
}

function mindMapPrompt(instruction?: string, previous?: NotesArtifact | MindMapArtifact) {
  if (!previous) {
    return 'Create the initial mind map artifact with compact labels only. Return one valid JSON object only. The JSON must have exactly these top-level keys: title, branches. Do not wrap the JSON in markdown.';
  }
  return [
    'Revise the existing mind map artifact.',
    'Keep artifact mode as MIND MAP. Do not convert it into notes, bullet points or a worksheet.',
    'Preserve strict short-label limits: title ≤ 42 characters, branch label ≤ 24 characters, child concept ≤ 36 characters.',
    `Teacher request: ${instruction?.trim() || 'Improve the mind map while preserving the radial structure.'}`,
    'Existing mind map JSON:',
    JSON.stringify(previous),
    'Return one valid JSON object only. The JSON must have exactly these top-level keys: title, branches. Do not wrap the JSON in markdown.',
  ].join('\n');
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  if (!(await getAppConfig())) return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  const body: { bookId?: string; chapterId?: string; type?: 'notes' | 'mindmap'; style?: NotesStyle; instruction?: string; previous?: NotesArtifact | MindMapArtifact } = await req.json();
  const [book, chapterText] = await Promise.all([body.bookId ? getBook(body.bookId) : null, body.bookId && body.chapterId ? getChapterText(body.bookId, body.chapterId) : Promise.resolve('')]);
  const loadedSourceAt = Date.now();
  if (chapterText.trim().length < LOW_TEXT_THRESHOLD) return Response.json({ error: 'This chapter has almost no readable text to generate from.' }, { status: 422 });
  const chapterTitle = book?.chapters.find((chapter) => chapter.id === body.chapterId)?.title ?? 'this chapter';
  // Notes and maps need a chapter overview, not the full source sent to a
  // worksheet generator. Keeping this bounded avoids slow provider requests.
  const source = `Use only the chapter text below. Never invent facts. Keep the result concise and classroom-printable.\n\n--- CHAPTER: ${chapterTitle} ---\n${chapterText.slice(0, 24000)}\n--- END CHAPTER ---`;
  try {
    if (body.type === 'mindmap') {
      const { text } = await generateText({ model: worksheetModel, system: `${source}\nArtifact mode: MIND MAP. Create a clean, printable radial mind map. Keep every label very short so it fits without overlap: title ≤ 42 characters, each branch label ≤ 24 characters, and each child concept ≤ 36 characters. Use phrases, not sentences; no explanations, clauses, or punctuation-heavy text. Return 3–6 distinct branches with 1–4 children each. Never return notes, bullets-only notes, questions, answers or marks.`, prompt: mindMapPrompt(body.instruction, body.previous) });
      const output = normalizeMindMap(parseModelJson(text));
      console.info('[artifact] generated mindmap', { initial: !body.previous, sourceMs: loadedSourceAt - startedAt, modelMs: Date.now() - loadedSourceAt, chars: chapterText.length });
      return Response.json({ artifact: output });
    }
    const style = body.style ?? 'study-sheet';
    const { text } = await generateText({ model: worksheetModel, system: `${source}\n${notesStyleInstruction[style]}\nNever return a worksheet, mind map, questions, answers or marks. Return only strict JSON with double-quoted keys and strings. Do not include a style key. Avoid quotation marks inside content strings; use parentheses or commas instead.`, prompt: notesPrompt(style, body.instruction, body.previous) });
    const output = normalizeNotes(parseModelJson(text), style);
    console.info('[artifact] generated notes', { style, initial: !body.previous, sourceMs: loadedSourceAt - startedAt, modelMs: Date.now() - loadedSourceAt, chars: chapterText.length });
    return Response.json({ artifact: output });
  } catch (error) {
    console.error('[artifact] generation failed:', error);
    const message = error instanceof Error ? error.message : 'The model returned an unknown error.';
    return Response.json({ error: `Artifact generation failed: ${message}` }, { status: 503 });
  }
}
