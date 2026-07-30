import { generateText, Output } from 'ai';
import { worksheetModel } from '@/lib/ai/model';
import { WorksheetSchema, type Worksheet } from '@/lib/ai/schema';
import { worksheetSystemPrompt, worksheetUserPrompt } from '@/lib/ai/prompts';
import { FALLBACK_WORKSHEET } from '@/lib/ai/fallback';
import { getBook, getChapterText } from '@/lib/store';
import { LOW_TEXT_THRESHOLD } from '@/lib/types';
import { getAppConfig } from '@/lib/config';

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await getAppConfig())) {
    return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  }
  const {
    bookId,
    chapterId,
    instruction,
    previous,
  }: {
    bookId?: string;
    chapterId?: string;
    instruction: string;
    previous?: Worksheet;
  } = await req.json();

  const [book, chapterText] = await Promise.all([
    bookId ? getBook(bookId) : null,
    bookId && chapterId ? getChapterText(bookId, chapterId) : Promise.resolve(''),
  ]);

  // Same threshold the library UI uses to disable the button. If these two ever
  // disagree, the API wins and generates confident nonsense about page furniture.
  if (chapterText.trim().length < LOW_TEXT_THRESHOLD) {
    return Response.json(
      {
        error:
          'This chapter has almost no readable text — it is likely a scanned page. Re-index it or pick another chapter.',
      },
      { status: 422 },
    );
  }

  // The free tier occasionally returns output that won't parse (roughly one call
  // in ten). One retry clears almost all of those; the fallback covers the rest.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { output } = await generateText({
        model: worksheetModel,
        output: Output.object({ schema: WorksheetSchema }),
        system: worksheetSystemPrompt({
          chapterTitle: book?.chapters.find((c) => c.id === chapterId)?.title,
          chapterText,
        }),
        prompt: worksheetUserPrompt({ instruction, previous }),
      });

      const parsed = WorksheetSchema.safeParse(output);
      if (!parsed.success) throw new Error('schema validation failed');

      // The model is unreliable at arithmetic; the printed total must be right.
      const worksheet = {
        ...parsed.data,
        totalMarks: parsed.data.questions.reduce((sum, q) => sum + q.marks, 0),
      };

      return Response.json({ worksheet, fallback: false });
    } catch (err) {
      console.error(`[worksheet] attempt ${attempt} failed:`, err);
    }
  }

  // Rate limit, timeout, or malformed output twice over. Serve the known-good
  // sheet rather than an error state — the demo keeps moving.
  console.error('[worksheet] serving fallback');
  return Response.json({ worksheet: FALLBACK_WORKSHEET, fallback: true });
}
