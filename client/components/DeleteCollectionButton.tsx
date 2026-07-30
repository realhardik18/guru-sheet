'use client';

import { Trash } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteCollectionButton({ collectionId, collectionName, bookCount }: { collectionId: string; collectionName: string; bookCount: number }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function remove() {
    const noun = `${bookCount} chapter PDF${bookCount === 1 ? '' : 's'}`;
    if (!window.confirm(`Delete “${collectionName}”? This permanently removes the collection, its ${noun}, and related chats.`)) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/library/collections/${collectionId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not delete this collection.');
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not delete this collection.');
      setDeleting(false);
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={() => void remove()} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[#a14f24] transition-colors hover:bg-[#a14f24]/10 disabled:opacity-50">
        <Trash size={15} weight="bold" aria-hidden="true" />
        {deleting ? 'Deleting…' : 'Delete collection'}
      </button>
      {error && <p className="mt-1 text-xs text-[#a14f24]">{error}</p>}
    </div>
  );
}
