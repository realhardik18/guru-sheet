'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CaretLeft, CaretRight, Check, Clock, DotsThree, FileDashed, FileText, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import type { Question } from '@/lib/ai/schema';
import { QUICK_TAG_COLORS } from '@/lib/tags';
import type { Chat, QuickTag } from '@/lib/types';

const TYPE_LABELS: Record<Question['type'], string> = { mcq: 'MCQ', fill_blank: 'Fill blanks', true_false: 'True / False', one_line: 'One-line', short_answer: 'Short answer', match: 'Matching', define_list_state: 'Define / list', short: 'Short answer', long: 'Long answer' };
type WorksheetItem = { id: string; chatId: string; versionId?: string; title: string; createdAt: string; marks: number; types: Question['type'][]; tagIds: string[] };

function timeAgo(iso: string) { const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`; }
function worksheetsFrom(chats: Chat[]): WorksheetItem[] {
  return chats.flatMap((chat) => {
    const versions = chat.worksheetVersions?.length ? chat.worksheetVersions.filter((version) => version.worksheet).map((version) => ({ id: version.id, label: version.label, worksheet: version.worksheet! })) : chat.worksheet ? [{ id: undefined, label: undefined, worksheet: chat.worksheet }] : [];
    return versions.map(({ id, label, worksheet }) => ({ id: `${chat.id}-${id ?? 'legacy'}`, chatId: chat.id, versionId: id, title: label ? `${chat.title} · ${label}` : chat.title, createdAt: chat.createdAt, marks: worksheet.totalMarks, types: [...new Set(worksheet.questions.map((question) => question.type))], tagIds: chat.tagIds ?? [] }));
  });
}

const PAGE_SIZE = 10;

export function RecentWorksheets({ chats, quickTags }: { chats: Chat[]; quickTags: QuickTag[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<Question['type'] | 'all'>('all');
  const [page, setPage] = useState(1);
  const worksheets = worksheetsFrom(chats);
  const presentTypes = [...new Set(worksheets.flatMap((worksheet) => worksheet.types))].sort((a, b) => TYPE_LABELS[a].localeCompare(TYPE_LABELS[b]));
  const filtered = worksheets.filter((worksheet) => worksheet.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (type === 'all' || worksheet.types.includes(type)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  if (worksheets.length === 0) return <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-5 py-8 text-center"><FileDashed size={28} className="text-muted" aria-hidden="true" /><p className="text-sm text-muted">No worksheets yet.</p></div>;
  return <>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row"><label className="relative min-w-0 flex-1"><MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><span className="sr-only">Search worksheets</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search worksheets…" className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-accent" /></label><label><span className="sr-only">Filter by question type</span><select value={type} onChange={(event) => { setType(event.target.value as Question['type'] | 'all'); setPage(1); }} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent sm:w-44"><option value="all">All question types</option>{presentTypes.map((questionType) => <option key={questionType} value={questionType}>{TYPE_LABELS[questionType]}</option>)}</select></label></div>
    {filtered.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No worksheets match that search or question type.</p> : <>
      <ul className="mt-3 divide-y divide-line overflow-visible rounded-xl border border-line bg-surface shadow-sm">{pageItems.map((worksheet) => <li key={worksheet.id} className="flex items-center gap-2 px-2"><Link href={`/chat/${worksheet.chatId}${worksheet.versionId ? `?version=${worksheet.versionId}` : ''}`} className="flex min-w-0 flex-1 items-center gap-4 px-3 py-4 transition-colors hover:bg-accent-soft"><FileText size={18} className="shrink-0 text-muted" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="truncate font-medium">{worksheet.title}</div><div className="mt-1 flex flex-wrap gap-1">{worksheet.types.map((questionType) => <span key={questionType} className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">{TYPE_LABELS[questionType]}</span>)}{quickTags.filter((tag) => worksheet.tagIds.includes(tag.id)).map((tag) => <span key={tag.id} className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${tag.color}18`, color: tag.color }}>{tag.name}</span>)}</div></div><span className="shrink-0 rounded bg-accent-soft px-2 py-0.5 text-xs text-accent">{worksheet.marks} marks</span><span className="flex shrink-0 items-center gap-1 text-xs text-muted"><Clock size={12} aria-hidden="true" />{timeAgo(worksheet.createdAt)}</span></Link><WorksheetTagMenu chatId={worksheet.chatId} tagIds={worksheet.tagIds} tags={quickTags} /></li>)}</ul>
      {totalPages > 1 && <div className="mt-3 flex items-center justify-between text-sm">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"><CaretLeft size={14} aria-hidden="true" />Previous</button>
        <span className="text-xs text-muted">Page {currentPage} of {totalPages} · {filtered.length} worksheet{filtered.length === 1 ? '' : 's'}</span>
        <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40">Next<CaretRight size={14} aria-hidden="true" /></button>
      </div>}
    </>}
  </>;
}

function WorksheetTagMenu({ chatId, tagIds, tags }: { chatId: string; tagIds: string[]; tags: QuickTag[] }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(tagIds);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(QUICK_TAG_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  async function save(next: string[]) {
    setBusy(true);
    try {
      const response = await fetch(`/api/chats/${chatId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagIds: next }) });
      if (!response.ok) throw new Error();
      setSelected(next);
    } finally { setBusy(false); }
  }

  async function createTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not create tag.');
      await save([...selected, result.tag.id]);
      setCreateOpen(false);
      setOpen(false);
      window.location.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create tag.'); } finally { setBusy(false); }
  }

  return <div ref={menuRef} className="relative shrink-0"><button type="button" onClick={() => setOpen((value) => !value)} aria-label="Manage worksheet tags" aria-expanded={open} title="Manage tags" className="rounded-lg p-2 text-muted transition-colors hover:bg-accent-soft hover:text-accent"><DotsThree size={19} weight="bold" /></button>{open && <div className="absolute right-0 top-10 z-[100] w-52 rounded-xl border border-line bg-surface p-2 shadow-xl"><p className="px-2 py-1 text-xs font-medium text-muted">Tags</p>{tags.map((tag) => <button key={tag.id} type="button" disabled={busy} onClick={() => void save(selected.includes(tag.id) ? selected.filter((id) => id !== tag.id) : [...selected, tag.id])} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent-soft disabled:opacity-50"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} /><span className="min-w-0 flex-1 truncate">{tag.name}</span>{selected.includes(tag.id) && <Check size={15} weight="bold" className="text-accent" />}</button>)}<button type="button" disabled={busy} onClick={() => { setError(null); setCreateOpen(true); }} className="mt-1 flex w-full cursor-pointer items-center gap-2 border-t border-line px-2 pt-2 text-sm font-medium text-accent hover:text-[#124637] disabled:cursor-not-allowed"><Plus size={16} weight="bold" />Create tag</button></div>}{createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => { if (!busy) { setCreateOpen(false); setOpen(false); } }}><section role="dialog" aria-modal="true" aria-labelledby={`new-tag-${chatId}`} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><h2 id={`new-tag-${chatId}`} className="text-lg font-semibold tracking-[-0.02em]">Create tag</h2><p className="mt-1 text-sm text-muted">This tag will be added to the worksheet right away.</p><form onSubmit={createTag} className="mt-5 space-y-5"><label className="block"><span className="text-sm font-medium">Tag name</span><input autoFocus required maxLength={32} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Revision" className="mt-1.5 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-accent" /></label><div><span className="text-sm font-medium">Colour</span><div className="mt-2 flex flex-wrap gap-2">{QUICK_TAG_COLORS.map((choice) => <button key={choice} type="button" onClick={() => setColor(choice)} aria-label={`Use ${choice} tag colour`} aria-pressed={color === choice} className={`h-8 w-8 rounded-full ring-offset-2 transition-transform hover:scale-110 ${color === choice ? 'ring-2 ring-foreground' : ''}`} style={{ backgroundColor: choice }} />)}</div></div>{error && <p className="rounded-lg bg-[#a14f24]/10 px-3 py-2 text-sm text-[#a14f24]">{error}</p>}<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setCreateOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-accent-soft">Cancel</button><button type="submit" disabled={busy || !name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Creating…' : 'Create tag'}</button></div></form></section></div>}</div>;
}
