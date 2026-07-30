import {
  streamText,
  convertToModelMessages,
  toUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';
import { worksheetModel } from '@/lib/ai/model';
import { chatSystemPrompt } from '@/lib/ai/prompts';
import { getBook, getChapterText } from '@/lib/store';
import { getAppConfig } from '@/lib/config';

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await getAppConfig())) {
    return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  }
  const {
    messages,
    bookId,
    chapterId,
    artifactType,
    notesStyle,
  }: { messages: UIMessage[]; bookId?: string; chapterId?: string; artifactType?: 'worksheet' | 'notes' | 'mindmap'; notesStyle?: 'study-sheet' | 'bullet-summary' | 'exam-revision' | 'formula-sheet' } =
    await req.json();

  const [book, chapterText] = await Promise.all([
    bookId ? getBook(bookId) : null,
    bookId && chapterId ? getChapterText(bookId, chapterId) : Promise.resolve(''),
  ]);

  const result = streamText({
    model: worksheetModel,
    system: chatSystemPrompt({
      bookTitle: book?.title,
      chapterTitle: book?.chapters.find((c) => c.id === chapterId)?.title,
      chapterText,
      artifactType,
      notesStyle,
    }),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
