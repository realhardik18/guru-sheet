'use client';

import { useState } from 'react';
import { CircleNotch, FilePdf, MagnifyingGlass, Warning, X } from '@phosphor-icons/react';
import { GenerateWorksheetButton } from '@/components/GenerateWorksheetButton';
import { LOW_TEXT_THRESHOLD, type Book } from '@/lib/types';

export function CollectionChapterList({ books }: { books: Book[] }) {
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<Book | null>(null);
  const filtered = books.filter((book) => `${book.title} ${book.chapters[0]?.title ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <>
    <label className="relative mt-6 block"><MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><span className="sr-only">Search chapters</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chapters…" className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent" /></label>
    {filtered.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-line px-4 py-7 text-center text-sm text-muted">No chapters match that search.</p> : <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">{filtered.map((book) => {
      const chapter = book.chapters[0]; const scanned = chapter.charCount < LOW_TEXT_THRESHOLD;
      return <li key={book.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5"><div className="min-w-0 flex-1"><div className="font-medium">{chapter.title}</div><div className="mt-0.5 text-sm text-muted">{book.pageCount} pages</div>{scanned && <p className="mt-1 flex items-center gap-1 text-xs text-[#b06f1a]"><Warning size={12} weight="bold" aria-hidden="true" />Almost no text — likely a scanned PDF</p>}</div><div className="flex items-center gap-2"><button type="button" onClick={() => setPreview(book)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent"><FilePdf size={15} />Preview</button><GenerateWorksheetButton bookId={book.id} chapterId={chapter.id} disabled={scanned} /></div></li>;
    })}</ul>}
    {preview && <PdfPreview book={preview} onClose={() => setPreview(null)} />}
  </>;
}

function PdfPreview({ book, onClose }: { book: Book; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title" onMouseDown={(event) => event.stopPropagation()} className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"><header className="flex items-center justify-between border-b border-line px-5 py-3"><div className="min-w-0"><h2 id="pdf-preview-title" className="truncate font-semibold">{book.chapters[0]?.title}</h2><p className="text-xs text-muted">Original PDF preview</p></div><button type="button" onClick={onClose} aria-label="Close preview" className="rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-accent"><X size={18} /></button></header><div className="relative min-h-0 flex-1 bg-muted/10">{loading && <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-muted"><CircleNotch size={18} className="animate-spin text-accent" />Loading PDF…</div>}<iframe title={`${book.title} PDF preview`} src={`/api/library/books/${book.id}/pdf`} onLoad={() => setLoading(false)} className="h-full w-full border-0" /></div></section></div>;
}
