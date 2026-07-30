'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getBook, saveChat, getChat } from './store';
import type { ArtifactType, Chat, NotesStyle, WorksheetVersion, WorksheetVersionSettings } from './types';
import { requireConfiguredPage } from './setup';

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultChatTitle(chapterTitle?: string) {
  const title = (chapterTitle ?? 'New worksheet')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return title || 'New worksheet';
}

/** Creates a chat pinned to a chapter, then opens it. */
export async function startChat(formData: FormData) {
  await requireConfiguredPage();
  const bookId = String(formData.get('bookId') ?? '');
  const chapterId = String(formData.get('chapterId') ?? '');
  const requestedType = String(formData.get('artifactType') ?? 'worksheet');
  const artifactType: ArtifactType = requestedType === 'notes' || requestedType === 'mindmap' ? requestedType : 'worksheet';
  const requestedNotesStyle = String(formData.get('notesStyle') ?? 'study-sheet');
  const notesStyle: NotesStyle = ['study-sheet', 'bullet-summary', 'exam-revision', 'formula-sheet'].includes(requestedNotesStyle)
    ? requestedNotesStyle as NotesStyle : 'study-sheet';

  const book = await getBook(bookId);
  const chapter = book?.chapters.find((c) => c.id === chapterId);

  let settings: WorksheetVersionSettings = { questionCount: 10, format: 'balanced' };
  try {
    const plan = JSON.parse(String(formData.get('worksheetSettings') ?? '')) as Partial<WorksheetVersionSettings>;
    const valid = Number.isInteger(plan.questionCount) && plan.questionCount! >= 5 && plan.questionCount! <= 25 && ['balanced', 'more-mcqs', 'more-written'].includes(String(plan.format)) && (plan.difficulty == null || ['easier', 'challenge'].includes(String(plan.difficulty)));
    if (valid) settings = plan as WorksheetVersionSettings;
  } catch { /* Use the sensible default when a stale form submits. */ }
  const worksheetVersions: WorksheetVersion[] = [{ id: 'v1', label: 'Worksheet', settings }];

  const chat: Chat = {
    id: newId(),
    title: defaultChatTitle(chapter?.title),
    bookId: bookId || undefined,
    chapterId: chapterId || undefined,
    createdAt: new Date().toISOString(),
    messages: [],
    artifactType,
    notesStyle: artifactType === 'notes' ? notesStyle : undefined,
    worksheetVersions: artifactType === 'worksheet' ? worksheetVersions : undefined,
  };

  await saveChat(chat);
  revalidatePath('/');
  redirect(`/chat/${chat.id}`);
}

/** Persists the transcript and latest worksheet after each exchange. */
export async function persistChat(
  chatId: string,
  messages: Chat['messages'],
  worksheetVersions?: WorksheetVersion[],
  artifact?: Pick<Chat, 'notes' | 'mindMap'>,
) {
  await requireConfiguredPage();
  const existing = await getChat(chatId);
  if (!existing) return;
  await saveChat({
    ...existing,
    messages,
    worksheetVersions: worksheetVersions ?? existing.worksheetVersions,
    notes: artifact?.notes ?? existing.notes,
    mindMap: artifact?.mindMap ?? existing.mindMap,
    // Keep legacy consumers and existing saved data interoperable.
    worksheet: worksheetVersions?.find((version) => version.worksheet)?.worksheet ?? existing.worksheet,
  });
  revalidatePath('/');
}
