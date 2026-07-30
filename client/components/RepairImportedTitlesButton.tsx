'use client';

import { useState } from 'react';
import { Broom, CircleNotch } from '@phosphor-icons/react';

export function RepairImportedTitlesButton({ collectionId }: { collectionId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function repair() {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/library/collections/${collectionId}/repair-titles`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error();
      setMessage(data.updated ? `Fixed ${data.updated} imported title${data.updated === 1 ? '' : 's'}.` : 'All imported titles already look good.');
      window.location.reload();
    } catch { setMessage('Could not repair imported titles.'); } finally { setBusy(false); }
  }
  return <div className="flex items-center gap-2"><button type="button" onClick={() => void repair()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent disabled:opacity-50">{busy ? <CircleNotch size={15} className="animate-spin" /> : <Broom size={15} />}Fix imported titles</button>{message && <span className="text-xs text-muted">{message}</span>}</div>;
}
