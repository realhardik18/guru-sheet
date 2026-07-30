import { getAppConfig } from '@/lib/config';
import { deleteChat, renameChat, updateChatTags } from '@/lib/store';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  if (!(await getAppConfig())) return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  const { title, tagIds } = await request.json().catch(() => ({}));
  const { chatId } = await params;
  if (Array.isArray(tagIds)) {
    const allowed = new Set((await getAppConfig())?.quickTags?.map((tag) => tag.id) ?? []);
    const cleanTagIds = [...new Set(tagIds.filter((id): id is string => typeof id === 'string' && allowed.has(id)))];
    if (!(await updateChatTags(chatId, cleanTagIds))) return Response.json({ error: 'Chat not found.' }, { status: 404 });
    return Response.json({ ok: true });
  }
  const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 120) : '';
  if (!cleanTitle) return Response.json({ error: 'Enter a chat name.' }, { status: 400 });
  if (!(await renameChat(chatId, cleanTitle))) return Response.json({ error: 'Chat not found.' }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  if (!(await getAppConfig())) return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  const { chatId } = await params;
  await deleteChat(chatId);
  return Response.json({ ok: true });
}
