import { notFound } from 'next/navigation';
import { getChat, getBook } from '@/lib/store';
import { ChatWorkspace } from '@/components/ChatWorkspace';
import { requireConfiguredPage } from '@/lib/setup';

export const dynamic = 'force-dynamic';

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  await requireConfiguredPage();
  const { chatId } = await params;
  const { version } = await searchParams;
  const chat = await getChat(chatId);
  if (!chat) notFound();

  const book = chat.bookId ? await getBook(chat.bookId) : null;
  const chapter = book?.chapters.find((c) => c.id === chat.chapterId);

  const chapterLabel = chapter
    ? `${book?.title} · ${chapter.title} (pp. ${chapter.startPage}–${chapter.endPage})`
    : 'No chapter selected';

  return <ChatWorkspace chat={chat} chapterLabel={chapterLabel} initialVersionId={version} />;
}
