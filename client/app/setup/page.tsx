import { GraduationCap } from '@phosphor-icons/react/dist/ssr';
import { SetupForm } from '@/components/SetupForm';
import { getAppConfig } from '@/lib/config';
import { redirect } from 'next/navigation';

export default async function SetupPage() {
  if (await getAppConfig()) redirect('/');

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/15 px-5 py-10 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        className="w-full max-w-xl rounded-2xl border border-white/60 bg-surface/85 p-6 shadow-2xl shadow-foreground/20 backdrop-blur-xl sm:p-8"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <GraduationCap size={22} weight="duotone" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-medium text-accent">Welcome to GuruSheet</p>
        <h1 id="setup-title" className="mt-2 text-3xl font-bold tracking-tight">Set up your local library</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          GuruSheet keeps your chats, original PDFs, and indexed chapter text in one
          folder on this machine. Nothing in this library is uploaded by the app.
        </p>
        <SetupForm />
      </section>
    </main>
  );
}
