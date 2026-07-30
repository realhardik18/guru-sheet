import { getAppConfig } from '@/lib/config';
import { deleteCollection } from '@/lib/store';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  if (!(await getAppConfig())) {
    return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  }

  const { collectionId } = await params;
  const deleted = await deleteCollection(collectionId);
  if (!deleted) return Response.json({ error: 'Collection not found.' }, { status: 404 });

  return Response.json({ ok: true });
}
