'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CaretLeft, CaretRight, Clock, FileDashed, FileText, MagnifyingGlass } from '@phosphor-icons/react';
import type { Question } from '@/lib/ai/schema';
import type { Chat } from '@/lib/types';

const TYPE_LABELS: Record<Question['type'], string> = { mcq: 'MCQ', fill_blank: 'Fill blanks', true_false: 'True / False', one_line: 'One-line', short_answer: 'Short answer', match: 'Matching', define_list_state: 'Define / list', short: 'Short answer', long: 'Long answer' };
type WorksheetItem = { id: string; chatId: string; versionId?: string; title: string; createdAt: string; marks: number; types: Question['type'][] };

function timeAgo(iso: string) { const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`; }
function worksheetsFrom(chats: Chat[]): WorksheetItem[] {
  return chats.flatMap((chat) => {
    const versions = chat.worksheetVersions?.length ? chat.worksheetVersions.filter((version) => version.worksheet).map((version) => ({ id: version.id, label: version.label, worksheet: version.worksheet! })) : chat.worksheet ? [{ id: undefined, label: undefined, worksheet: chat.worksheet }] : [];
    return versions.map(({ id, label, worksheet }) => ({ id: `${chat.id}-${id ?? 'legacy'}`, chatId: chat.id, versionId: id, title: label ? `${chat.title} · ${label}` : chat.title, createdAt: chat.createdAt, marks: worksheet.totalMarks, types: [...new Set(worksheet.questions.map((question) => question.type))] }));
  });
}

const PAGE_SIZE = 10;

export function RecentWorksheets({ chats }: { chats: Chat[] }) {
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
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-sm">{pageItems.map((worksheet) => <li key={worksheet.id}><Link href={`/chat/${worksheet.chatId}${worksheet.versionId ? `?version=${worksheet.versionId}` : ''}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent-soft"><FileText size={18} className="shrink-0 text-muted" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="truncate font-medium">{worksheet.title}</div><div className="mt-1 flex flex-wrap gap-1">{worksheet.types.map((questionType) => <span key={questionType} className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">{TYPE_LABELS[questionType]}</span>)}</div></div><span className="shrink-0 rounded bg-accent-soft px-2 py-0.5 text-xs text-accent">{worksheet.marks} marks</span><span className="flex shrink-0 items-center gap-1 text-xs text-muted"><Clock size={12} aria-hidden="true" />{timeAgo(worksheet.createdAt)}</span></Link></li>)}</ul>
      {totalPages > 1 && <div className="mt-3 flex items-center justify-between text-sm">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"><CaretLeft size={14} aria-hidden="true" />Previous</button>
        <span className="text-xs text-muted">Page {currentPage} of {totalPages} · {filtered.length} worksheet{filtered.length === 1 ? '' : 's'}</span>
        <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40">Next<CaretRight size={14} aria-hidden="true" /></button>
      </div>}
    </>}
  </>;
}
