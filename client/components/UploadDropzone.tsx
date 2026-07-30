'use client';

import { useState, useRef, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, CircleNotch, UploadSimple, WarningCircle } from '@phosphor-icons/react';

const METHOD_NOTE: Record<string, string> = {
  outline: "Split using the book's own contents list.",
  headings: 'Split by finding chapter headings in the text.',
  'whole-book': 'No chapter structure found — indexed as a single chapter.',
};

export function UploadDropzone() {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/books/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
        return;
      }
      setMessage(
        `${data.book.title} — ${data.book.chapters.length} chapters. ${
          METHOD_NOTE[data.method] ?? ''
        }`,
      );
      router.refresh();
    } catch {
      setError('Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-5 py-8 text-center transition-colors ${
          over ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
        } ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        {busy ? (
          <CircleNotch size={26} className="mx-auto animate-spin text-accent" aria-hidden="true" />
        ) : (
          <UploadSimple size={26} className="mx-auto text-muted" aria-hidden="true" />
        )}
        <p className="mt-2 text-sm font-medium">
          {busy ? 'Reading and indexing…' : 'Drop a textbook PDF here'}
        </p>
        <p className="mt-1 text-xs text-muted">
          {busy
            ? 'Splitting into chapters. Large books take a moment.'
            : 'Indexed once. Nothing leaves this machine.'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = '';
          }}
        />
      </div>

      {message && (
        <p className="mt-2 flex items-center gap-1.5 rounded bg-accent-soft px-3 py-2 text-xs text-accent">
          <CheckCircle size={14} weight="bold" className="shrink-0" aria-hidden="true" />
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 flex items-center gap-1.5 rounded bg-[#b06f1a]/10 px-3 py-2 text-xs text-[#b06f1a]">
          <WarningCircle size={14} weight="bold" className="shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
