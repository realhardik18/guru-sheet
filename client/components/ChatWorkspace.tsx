'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  ChatCircleDots,
  CircleNotch,
  FileDashed,
  ListChecks,
  NotePencil,
  PaperPlaneRight,
  Printer,
  WarningCircle,
} from '@phosphor-icons/react';
import { WorksheetSheet } from './Worksheet';
import { STARTER_PROMPTS } from '@/lib/ai/prompts';
import type { Question, Worksheet } from '@/lib/ai/schema';
import type { Chat } from '@/lib/types';
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
}: {
  chat: Chat;
  chapterLabel: string;
}) {
  const [input, setInput] = useState('');
  const [worksheet, setWorksheet] = useState<Worksheet | undefined>(chat.worksheet);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [busyQuestion, setBusyQuestion] = useState<Question | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    messages: toUIMessages(chat.messages),
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { bookId: chat.bookId, chapterId: chat.chapterId },
    }),
  });

  const streaming = status === 'streaming' || status === 'submitted';
  const busy = streaming || generating;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streaming]);

  // Persist once both the reply and the sheet have settled.
  useEffect(() => {
    if (busy || messages.length === 0) return;
    void persistChat(
      chat.id,
      messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: textOf(m),
      })),
      worksheet,
    );
  }, [busy, messages, worksheet, chat.id]);

  async function generateWorksheet(instruction: string, previous?: Worksheet) {
    setGenerating(true);
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? 'Could not generate a worksheet.');
        return;
      }
      setWorksheet(data.worksheet);
      setSelectedQuestion(null);
      if (data.fallback) {
        setNotice('Model unavailable — showing a saved worksheet.');
      }
    } catch {
      setNotice('Could not reach the model.');
    } finally {
      setGenerating(false);
    }
  }

  async function reviseQuestion(question: Question, instruction: string) {
    if (!worksheet || !instruction.trim()) return;
    setBusyQuestion(question);
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? 'Could not revise this question.');
        return;
      }
      setWorksheet((current) => {
        if (!current) return current;
        const index = current.questions.indexOf(question);
        if (index === -1) return current;
        const questions = [...current.questions];
        questions[index] = data.question;
        return {
          ...current,
          questions,
          totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
        };
      });
      setSelectedQuestion(null);
    } catch {
      setNotice('Could not reach the model.');
    } finally {
      setBusyQuestion(null);
    }
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput('');
    // Chat and worksheet run in parallel: she reads the reply while the sheet
    // is still rendering, so neither waits on the other.
    void sendMessage({ text: trimmed });
    void generateWorksheet(trimmed, worksheet);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* ---------------- Chat ---------------- */}
      <section className="no-print flex min-h-0 w-full flex-col border-line lg:w-[560px] lg:shrink-0 lg:border-r">
        <header className="flex items-center gap-2.5 border-b border-line px-5 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <ChatCircleDots size={17} weight="fill" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-semibold">{chat.title}</h1>
            <p className="truncate text-xs text-muted">{chapterLabel}</p>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Tell me what you need. I&rsquo;ll build it from this chapter only.
              </p>
              <div className="flex flex-wrap gap-2">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => submit(p)}
                    className="rounded-full border border-line px-3 py-1.5 text-left text-xs transition-colors hover:border-accent hover:bg-accent-soft"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {generating && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <NotePencil size={14} className="animate-pulse text-accent" aria-hidden="true" />
              <span className="shimmer-text">Building the worksheet…</span>
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
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={2}
              placeholder="Make a 20-minute worksheet, three levels…"
              className="min-h-[3rem] flex-1 resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-[2.75rem] w-[2.75rem] shrink-0 items-center justify-center rounded-md bg-accent text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? (
                <CircleNotch size={17} className="animate-spin" aria-hidden="true" />
              ) : (
                <PaperPlaneRight size={17} weight="fill" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>
      </section>

      {/* ---------------- Worksheet ---------------- */}
      <section className="print-root min-h-0 flex-1 overflow-y-auto bg-background p-5">
        {worksheet ? (
          <>
            <div className="no-print mx-auto mb-3 flex max-w-[210mm] items-center gap-2">
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
              {generating && (
                <div className="no-print absolute inset-0 z-10 flex items-start justify-center rounded-lg bg-surface/70 pt-16 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-accent shadow-md">
                    <CircleNotch size={16} className="animate-spin" aria-hidden="true" />
                    Redrawing the worksheet…
                  </div>
                </div>
              )}
              <WorksheetSheet
                worksheet={worksheet}
                editable={!generating}
                selectedQuestion={selectedQuestion}
                onSelectQuestion={setSelectedQuestion}
                busyQuestion={busyQuestion}
                onReviseQuestion={reviseQuestion}
              />
            </div>
          </>
        ) : generating ? (
          <WorksheetSkeleton />
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

function WorksheetSkeleton() {
  return (
    <div
      className="worksheet-skeleton mx-auto max-w-[210mm] animate-pulse rounded-lg border border-line bg-surface p-8 shadow-sm sm:p-10"
      aria-hidden
    >
      <div className="flex items-center gap-2 text-accent">
        <NotePencil size={16} className="shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">Drafting your worksheet…</span>
      </div>
      <div className="mt-4 h-6 w-2/3 rounded bg-line" />
      <div className="mt-6 grid grid-cols-3 gap-6">
        <div className="h-3 rounded bg-line" />
        <div className="h-3 rounded bg-line" />
        <div className="h-3 rounded bg-line" />
      </div>
      <div className="mt-9 space-y-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3.5 rounded bg-line" style={{ width: `${85 - i * 8}%` }} />
            <div className="h-3.5 rounded bg-line" style={{ width: `${55 - i * 4}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
