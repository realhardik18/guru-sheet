import { generateText, Output } from 'ai';
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

export async function POST(req: Request) {
  if (!(await getAppConfig())) return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  const body: { bookId?: string; chapterId?: string; type?: 'notes' | 'mindmap'; style?: NotesStyle; instruction?: string; previous?: NotesArtifact | MindMapArtifact } = await req.json();
  const [book, chapterText] = await Promise.all([body.bookId ? getBook(body.bookId) : null, body.bookId && body.chapterId ? getChapterText(body.bookId, body.chapterId) : Promise.resolve('')]);
  if (chapterText.trim().length < LOW_TEXT_THRESHOLD) return Response.json({ error: 'This chapter has almost no readable text to generate from.' }, { status: 422 });
  const chapterTitle = book?.chapters.find((chapter) => chapter.id === body.chapterId)?.title ?? 'this chapter';
  // Notes and maps need a chapter overview, not the full source sent to a
  // worksheet generator. Keeping this bounded avoids slow provider requests.
  const source = `Use only the chapter text below. Never invent facts. Keep the result concise and classroom-printable.\n\n--- CHAPTER: ${chapterTitle} ---\n${chapterText.slice(0, 24000)}\n--- END CHAPTER ---`;
  try {
    if (body.type === 'mindmap') {
      const { output } = await generateText({ model: worksheetModel, output: Output.object({ schema: MindMapSchema }), system: `${source}\nCreate a clean, printable radial mind map. Keep every label very short so it fits without overlap: title ≤ 42 characters, each branch label ≤ 24 characters, and each child concept ≤ 36 characters. Use phrases, not sentences; no explanations, clauses, or punctuation-heavy text. Return 3–6 distinct branches with 1–4 children each.`, prompt: body.previous ? `Revise this mind map using this request while preserving the strict short-label limits.\n${body.instruction}\n${JSON.stringify(body.previous)}` : 'Create the initial mind map with compact labels only.' });
      return Response.json({ artifact: output });
    }
    const style = body.style ?? 'study-sheet';
    const styleInstruction: Record<NotesStyle, string> = { 'study-sheet': 'Organize key ideas into an easy study sheet with a recap.', 'bullet-summary': 'Use the most compact, high-signal bullet summary possible.', 'exam-revision': 'Prioritize definitions, key facts, and exam-ready recall points.', 'formula-sheet': 'Prioritize formulas, symbols, units, and how to use them. If the chapter has no formulas, say so plainly and summarize related quantities.' };
    const { output } = await generateText({ model: worksheetModel, output: Output.object({ schema: NotesSchema }), system: `${source}\n${styleInstruction[style]}`, prompt: body.previous ? `Revise these notes using this request: ${body.instruction}\n${JSON.stringify(body.previous)}` : 'Create the initial notes.' });
    return Response.json({ artifact: { ...output, style } });
  } catch (error) {
    console.error('[artifact] generation failed:', error);
    const message = error instanceof Error ? error.message : 'The model returned an unknown error.';
    return Response.json({ error: `Artifact generation failed: ${message}` }, { status: 503 });
  }
}
