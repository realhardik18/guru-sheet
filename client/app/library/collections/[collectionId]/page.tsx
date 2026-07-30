import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkle, Warning } from '@phosphor-icons/react/dist/ssr';
import { getBook, getCollection } from '@/lib/store';
import { LOW_TEXT_THRESHOLD } from '@/lib/types';
import { startChat } from '@/lib/actions';
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
    <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-5 py-10">
      <Link href="/library" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} aria-hidden="true" /> Library
      </Link>
      <p className="mt-4 text-sm font-medium text-accent">Class {collection.classLevel} · {collection.subject}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{collection.name}</h1>
      <p className="mt-1 text-muted">{books.length} NCERT chapter PDF{books.length === 1 ? '' : 's'} indexed from ZIP files.</p>
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
                  <div className="mt-0.5 text-sm text-muted">{book.pageCount} pages · {chapter.charCount.toLocaleString()} chars</div>
                  {scanned && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#b06f1a]">
                      <Warning size={12} weight="bold" aria-hidden="true" />
                      Almost no text — likely a scanned PDF
                    </p>
                  )}
                </div>
                <form action={startChat}>
                  <input type="hidden" name="bookId" value={book.id} />
                  <input type="hidden" name="chapterId" value={chapter.id} />
                  <button type="submit" disabled={scanned} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-40">
                    <Sparkle size={14} weight="bold" aria-hidden="true" />
                    Generate
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
