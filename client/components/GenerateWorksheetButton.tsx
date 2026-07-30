'use client';

import { useState } from 'react';
import { Sparkle, X } from '@phosphor-icons/react';
import { startChat } from '@/lib/actions';
import type { WorksheetVersionSettings } from '@/lib/types';

const defaults: WorksheetVersionSettings = { questionCount: 10, format: 'balanced' };
const formatOptions = [
  ['balanced', 'Balanced'], ['more-mcqs', 'More MCQs'], ['more-written', 'More written'],
] as const;

export function GenerateWorksheetButton({ bookId, chapterId, disabled = false }: { bookId: string; chapterId: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<WorksheetVersionSettings[]>([{ ...defaults }]);
  const update = (index: number, patch: Partial<WorksheetVersionSettings>) => setPlans((current) => current.map((plan, i) => i === index ? { ...plan, ...patch } : plan));
  const setCount = (count: number) => setPlans((current) => Array.from({ length: count }, (_, i) => current[i] ?? { ...defaults }));

  return <>
    <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"><Sparkle size={14} weight="bold" aria-hidden="true" />Generate</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <form action={startChat} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <input type="hidden" name="bookId" value={bookId} /><input type="hidden" name="chapterId" value={chapterId} /><input type="hidden" name="versionPlans" value={JSON.stringify(plans)} />
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-accent">Worksheet setup</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Create worksheet versions</h2><p className="mt-1 text-sm text-muted">Each version gets its own mix and can be edited separately.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:bg-accent-soft" aria-label="Close"><X size={18} /></button></div>
        <fieldset className="mt-5"><legend className="text-sm font-medium">How many versions?</legend><div className="mt-2 flex gap-2">{[1, 2, 3].map((count) => <button key={count} type="button" onClick={() => setCount(count)} className={`h-9 w-12 rounded-lg border text-sm font-semibold ${plans.length === count ? 'border-accent bg-accent text-white' : 'border-line hover:border-accent'}`}>{count}</button>)}</div></fieldset>
        <div className="mt-5 max-h-[48vh] space-y-3 overflow-y-auto pr-1">{plans.map((plan, index) => <section key={index} className="rounded-xl border border-line bg-background p-4"><h3 className="font-semibold">Version {index + 1}</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Questions<input type="number" min="5" max="25" value={plan.questionCount} onChange={(event) => update(index, { questionCount: Math.max(5, Math.min(25, Number(event.target.value) || 5)) })} className="mt-1.5 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" /></label><div><p className="text-sm font-medium">Question mix</p><div className="mt-1.5 flex flex-wrap gap-1.5">{formatOptions.map(([value, label]) => <button key={value} type="button" onClick={() => update(index, { format: value })} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${plan.format === value ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:border-accent'}`}>{label}</button>)}</div></div></div><div className="mt-3"><p className="text-sm font-medium">Difficulty <span className="font-normal text-muted">(optional)</span></p><div className="mt-1.5 flex flex-wrap gap-1.5"><button type="button" onClick={() => update(index, { difficulty: undefined })} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${!plan.difficulty ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}>Standard</button><button type="button" onClick={() => update(index, { difficulty: 'easier' })} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${plan.difficulty === 'easier' ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}>Easier practice</button><button type="button" onClick={() => update(index, { difficulty: 'challenge' })} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${plan.difficulty === 'challenge' ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}>Challenge level</button></div></div></section>)}</div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-accent-soft">Cancel</button><button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-[#124637]"><Sparkle size={15} weight="bold" />Create {plans.length} {plans.length === 1 ? 'version' : 'versions'}</button></div>
      </form>
    </div>}
  </>;
}
