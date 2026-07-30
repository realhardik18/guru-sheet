import { getBookPdf } from '@/lib/store';

export async function GET(_: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const pdf = await getBookPdf(bookId);
  if (!pdf) return Response.json({ error: 'Original PDF is unavailable.' }, { status: 404 });
  return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' } });
}
