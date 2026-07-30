import { generateText, Output } from 'ai';
import { worksheetModel } from '@/lib/ai/model';
import { QuestionSchema, type Question } from '@/lib/ai/schema';
import { questionRevisionSystemPrompt, questionRevisionUserPrompt } from '@/lib/ai/prompts';
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
    question,
    instruction,
    targetType: requestedType,
  }: {
    bookId?: string;
    chapterId?: string;
    question: Question;
    instruction: string;
    targetType?: unknown;
  } = await req.json();
  const targetTypeResult = QuestionSchema.shape.type.safeParse(requestedType);
  const targetType = targetTypeResult.success ? targetTypeResult.data : undefined;

  const [book, chapterText] = await Promise.all([
    bookId ? getBook(bookId) : null,
    bookId && chapterId ? getChapterText(bookId, chapterId) : Promise.resolve(''),
  ]);

  if (chapterText.trim().length < LOW_TEXT_THRESHOLD) {
    return Response.json(
      {
        error:
          'This chapter has almost no readable text — it is likely a scanned page. Re-index it or pick another chapter.',
      },
      { status: 422 },
    );
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { output } = await generateText({
        model: worksheetModel,
        output: Output.object({ schema: QuestionSchema }),
        system: questionRevisionSystemPrompt({
          chapterTitle: book?.chapters.find((c) => c.id === chapterId)?.title,
          chapterText,
        }),
        prompt: questionRevisionUserPrompt({ question, instruction, targetType }),
      });

      const parsed = QuestionSchema.safeParse(output);
      if (!parsed.success) throw new Error('schema validation failed');
      if (targetType && parsed.data.type !== targetType) {
        throw new Error(`model returned ${parsed.data.type} instead of ${targetType}`);
      }

      return Response.json({ question: parsed.data });
    } catch (err) {
      console.error(`[worksheet/question] attempt ${attempt} failed:`, err);
    }
  }

  return Response.json(
    { error: 'Could not revise this question. Try again in a moment.' },
    { status: 502 },
  );
}
