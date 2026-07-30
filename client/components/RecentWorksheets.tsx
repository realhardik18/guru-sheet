'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CaretLeft, CaretRight, Check, Clock, DotsThree, FileDashed, FileText, MagnifyingGlass, Note, Plus, ShareNetwork, Trash } from '@phosphor-icons/react';
import type { Question } from '@/lib/ai/schema';
import { QUICK_TAG_COLORS } from '@/lib/tags';
import type { ArtifactType, Chat, QuickTag } from '@/lib/types';

const TYPE_LABELS: Record<Question['type'], string> = { mcq: 'MCQ', fill_blank: 'Fill blanks', true_false: 'True / False', one_line: 'One-line', short_answer: 'Short answer', match: 'Matching', define_list_state: 'Define / list', short: 'Short answer', long: 'Long answer' };
const ARTIFACT_LABELS: Record<ArtifactType, string> = { worksheet: 'Worksheet', notes: 'Notes', mindmap: 'Mind map' };
type ContentItem = { id: string; chatId: string; title: string; createdAt: string; type: ArtifactType; meta: string[]; tagIds: string[] };

function timeAgo(iso: string) { const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`; }
function contentFrom(chats: Chat[]): ContentItem[] {
  return chats.flatMap<ContentItem>((chat) => {
    const artifactType = chat.artifactType ?? 'worksheet';
    if (artifactType === 'notes') {
      return [{ id: `${chat.id}-notes`, chatId: chat.id, title: chat.notes?.title ?? chat.title, createdAt: chat.createdAt, type: artifactType, meta: [chat.notesStyle ? chat.notesStyle.replaceAll('-', ' ') : 'study notes', chat.notes ? `${chat.notes.sections.length} sections` : 'generating'], tagIds: chat.tagIds ?? [] }];
    }
    if (artifactType === 'mindmap') {
      return [{ id: `${chat.id}-mindmap`, chatId: chat.id, title: chat.mindMap?.title ?? chat.title, createdAt: chat.createdAt, type: artifactType, meta: [chat.mindMap ? `${chat.mindMap.branches.length} branches` : 'generating'], tagIds: chat.tagIds ?? [] }];
    }
    const savedVersion = chat.worksheetVersions?.find((version) => version.worksheet);
    const worksheet = savedVersion?.worksheet ?? chat.worksheet;
    if (!worksheet) return [];
    const types = [...new Set(worksheet.questions.map((question) => question.type))];
    return [{ id: `${chat.id}-${savedVersion?.id ?? 'legacy'}`, chatId: chat.id, title: chat.title, createdAt: chat.createdAt, type: artifactType, meta: [...types.map((questionType) => TYPE_LABELS[questionType]), `${worksheet.totalMarks} marks`], tagIds: chat.tagIds ?? [] }];
  });
}

const PAGE_SIZE = 10;

export function RecentContent({ chats, quickTags }: { chats: Chat[]; quickTags: QuickTag[] }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ArtifactType | 'all'>('all');
  const [page, setPage] = useState(1);
  const content = contentFrom(chats);
  const presentTypes = [...new Set(content.map((item) => item.type))].sort((a, b) => ARTIFACT_LABELS[a].localeCompare(ARTIFACT_LABELS[b]));
  const filtered = content.filter((item) => item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (type === 'all' || item.type === type));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  if (content.length === 0) return <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-5 py-8 text-center"><FileDashed size={28} className="text-muted" aria-hidden="true" /><p className="text-sm text-muted">No recent content yet.</p></div>;
  return <>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row"><label className="relative min-w-0 flex-1"><MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><span className="sr-only">Search recent content</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search recent content…" className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-accent" /></label><label><span className="sr-only">Filter by content type</span><select value={type} onChange={(event) => { setType(event.target.value as ArtifactType | 'all'); setPage(1); }} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent sm:w-44"><option value="all">All content</option>{presentTypes.map((artifactType) => <option key={artifactType} value={artifactType}>{ARTIFACT_LABELS[artifactType]}</option>)}</select></label></div>
    {filtered.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No content matches that search or type.</p> : <>
      <ul className="mt-3 divide-y divide-line overflow-visible rounded-xl border border-line bg-surface shadow-sm">{pageItems.map((item) => { const Icon = item.type === 'notes' ? Note : item.type === 'mindmap' ? ShareNetwork : FileText; return <li key={item.id} className="flex items-center gap-2 px-2"><Link href={`/chat/${item.chatId}`} className="flex min-w-0 flex-1 items-center gap-4 px-3 py-4 transition-colors hover:bg-accent-soft"><Icon size={18} className="shrink-0 text-muted" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="truncate font-medium">{item.title}</div><div className="mt-1 flex flex-wrap gap-1"><span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">{ARTIFACT_LABELS[item.type]}</span>{item.meta.map((meta) => <span key={meta} className="rounded bg-background px-1.5 py-0.5 text-[11px] text-muted">{meta}</span>)}{quickTags.filter((tag) => item.tagIds.includes(tag.id)).map((tag) => <span key={tag.id} className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${tag.color}18`, color: tag.color }}>{tag.name}</span>)}</div></div><span className="flex shrink-0 items-center gap-1 text-xs text-muted"><Clock size={12} aria-hidden="true" />{timeAgo(item.createdAt)}</span></Link><WorksheetTagMenu chatId={item.chatId} tagIds={item.tagIds} tags={quickTags} /></li>; })}</ul>
      {totalPages > 1 && <div className="mt-3 flex items-center justify-between text-sm">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"><CaretLeft size={14} aria-hidden="true" />Previous</button>
        <span className="text-xs text-muted">Page {currentPage} of {totalPages} · {filtered.length} item{filtered.length === 1 ? '' : 's'}</span>
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
  const [deleteTarget, setDeleteTarget] = useState<QuickTag | null>(null);

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

  async function deleteTag() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/tags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagId: deleteTarget.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Could not delete tag.');
      setSelected((current) => current.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
      setOpen(false);
      window.location.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete tag.'); } finally { setBusy(false); }
  }

  return <div ref={menuRef} className="relative shrink-0">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Manage worksheet tags" aria-expanded={open} title="Manage tags" className="rounded-lg p-2 text-muted transition-colors hover:bg-accent-soft hover:text-accent"><DotsThree size={19} weight="bold" /></button>
    {open && <div className="absolute right-0 top-10 z-[100] w-60 rounded-xl border border-line bg-surface p-2 shadow-xl">
      <p className="px-2 py-1 text-xs font-medium text-muted">Tags</p>
      {tags.length === 0 && <p className="px-2 py-2 text-sm text-muted">No tags yet.</p>}
      {tags.map((tag) => <div key={tag.id} className="group flex items-center gap-1 rounded-lg hover:bg-accent-soft">
        <button type="button" disabled={busy} onClick={() => void save(selected.includes(tag.id) ? selected.filter((id) => id !== tag.id) : [...selected, tag.id])} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm disabled:opacity-50">
          <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
          <span className="min-w-0 flex-1 truncate">{tag.name}</span>
          {selected.includes(tag.id) && <Check size={15} weight="bold" className="shrink-0 text-accent" />}
        </button>
        <button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); setError(null); setDeleteTarget(tag); }} aria-label={`Delete ${tag.name} tag`} title="Delete tag" className="mr-1 rounded-md p-1.5 text-muted opacity-70 transition-colors hover:bg-[#a14f24]/10 hover:text-[#a14f24] disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"><Trash size={15} weight="bold" /></button>
      </div>)}
      <button type="button" disabled={busy} onClick={() => { setError(null); setCreateOpen(true); }} className="mt-1 flex w-full cursor-pointer items-center gap-2 border-t border-line px-2 pt-2 text-sm font-medium text-accent hover:text-[#124637] disabled:cursor-not-allowed"><Plus size={16} weight="bold" />Create tag</button>
    </div>}
    {createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => { if (!busy) { setCreateOpen(false); setOpen(false); } }}><section role="dialog" aria-modal="true" aria-labelledby={`new-tag-${chatId}`} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><h2 id={`new-tag-${chatId}`} className="text-lg font-semibold tracking-[-0.02em]">Create tag</h2><p className="mt-1 text-sm text-muted">This tag will be added to the worksheet right away.</p><form onSubmit={createTag} className="mt-5 space-y-5"><label className="block"><span className="text-sm font-medium">Tag name</span><input autoFocus required maxLength={32} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Revision" className="mt-1.5 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-accent" /></label><div><span className="text-sm font-medium">Colour</span><div className="mt-2 flex flex-wrap gap-2">{QUICK_TAG_COLORS.map((choice) => <button key={choice} type="button" onClick={() => setColor(choice)} aria-label={`Use ${choice} tag colour`} aria-pressed={color === choice} className={`h-8 w-8 rounded-full ring-offset-2 transition-transform hover:scale-110 ${color === choice ? 'ring-2 ring-foreground' : ''}`} style={{ backgroundColor: choice }} />)}</div></div>{error && <p className="rounded-lg bg-[#a14f24]/10 px-3 py-2 text-sm text-[#a14f24]">{error}</p>}<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setCreateOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-accent-soft">Cancel</button><button type="submit" disabled={busy || !name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Creating…' : 'Create tag'}</button></div></form></section></div>}
    {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => { if (!busy) setDeleteTarget(null); }}><section role="dialog" aria-modal="true" aria-labelledby={`delete-tag-${chatId}`} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><h2 id={`delete-tag-${chatId}`} className="text-lg font-semibold tracking-[-0.02em]">Delete tag</h2><p className="mt-2 text-sm text-muted">Remove {deleteTarget.name} from saved tags and every worksheet using it?</p>{error && <p className="mt-4 rounded-lg bg-[#a14f24]/10 px-3 py-2 text-sm text-[#a14f24]">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setDeleteTarget(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-accent-soft">Cancel</button><button type="button" disabled={busy} onClick={() => void deleteTag()} className="inline-flex items-center gap-2 rounded-lg bg-[#a14f24] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Trash size={15} weight="bold" />{busy ? 'Deleting…' : 'Delete'}</button></div></section></div>}
  </div>;
}
