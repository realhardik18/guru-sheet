'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getBook, saveChat, getChat } from './store';
import type { Chat, WorksheetVersion, WorksheetVersionSettings } from './types';
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

  const book = await getBook(bookId);
  const chapter = book?.chapters.find((c) => c.id === chapterId);

  let settings: WorksheetVersionSettings[] = [{ questionCount: 10, format: 'balanced' }];
  try {
    const parsed = JSON.parse(String(formData.get('versionPlans') ?? '')) as unknown;
    if (Array.isArray(parsed) && parsed.length >= 1 && parsed.length <= 3) {
      const valid = parsed.every((item) => {
        const plan = item as Partial<WorksheetVersionSettings>;
        return Number.isInteger(plan.questionCount) && plan.questionCount! >= 5 && plan.questionCount! <= 25 &&
          ['balanced', 'more-mcqs', 'more-written'].includes(String(plan.format)) &&
          (plan.difficulty == null || ['easier', 'challenge'].includes(String(plan.difficulty)));
      });
      if (valid) settings = parsed as WorksheetVersionSettings[];
    }
  } catch { /* Use the sensible default when a stale form submits. */ }
  const worksheetVersions: WorksheetVersion[] = settings.map((setting, index) => ({
    id: `v${index + 1}`,
    label: `Version ${index + 1}`,
    settings: setting,
  }));

  const chat: Chat = {
    id: newId(),
    title: defaultChatTitle(chapter?.title),
    bookId: bookId || undefined,
    chapterId: chapterId || undefined,
    createdAt: new Date().toISOString(),
    messages: [],
    worksheetVersions,
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
) {
  await requireConfiguredPage();
  const existing = await getChat(chatId);
  if (!existing) return;
  await saveChat({
    ...existing,
    messages,
    worksheetVersions: worksheetVersions ?? existing.worksheetVersions,
    // Keep legacy consumers and existing saved data interoperable.
    worksheet: worksheetVersions?.find((version) => version.worksheet)?.worksheet ?? existing.worksheet,
  });
  revalidatePath('/');
}
