import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { getBook, getCollection } from '@/lib/store';
import { CollectionChapterList } from '@/components/CollectionChapterList';
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
      {books.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No readable chapter PDFs were imported.</p>
      ) : (
        <CollectionChapterList books={books} />
      )}
      </div>
    </main>
  );
}
