import { indexPdf } from '@/lib/indexer';
import { saveIndexedBook } from '@/lib/store';
import { getAppConfig } from '@/lib/config';
import type { Book } from '@/lib/types';

export const maxDuration = 120;

function slugify(name: string) {
  return (
    name
      .replace(/\.pdf$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'book'
  );
}

export async function POST(req: Request) {
  if (!(await getAppConfig())) {
    return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  }
  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return Response.json({ error: 'No file uploaded.' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return Response.json({ error: 'Only PDF files are supported.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let indexed;
  try {
    indexed = await indexPdf(buffer);
  } catch (err) {
    console.error('[upload] indexing failed:', err);
    return Response.json(
      { error: 'Could not read that PDF. It may be encrypted or corrupt.' },
      { status: 422 },
    );
  }

  const id = `${slugify(file.name)}-${Date.now().toString(36)}`;
  const book: Book = {
    id,
    title: file.name.replace(/\.pdf$/i, ''),
    uploadedAt: new Date().toISOString(),
    pageCount: indexed.pageCount,
    chapters: indexed.chapters,
  };
  await saveIndexedBook(book, buffer, indexed.texts);

  return Response.json({ book, method: indexed.method });
}
