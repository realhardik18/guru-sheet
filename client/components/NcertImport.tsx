'use client';

import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, CircleNotch, FileZip, UploadSimple, Warning, WarningCircle } from '@phosphor-icons/react';

type ImportResult = {
  collection: { name: string; classLevel: string; subject: string };
  archiveCount: number;
  importedCount: number;
  failures: Array<{ file: string; error: string }>;
};

export function NcertImport({ subjectSuggestions }: { subjectSuggestions: string[] }) {
  const [sourceZip, setSourceZip] = useState('');
  const [name, setName] = useState('NCERT textbook');
  const [classLevel, setClassLevel] = useState('8');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const router = useRouter();

  async function chooseZip() {
    setPicking(true);
    setError(null);
    try {
      const response = await fetch('/api/setup/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'ncert-zip' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not open the file chooser.');
      if (typeof data.path === 'string' && data.path) {
        setSourceZip(data.path);
        const finalPart = data.path.replace(/[\\/]$/, '').split(/[\\/]/).at(-1)?.replace(/\.zip$/i, '');
        if (finalPart && name === 'NCERT textbook') setName(finalPart.replace(/[-_]+/g, ' '));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not open the file chooser.');
    } finally {
      setPicking(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/library/import-ncert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceZip, name, classLevel, subject }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not import the NCERT ZIP file.');
      setResult(data);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not import the NCERT ZIP file.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <FileZip size={18} className="text-accent" aria-hidden="true" />
        Import NCERT ZIP file
      </h2>
      <p className="mt-1 text-sm text-muted">
        Choose one NCERT ZIP file. GuruSheet finds its chapter PDFs, names them from page one,
        and stores the original archive in your local library.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm font-medium">NCERT ZIP file</span>
          <div className="mt-1 flex gap-2">
            <input
              required
              value={sourceZip}
              onChange={(event) => setSourceZip(event.target.value)}
              placeholder="Choose an NCERT ZIP file"
              className="min-w-0 flex-1 rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void chooseZip()}
              disabled={busy || picking}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm hover:border-accent disabled:opacity-50"
            >
              {picking ? (
                <CircleNotch size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <FileZip size={15} aria-hidden="true" />
              )}
              {picking ? 'Opening…' : 'Choose ZIP'}
            </button>
          </div>
        </label>
        <label>
          <span className="text-sm font-medium">Collection name</span>
          <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
        </label>
        <label>
          <span className="text-sm font-medium">Subject</span>
          <SubjectAutocomplete value={subject} onChange={setSubject} suggestions={subjectSuggestions} />
        </label>
        <label>
          <span className="text-sm font-medium">Class</span>
          <select value={classLevel} onChange={(event) => setClassLevel(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent">
            {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((level) => <option key={level} value={level}>Class {level}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy || picking} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50">
            {busy ? (
              <CircleNotch size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <UploadSimple size={15} weight="bold" aria-hidden="true" />
            )}
            {busy ? 'Importing ZIP…' : 'Import NCERT collection'}
          </button>
        </div>
      </form>
      {busy && <div role="status" aria-live="polite" className="mt-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent-soft px-3 py-3 text-sm text-accent"><CircleNotch size={17} className="animate-spin" aria-hidden="true" /><span><strong>Indexing your collection…</strong> Reading each PDF, then naming all chapters together.</span></div>}
      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded bg-[#b06f1a]/10 px-3 py-2 text-sm text-[#b06f1a]">
          <WarningCircle size={15} weight="bold" className="shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {result && (
        <div className="mt-3 rounded bg-accent-soft px-3 py-2 text-sm text-accent">
          <p className="flex items-center gap-1.5">
            <CheckCircle size={15} weight="bold" className="shrink-0" aria-hidden="true" />
            Imported {result.importedCount} chapter PDF{result.importedCount === 1 ? '' : 's'} from {result.archiveCount} ZIP file{result.archiveCount === 1 ? '' : 's'}.
          </p>
          {result.failures.length > 0 && (
            <details className="mt-2 text-xs text-foreground">
              <summary className="inline-flex cursor-pointer items-center gap-1.5">
                <Warning size={13} weight="bold" aria-hidden="true" />
                {result.failures.length} file{result.failures.length === 1 ? '' : 's'} could not be imported
              </summary>
              <ul className="mt-1 list-disc pl-4">{result.failures.map((failure) => <li key={`${failure.file}-${failure.error}`}>{failure.file}: {failure.error}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function SubjectAutocomplete({ value, onChange, suggestions }: { value: string; onChange: (value: string) => void; suggestions: string[] }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const matches = suggestions.filter((suggestion) => suggestion.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6);

  function select(subject: string) {
    onChange(subject);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) {
      if (event.key === 'ArrowDown') setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % matches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative mt-1">
      <input
        required
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open && matches.length > 0}
        aria-activedescendant={open && matches[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        placeholder="Start typing a subject"
        className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {open && matches.length > 0 && (
        <ul id={listboxId} role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lg">
          {matches.map((suggestion, index) => (
            <li key={suggestion} id={`${listboxId}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(suggestion)}
                className={`w-full px-3 py-2 text-left text-sm ${index === activeIndex ? 'bg-accent-soft text-accent' : 'text-foreground hover:bg-accent-soft'}`}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
