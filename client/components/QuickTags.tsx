'use client';

import { Plus, Tag, Trash } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { QUICK_TAG_COLORS } from '@/lib/tags';
import type { QuickTag } from '@/lib/types';

export function QuickTags({ tags }: { tags: QuickTag[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(QUICK_TAG_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not create tag.');
      setName(''); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create tag.'); } finally { setBusy(false); }
  }

  async function remove(tagId: string) {
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/tags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagId }) });
      if (!response.ok) throw new Error('Could not remove tag.');
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove tag.'); } finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
    <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Tag size={20} weight="duotone" /></span><div><h2 className="font-semibold">Quick tags</h2><p className="mt-0.5 text-sm text-muted">Create colored labels, then add them to any worksheet chat.</p></div></div>
    {tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: `${tag.color}18`, color: tag.color }}><i className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />{tag.name}<button type="button" disabled={busy} onClick={() => void remove(tag.id)} aria-label={`Remove ${tag.name} tag`} title="Remove tag" className="ml-0.5 rounded-full opacity-60 hover:opacity-100 disabled:opacity-30"><Trash size={12} weight="bold" /></button></span>)}</div>}
    <form onSubmit={add} className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-2"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={32} placeholder="Add a quick tag" className="min-w-40 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent" /><button type="submit" disabled={busy || !name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><Plus size={15} weight="bold" />Add tag</button></div>
      <div className="mt-3 grid w-fit grid-cols-6 gap-2" aria-label="Tag color">
        {QUICK_TAG_COLORS.map((choice) => <button key={choice} type="button" onClick={() => setColor(choice)} aria-label={`Use ${choice} tag color`} aria-pressed={color === choice} className={`h-7 w-7 rounded-full ring-offset-2 transition-transform hover:scale-110 ${color === choice ? 'ring-2 ring-foreground' : ''}`} style={{ backgroundColor: choice }} />)}
      </div>
      {error && <p className="mt-2 text-sm text-[#a14f24]">{error}</p>}
    </form>
  </section>;
}
