import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Warning } from '@phosphor-icons/react/dist/ssr';
import { getBook } from '@/lib/store';
import { LOW_TEXT_THRESHOLD } from '@/lib/types';
import { GenerateWorksheetButton } from '@/components/GenerateWorksheetButton';
import { requireConfiguredPage } from '@/lib/setup';

export const dynamic = 'force-dynamic';

export default async function BookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  await requireConfiguredPage();
  const { bookId } = await params;
  const book = await getBook(bookId);
  if (!book) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-5 py-10">
      <Link href="/library" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} aria-hidden="true" /> Library
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{book.title}</h1>
      <p className="mt-1 text-muted">
        {book.chapters.length} chapters · {book.pageCount} pages
      </p>

      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {book.chapters.map((chapter) => {
          const scanned = chapter.charCount < LOW_TEXT_THRESHOLD;
          return (
            <li
              key={chapter.id}
              className="flex flex-wrap items-center gap-4 px-4 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{chapter.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                  <span className="tabular-nums">
                    pp. {chapter.startPage}–{chapter.endPage}
                  </span>
                  <span className="tabular-nums">
                    {chapter.charCount.toLocaleString()} chars
                  </span>
                  {scanned && (
                    <span className="flex items-center gap-1 rounded bg-[#b06f1a]/10 px-1.5 py-0.5 text-xs text-[#b06f1a]">
                      <Warning size={12} weight="bold" aria-hidden="true" />
                      Almost no text — likely a scanned page
                    </span>
                  )}
                </div>
              </div>

              <GenerateWorksheetButton bookId={book.id} chapterId={chapter.id} disabled={scanned} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
