import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Warning } from '@phosphor-icons/react/dist/ssr';
import { getBook, getCollection } from '@/lib/store';
import { LOW_TEXT_THRESHOLD } from '@/lib/types';
import { GenerateWorksheetButton } from '@/components/GenerateWorksheetButton';
import { RepairImportedTitlesButton } from '@/components/RepairImportedTitlesButton';
import { requireConfiguredPage } from '@/lib/setup';

export const dynamic = 'force-dynamic';

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  await requireConfiguredPage();
  const { collectionId } = await params;
  const collection = await getCollection(collectionId);
  if (!collection) notFound();

  const loadedBooks = await Promise.all(collection.bookIds.map((id) => getBook(id)));
  const books = loadedBooks.filter((book): book is NonNullable<typeof book> => book !== null);

  return (
    <main className="w-full flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/library" className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#124637] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
        <ArrowLeft size={15} weight="bold" aria-hidden="true" /> Back to library
      </Link>
      <p className="mt-4 text-sm font-medium text-accent">Class {collection.classLevel} · {collection.subject}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{collection.name}</h1>
      <p className="mt-1 text-muted">{books.length} NCERT chapter PDF{books.length === 1 ? '' : 's'} indexed from ZIP files.</p>
      <div className="mt-4"><RepairImportedTitlesButton collectionId={collection.id} /></div>
      {books.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No readable chapter PDFs were imported.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {books.map((book) => {
            const chapter = book.chapters[0];
            const scanned = chapter.charCount < LOW_TEXT_THRESHOLD;
            return (
              <li key={book.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{chapter.title}</div>
                  <div className="mt-0.5 text-sm text-muted">{book.pageCount} pages</div>
                  {scanned && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#b06f1a]">
                      <Warning size={12} weight="bold" aria-hidden="true" />
                      Almost no text — likely a scanned PDF
                    </p>
                  )}
                </div>
                <GenerateWorksheetButton bookId={book.id} chapterId={chapter.id} disabled={scanned} />
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </main>
  );
}
