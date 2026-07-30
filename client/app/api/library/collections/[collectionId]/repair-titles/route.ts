import { repairCollectionTitles } from '@/lib/store';

export async function POST(_: Request, { params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  return Response.json({ updated: await repairCollectionTitles(collectionId) });
}
