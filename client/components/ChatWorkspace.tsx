'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  CheckCircle,
  CircleNotch,
  FileDashed,
  ListChecks,
  NotePencil,
  PaperPlaneRight,
  Printer,
  PencilSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import { WorksheetSheet } from './Worksheet';
import type { Question, Worksheet } from '@/lib/ai/schema';
import type { Chat, WorksheetVersion } from '@/lib/types';
import { persistChat } from '@/lib/actions';

function toUIMessages(messages: Chat['messages']): UIMessage[] {
  return messages.map((m, i) => ({
    id: `seed-${i}`,
    role: m.role,
    parts: [{ type: 'text' as const, text: m.content }],
  }));
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { text: string }).text)
    .join('');
}

function printFilename(worksheet: Worksheet, chapterLabel: string) {
  const date = new Intl.DateTimeFormat('en-CA').format(new Date());
  const clean = (value: string) => value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  return clean(`GuruSheet Worksheet — Class ${worksheet.classLevel} — ${worksheet.topic} — ${chapterLabel} — ${date}`).slice(0, 180);
}

export function ChatWorkspace({
  chat,
  chapterLabel,
  initialVersionId,
}: {
  chat: Chat;
  chapterLabel: string;
  initialVersionId?: string;
}) {
  const [input, setInput] = useState('');
  const [chatTitle, setChatTitle] = useState(chat.title);
  const [titleDraft, setTitleDraft] = useState(chat.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const initialVersions: WorksheetVersion[] = chat.worksheetVersions?.length
    ? chat.worksheetVersions
    : chat.worksheet
      ? [{ id: 'v1', label: 'Version 1', settings: { questionCount: chat.worksheet.questions.length, format: 'balanced' }, worksheet: chat.worksheet }]
      : [];
  const [versions, setVersions] = useState<WorksheetVersion[]>(initialVersions);
  const [activeVersionId, setActiveVersionId] = useState(
    initialVersions.some((version) => version.id === initialVersionId) ? initialVersionId! : initialVersions[0]?.id ?? 'v1',
  );
  const [generatingVersionId, setGeneratingVersionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [busyQuestions, setBusyQuestions] = useState<Question[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedInitialGeneration = useRef(false);
  const activeVersion = versions.find((version) => version.id === activeVersionId) ?? versions[0];
  const worksheet = activeVersion?.worksheet;
  const createdOn = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(chat.createdAt));

  const { messages, sendMessage, status } = useChat({
    messages: toUIMessages(chat.messages),
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { bookId: chat.bookId, chapterId: chat.chapterId },
    }),
  });

  const streaming = status === 'streaming' || status === 'submitted';
  const busy = streaming || generatingVersionId !== null;

  function showToast(message: string) {
    setToast(message);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streaming]);

  // Persist once both the reply and the sheet have settled.
  useEffect(() => {
    if (busy) return;
    void persistChat(chat.id, messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: textOf(m) })), versions);
  }, [busy, messages, versions, chat.id]);

  async function generateWorksheet(versionId: string, instruction: string, previous?: Worksheet, avoidQuestions: string[] = []) {
    const version = versions.find((item) => item.id === versionId);
    if (!version) return null;
    setGeneratingVersionId(versionId);
    setNotice(null);
    try {
      const res = await fetch('/api/worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: chat.bookId,
          chapterId: chat.chapterId,
          instruction,
          previous,
          settings: version.settings,
          avoidQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? 'Could not generate a worksheet.');
        return;
      }
      setVersions((current) => current.map((item) => item.id === versionId ? { ...item, worksheet: data.worksheet } : item));
      setSelectedQuestions([]);
      if (instruction.trim()) showToast(`${version.label} updated.`);
      if (data.fallback) {
        setNotice(`Model unavailable — ${version.label} is showing a saved worksheet.`);
      }
      return data.worksheet as Worksheet;
    } catch {
      setNotice('Could not reach the model.');
    } finally {
      setGeneratingVersionId(null);
    }
  }

  useEffect(() => {
    if (startedInitialGeneration.current || initialVersions.every((version) => version.worksheet)) return;
    startedInitialGeneration.current = true;
    void (async () => {
      let priorQuestions = initialVersions.flatMap((version) => version.worksheet?.questions.map((question) => question.q) ?? []);
      for (const version of initialVersions.filter((item) => !item.worksheet)) {
        const created = await generateWorksheet(version.id, '', undefined, priorQuestions);
        if (created) priorQuestions = [...priorQuestions, ...created.questions.map((question) => question.q)];
      }
    })();
    // Initial plans are deliberately generated once, in order, to avoid duplicates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reviseQuestion(question: Question, questionIndex: number, instruction: string, targetType?: Question['type']) {
    if (!worksheet || !instruction.trim()) return;
    setBusyQuestions((current) => [...current, question]);
    setNotice(null);
    try {
      const res = await fetch('/api/worksheet/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: chat.bookId,
          chapterId: chat.chapterId,
          question,
          instruction,
          targetType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? 'Could not revise this question.');
        return;
      }
      setVersions((current) => current.map((version) => {
        if (version.id !== activeVersionId || !version.worksheet) return version;
        const index = version.worksheet.questions[questionIndex]?.q === question.q
          ? questionIndex
          : version.worksheet.questions.findIndex((item) => item === question || item.q === question.q);
        if (index === -1) return version;
        const questions = [...version.worksheet.questions];
        questions[index] = data.question;
        return {
          ...version,
          worksheet: { ...version.worksheet, questions, totalMarks: questions.reduce((sum, q) => sum + q.marks, 0) },
        };
      }));
      setSelectedQuestions((current) => current.filter((item) => item !== question));
      showToast(targetType ? `Question changed to ${targetType.replace(/_/g, ' ')}.` : 'Question updated.');
    } catch {
      setNotice('Could not reach the model.');
    } finally {
      setBusyQuestions((current) => current.filter((item) => item !== question));
    }
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput('');
    // Chat and worksheet run in parallel: she reads the reply while the sheet
    // is still rendering, so neither waits on the other.
    void sendMessage({ text: trimmed });
    if (activeVersion) void generateWorksheet(activeVersion.id, trimmed, worksheet);
  }

  function printWorksheet() {
    if (!worksheet) return;
    const previousTitle = document.title;
    document.title = printFilename(worksheet, chapterLabel);
    window.addEventListener('afterprint', () => { document.title = previousTitle; }, { once: true });
    window.print();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(input);
  }

  async function saveTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = titleDraft.trim();
    if (!title) return;
    setSavingTitle(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error();
      setChatTitle(title);
      setEditingTitle(false);
    } catch {
      setNotice('Could not rename this chat.');
    } finally {
      setSavingTitle(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {toast && (
        <div role="status" aria-live="polite" className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-accent/20 bg-surface px-4 py-3 text-sm font-medium text-accent shadow-xl">
          <CheckCircle size={19} weight="fill" aria-hidden="true" />
          {toast}
        </div>
      )}
      {/* ---------------- Chat ---------------- */}
      <section className="no-print flex min-h-0 w-full flex-col border-line lg:w-[560px] lg:shrink-0 lg:border-r">
        <header className="border-b border-line px-5 py-3">
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <form onSubmit={saveTitle} className="flex items-center gap-1">
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') { setTitleDraft(chatTitle); setEditingTitle(false); }
                  }}
                  className="min-w-0 flex-1 rounded border border-accent bg-surface px-1.5 py-0.5 text-sm font-semibold outline-none"
                />
                <button type="submit" disabled={savingTitle} className="text-xs font-medium text-accent disabled:opacity-50">{savingTitle ? 'Saving' : 'Save'}</button>
              </form>
            ) : (
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="truncate font-semibold">{chatTitle}</h1>
                <button type="button" onClick={() => { setTitleDraft(chatTitle); setEditingTitle(true); }} aria-label="Rename chat" title="Rename chat" className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-accent-soft hover:text-accent">
                  <PencilSimple size={14} weight="bold" aria-hidden="true" />
                </button>
              </div>
            )}
            <p className="mt-0.5 text-xs text-muted">Created {createdOn}</p>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-accent-soft px-3 py-2 text-sm'
                  : 'max-w-[90%] text-sm leading-relaxed'
              }
            >
              {textOf(m) || (streaming ? <Dots /> : null)}
            </div>
          ))}

          {generatingVersionId && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <NotePencil size={14} className="animate-pulse text-accent" aria-hidden="true" />
                <span className="shimmer-text">Building {versions.find((version) => version.id === generatingVersionId)?.label ?? 'the worksheet'}…</span>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-line p-3">
          {notice && (
            <p className="mb-2 flex items-center gap-1.5 rounded bg-[#b06f1a]/10 px-2 py-1.5 text-xs text-[#b06f1a]">
              <WarningCircle size={14} weight="bold" className="shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-4 pr-1.5 transition-colors focus-within:border-accent">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder="Make a 20-minute worksheet, three levels…"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? (
                <CircleNotch size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <PaperPlaneRight size={15} weight="fill" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>
      </section>

      {/* ---------------- Worksheet ---------------- */}
      <section className="print-root min-h-0 flex-1 overflow-y-auto bg-background p-5">
        {versions.length > 1 && (
          <div className="no-print mx-auto mb-3 flex max-w-[210mm] rounded-lg border border-line bg-surface p-1">
            {versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => { setActiveVersionId(version.id); setSelectedQuestions([]); }}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${activeVersion?.id === version.id ? 'bg-accent text-white' : 'text-muted hover:bg-accent-soft hover:text-accent'}`}
              >
                {generatingVersionId === version.id && <CircleNotch size={13} className="animate-spin" aria-hidden="true" />}
                {version.label}
              </button>
            ))}
          </div>
        )}
        {worksheet ? (
          <>
            <div className="no-print mx-auto mb-3 flex max-w-[210mm] flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <ListChecks size={15} aria-hidden="true" />
                {worksheet.questions.length} questions · {worksheet.totalMarks} marks
              </span>
              <button
                onClick={printWorksheet}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm transition-colors hover:border-accent"
              >
                <Printer size={15} aria-hidden="true" />
                Print
              </button>
            </div>
            <div className="relative">
              {generatingVersionId === activeVersion?.id && (
                <div className="no-print absolute inset-0 z-10 flex items-start justify-center rounded-lg bg-surface/70 pt-16 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-accent shadow-md">
                    <CircleNotch size={16} className="animate-spin" aria-hidden="true" />
                    Redrawing the worksheet…
                  </div>
                </div>
              )}
              <WorksheetSheet
                worksheet={worksheet}
                editable={generatingVersionId !== activeVersion?.id}
                selectedQuestions={selectedQuestions}
                onSelectQuestion={(question) => setSelectedQuestions((current) => current.includes(question) ? current : [...current, question])}
                onCloseQuestion={(question) => setSelectedQuestions((current) => current.filter((item) => item !== question))}
                busyQuestions={busyQuestions}
                onReviseQuestion={reviseQuestion}
              />
            </div>
          </>
        ) : generatingVersionId ? (
          <div className="no-print flex h-full items-center justify-center">
            <div className="flex max-w-xs flex-col items-center gap-3 text-center">
              <CircleNotch size={30} className="animate-spin text-accent" aria-hidden="true" />
              <p className="text-sm font-medium">Generating {versions.find((version) => version.id === generatingVersionId)?.label}…</p>
              <p className="text-xs leading-5 text-muted">You can switch between versions while this runs.</p>
            </div>
          </div>
        ) : (
          <div className="no-print flex h-full items-center justify-center">
            <div className="flex max-w-xs flex-col items-center gap-2 text-center">
              <FileDashed size={32} className="text-muted" aria-hidden="true" />
              <p className="text-sm text-muted">
                The worksheet appears here. Ask for one on the left, then print it.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
