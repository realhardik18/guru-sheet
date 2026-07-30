'use client';

import { Trash } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteCollectionButton({ collectionId, collectionName, bookCount }: { collectionId: string; collectionName: string; bookCount: number }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/library/collections/${collectionId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not delete this collection.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not delete this collection.');
      setDeleting(false);
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={() => { setError(null); setOpen(true); }} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[#a14f24] transition-colors hover:bg-[#a14f24]/10 disabled:opacity-50">
        <Trash size={15} weight="bold" aria-hidden="true" />
        Delete collection
      </button>
      {error && <p className="mt-1 text-xs text-[#a14f24]">{error}</p>}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => !deleting && setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby={`delete-collection-${collectionId}`} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#a14f24]/10 text-[#a14f24]"><Trash size={22} weight="bold" aria-hidden="true" /></span>
            <h2 id={`delete-collection-${collectionId}`} className="mt-4 text-xl font-semibold tracking-[-0.03em]">Delete collection?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">This permanently removes <strong className="text-foreground">{collectionName}</strong>, its {bookCount} chapter PDF{bookCount === 1 ? '' : 's'}, and related chats.</p>
            {error && <p className="mt-4 rounded-lg bg-[#a14f24]/10 px-3 py-2 text-sm text-[#a14f24]">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-accent-soft disabled:opacity-50">Cancel</button>
              <button type="button" disabled={deleting} onClick={() => void remove()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#a14f24] px-4 py-2 text-sm font-semibold text-white hover:bg-[#843d1c] disabled:opacity-50"><Trash size={15} weight="bold" aria-hidden="true" />{deleting ? 'Deleting…' : 'Delete collection'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
