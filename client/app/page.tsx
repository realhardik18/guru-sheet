import Link from 'next/link';
import { Books, FileText, Plus, Stack } from '@phosphor-icons/react/dist/ssr';
import { listBooks, listChats } from '@/lib/store';
import { requireConfiguredPage } from '@/lib/setup';
import { RecentWorksheets } from '@/components/RecentWorksheets';

export const dynamic = 'force-dynamic';

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
  const worksheetCount = chats.reduce(
    (count, chat) => count + (chat.worksheetVersions?.filter((version) => version.worksheet).length ?? (chat.worksheet ? 1 : 0)),
    0,
  );

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

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-[-0.02em]">Recent worksheets</h2>
          {chats.length > 0 && <Link href="/library" className="text-sm font-medium text-accent hover:underline">View library</Link>}
        </div>
        <RecentWorksheets chats={chats} />
      </section>
    </main>
  );
}
