'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CircleNotch, FolderOpen, WarningCircle } from '@phosphor-icons/react';

export function SetupForm() {
  const [teacherName, setTeacherName] = useState('');
  const [parentDirectory, setParentDirectory] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherName, parentDirectory }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Could not complete setup.');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Could not complete setup.');
    } finally {
      setBusy(false);
    }
  }

  async function pickFolder() {
    setPicking(true);
    setError(null);
    try {
      const response = await fetch('/api/setup/folder', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Could not open the folder chooser.');
        return;
      }
      if (typeof result.path === 'string' && result.path) setParentDirectory(result.path);
    } catch {
      setError('Could not open the folder chooser.');
    } finally {
      setPicking(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Your name</span>
        <input
          required
          value={teacherName}
          onChange={(event) => setTeacherName(event.target.value)}
          placeholder="e.g. Priya"
          className="mt-1.5 w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Where should GuruSheet keep its library?</span>
        <div className="mt-1.5 flex gap-2">
          <input
            required
            value={parentDirectory}
            onChange={(event) => setParentDirectory(event.target.value)}
            placeholder="/Users/you/Documents"
            className="min-w-0 flex-1 rounded-md border border-line bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => void pickFolder()}
            disabled={busy || picking}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm transition-colors hover:border-accent disabled:opacity-50"
          >
            {picking ? (
              <CircleNotch size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <FolderOpen size={15} aria-hidden="true" />
            )}
            {picking ? 'Opening…' : 'Choose folder'}
          </button>
        </div>
        <span className="mt-1.5 block text-xs leading-5 text-muted">
          Choose an existing folder or paste its absolute path. We will create a{' '}
          <strong>Guru Sheet</strong> folder inside it with books and chats folders.
        </span>
      </label>
      {error && (
        <p className="flex items-center gap-1.5 rounded bg-[#b06f1a]/10 px-3 py-2 text-sm text-[#b06f1a]">
          <WarningCircle size={15} weight="bold" className="shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? (
          <CircleNotch size={15} className="animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRight size={15} weight="bold" aria-hidden="true" />
        )}
        {busy ? 'Setting up…' : 'Create my Guru Sheet folder'}
      </button>
    </form>
  );
}
