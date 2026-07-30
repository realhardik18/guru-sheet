import { createQuickTag, deleteQuickTag, getAppConfig } from '@/lib/config';

export async function POST(request: Request) {
  if (!(await getAppConfig())) return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  try {
    const { name, color } = await request.json();
    return Response.json({ tag: await createQuickTag({ name, color }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not create tag.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await getAppConfig())) return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  const { tagId } = await request.json().catch(() => ({}));
  if (typeof tagId !== 'string') return Response.json({ error: 'Tag not found.' }, { status: 400 });
  await deleteQuickTag(tagId);
  return Response.json({ ok: true });
}
