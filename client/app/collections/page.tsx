import Link from 'next/link';
import { BookOpenText, FolderOpen, Warning } from '@phosphor-icons/react/dist/ssr';
import { listBooks, listCollections } from '@/lib/store';
import { LOW_TEXT_THRESHOLD } from '@/lib/types';
import { DeleteCollectionButton } from '@/components/DeleteCollectionButton';
import { requireConfiguredPage } from '@/lib/setup';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  await requireConfiguredPage();
  const [books, collections] = await Promise.all([listBooks(), listCollections()]);
  const individualBooks = books.filter((book) => !book.collectionId);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-5 py-10">
      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <FolderOpen size={24} className="text-accent" aria-hidden="true" />
        Collections
      </h1>
      <p className="mt-1 text-muted">Your indexed books and chapter collections.</p>

      {collections.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted"><FolderOpen size={16} aria-hidden="true" /> NCERT collections</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {collections.map((collection) => (
              <li key={collection.id}>
                <div className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent">
                  <Link href={`/library/collections/${collection.id}`} className="block">
                    <p className="text-sm font-medium text-accent">Class {collection.classLevel} · {collection.subject}</p>
                    <h3 className="mt-1 flex items-center gap-1.5 font-semibold"><FolderOpen size={16} className="shrink-0 text-muted" aria-hidden="true" />{collection.name}</h3>
                    <p className="mt-1 text-sm text-muted">{collection.bookIds.length} chapter PDF{collection.bookIds.length === 1 ? '' : 's'} indexed</p>
                  </Link>
                  <DeleteCollectionButton collectionId={collection.id} collectionName={collection.name} bookCount={collection.bookIds.length} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {individualBooks.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted"><BookOpenText size={16} aria-hidden="true" /> Individual uploads</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {individualBooks.map((book) => {
              const flagged = book.chapters.filter((chapter) => chapter.charCount < LOW_TEXT_THRESHOLD).length;
              return <li key={book.id}><Link href={`/library/${book.id}`} className="block h-full rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent">
                <h3 className="flex items-center gap-1.5 font-semibold"><BookOpenText size={16} className="shrink-0 text-muted" aria-hidden="true" />{book.title}</h3>
                <p className="mt-1 text-sm text-muted">{book.chapters.length} chapters · {book.pageCount} pages</p>
                <ul className="mt-3 space-y-1 text-sm">{book.chapters.slice(0, 4).map((chapter) => <li key={chapter.id} className="flex gap-2 text-muted"><span className="truncate">{chapter.title}</span><span className="ml-auto shrink-0 tabular-nums">pp. {chapter.startPage}–{chapter.endPage}</span></li>)}</ul>
                {flagged > 0 && <p className="mt-3 flex items-center gap-1.5 text-xs text-[#b06f1a]"><Warning size={13} weight="bold" aria-hidden="true" />{flagged} chapter{flagged > 1 ? 's' : ''} with almost no text — likely scanned</p>}
              </Link></li>;
            })}
          </ul>
        </section>
      )}

      {collections.length === 0 && individualBooks.length === 0 && (
        <section className="mt-16 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface px-6 text-center">
          <FolderOpen size={34} className="text-accent" weight="duotone" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">Nothing imported yet</h2>
          <p className="mt-2 text-sm text-muted">Import your first book to start building your collections.</p>
          <Link href="/library" className="mt-5 text-sm font-semibold text-accent underline underline-offset-4 hover:text-[#124637]">Go to import books</Link>
        </section>
      )}
    </main>
  );
}
