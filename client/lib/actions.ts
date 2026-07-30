'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getBook, saveChat, getChat } from './store';
import type { Chat } from './types';
import type { Worksheet } from './ai/schema';
import { requireConfiguredPage } from './setup';

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Creates a chat pinned to a chapter, then opens it. */
export async function startChat(formData: FormData) {
  await requireConfiguredPage();
  const bookId = String(formData.get('bookId') ?? '');
  const chapterId = String(formData.get('chapterId') ?? '');

  const book = await getBook(bookId);
  const chapter = book?.chapters.find((c) => c.id === chapterId);

  const chat: Chat = {
    id: newId(),
    title: chapter?.title ?? 'New worksheet',
    bookId: bookId || undefined,
    chapterId: chapterId || undefined,
    createdAt: new Date().toISOString(),
    messages: [],
  };

  await saveChat(chat);
  revalidatePath('/');
  redirect(`/chat/${chat.id}`);
}

/** Persists the transcript and latest worksheet after each exchange. */
export async function persistChat(
  chatId: string,
  messages: Chat['messages'],
  worksheet?: Worksheet,
) {
  await requireConfiguredPage();
  const existing = await getChat(chatId);
  if (!existing) return;
  await saveChat({
    ...existing,
    messages,
    worksheet: worksheet ?? existing.worksheet,
  });
  revalidatePath('/');
}
