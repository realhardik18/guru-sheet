import Link from 'next/link';
import { Books, Clock, FileDashed, FileText, Plus, Stack } from '@phosphor-icons/react/dist/ssr';
import { listBooks, listChats } from '@/lib/store';
import { requireConfiguredPage } from '@/lib/setup';

export const dynamic = 'force-dynamic';

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function Dashboard() {
  const config = await requireConfiguredPage();
  const [books, chats] = await Promise.all([listBooks(), listChats()]);
  const chapterCount = books.reduce((n, b) => n + b.chapters.length, 0);
  const worksheetCount = chats.filter((chat) => chat.worksheet).length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-accent">Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {greeting()}, {config.teacherName}.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition-colors hover:bg-[#124637]"
          >
            <Plus size={16} weight="bold" aria-hidden="true" />
            New worksheet
          </Link>
          <Link
            href="/library"
            aria-label="Open library"
            title="Open library"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Books size={16} aria-hidden="true" />
            Library
          </Link>
        </div>
      </section>

      <section className="mt-9 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Books uploaded', value: books.length, Icon: Books },
          { label: 'Chapters indexed', value: chapterCount, Icon: Stack },
          { label: 'Worksheets created', value: worksheetCount, Icon: FileText },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-xl border border-line bg-surface px-5 py-5 shadow-sm"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <s.Icon size={20} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <div className="text-3xl font-semibold tracking-[-0.04em] tabular-nums">{s.value}</div>
              <div className="mt-0.5 text-sm font-medium text-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10 max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-[-0.02em]">Recent worksheets</h2>
          {chats.length > 0 && <Link href="/library" className="text-sm font-medium text-accent hover:underline">View library</Link>}
        </div>
        {chats.length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-5 py-8 text-center">
            <FileDashed size={28} className="text-muted" aria-hidden="true" />
            <p className="text-sm text-muted">No worksheets yet.</p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            {chats.slice(0, 6).map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`/chat/${chat.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent-soft"
                >
                  <FileText size={18} className="shrink-0 text-muted" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{chat.title}</div>
                  </div>
                  {chat.worksheet && (
                    <span className="shrink-0 rounded bg-accent-soft px-2 py-0.5 text-xs text-accent">
                      {chat.worksheet.totalMarks} marks
                    </span>
                  )}
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <Clock size={12} aria-hidden="true" />
                    {timeAgo(chat.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
