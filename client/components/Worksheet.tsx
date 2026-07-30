'use client';

import { Fragment, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowsLeftRight,
  BookmarkSimple,
  CheckSquare,
  CircleNotch,
  ListBullets,
  ListChecks,
  PencilSimple,
  RocketLaunch,
  Target,
  TextAa,
  TextT,
  X,
} from '@phosphor-icons/react';
import { TIERS, TIER_LABELS, type Question, type Worksheet } from '@/lib/ai/schema';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const TIER_ICONS = {
  below: ArrowDown,
  at: Target,
  stretch: RocketLaunch,
} as const;

const EASIER_INSTRUCTION =
  'Make this question easier — reduce the difficulty within the same tier.';
const HARDER_INSTRUCTION =
  'Make this question harder — increase the difficulty within the same tier.';

const QUESTION_TYPE_ACTIONS = [
  { type: 'mcq', label: 'Multiple choice', badge: 'Multiple choice', Icon: ListBullets },
  { type: 'fill_blank', label: 'Fill in the blank', badge: 'Fill the blank', Icon: TextT },
  { type: 'true_false', label: 'True or false with correction', badge: 'True or false', Icon: CheckSquare },
  { type: 'one_line', label: 'One-word or one-line answer', badge: 'One line answer', Icon: TextAa },
  { type: 'short_answer', label: 'Short answer', badge: 'Short written answer', Icon: PencilSimple },
  { type: 'match', label: 'Match the following', badge: 'Match the pairs', Icon: ArrowsLeftRight },
  { type: 'define_list_state', label: 'Define, list, or state', badge: 'Define or list', Icon: ListChecks },
] as const;

function changeTypeInstruction(type: (typeof QUESTION_TYPE_ACTIONS)[number]['type']) {
  return `Transform this into a ${type} question. Preserve the concept and tier. For mcq, provide exactly four plausible options with one correct answer; for match, provide at least two left/right pairs; for every other type omit options and matching pairs. For true_false, require a correction when the statement is false.`;
}

function RuledLines({ count }: { count: number }) {
  return (
    <div className="answer-lines mt-2 space-y-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-b border-dotted border-line" />
      ))}
    </div>
  );
}

function QuestionEditor({
  busy,
  questionType,
  onRevise,
  onClose,
}: {
  busy: boolean;
  questionType: Question['type'];
  onRevise: (instruction: string, targetType?: Question['type']) => void;
  onClose: () => void;
}) {
  const [customText, setCustomText] = useState('');

  return (
    <div
      className="no-print mt-2 flex flex-wrap items-center gap-2 rounded-md border border-accent/40 bg-accent-soft p-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex w-full flex-wrap items-center gap-1.5 border-b border-accent/20 pb-2">
        <span className="mr-1 text-xs font-medium text-muted">Type</span>
        {QUESTION_TYPE_ACTIONS.map(({ type, label, badge, Icon }) => (
          <button
            key={type}
            type="button"
            disabled={busy || questionType === type}
            onClick={() => onRevise(changeTypeInstruction(type), type)}
            aria-label={`Change to ${label}`}
            title={`Change to ${label}`}
            className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition-colors disabled:cursor-default disabled:opacity-45 ${questionType === type ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-muted hover:border-accent hover:text-accent'}`}
          >
            <Icon size={14} weight={questionType === type ? 'fill' : 'regular'} aria-hidden="true" />
            {badge}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onRevise(EASIER_INSTRUCTION)}
        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium transition-colors hover:border-accent disabled:opacity-50"
      >
        <ArrowDown size={11} weight="bold" aria-hidden="true" />
        Easier
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onRevise(HARDER_INSTRUCTION)}
        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium transition-colors hover:border-accent disabled:opacity-50"
      >
        <ArrowUp size={11} weight="bold" aria-hidden="true" />
        Harder
      </button>
      <div className="flex min-w-[180px] flex-1 items-center gap-1.5">
        <input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customText.trim()) {
              e.preventDefault();
              onRevise(customText.trim());
            }
          }}
          placeholder="Or describe a change…"
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
        />
        <button
          type="button"
          disabled={busy || !customText.trim()}
          onClick={() => onRevise(customText.trim())}
          className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Apply
        </button>
      </div>
      {busy ? (
        <CircleNotch size={15} className="shrink-0 animate-spin text-accent" aria-hidden="true" />
      ) : (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-auto shrink-0 text-muted transition-colors hover:text-foreground"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function QuestionBlock({
  q,
  number,
  editable,
  selected,
  busy,
  onSelect,
  onClose,
  onRevise,
}: {
  q: Question;
  number: number;
  editable: boolean;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRevise: (instruction: string, targetType?: Question['type']) => void;
}) {
  return (
    <li
      aria-busy={busy || undefined}
      className={`question relative rounded-md ${
        editable
          ? `cursor-pointer transition-colors ${
              selected ? 'bg-accent-soft ring-1 ring-inset ring-accent' : 'hover:bg-accent-soft/50'
            }`
          : ''
      }`}
      onClick={editable && !selected ? onSelect : undefined}
    >
      <div className="flex gap-3 px-2 py-2">
        <span className="w-6 shrink-0 font-semibold tabular-nums">{number}.</span>
        <div className="min-w-0 flex-1">
          <p className="leading-relaxed">{q.q}</p>

          {q.type === 'mcq' && q.options && (
            <ol className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, i) => (
                <li
                  key={i}
                  className="mcq-option flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-[0.95em]"
                >
                  <span className="option-letter flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted text-[0.7em] font-semibold text-muted">
                    {OPTION_LETTERS[i]}
                  </span>
                  <span>{opt}</span>
                </li>
              ))}
            </ol>
          )}

          {q.type === 'match' && q.matches && (
            <div className="mt-2.5 grid grid-cols-2 overflow-hidden rounded-md border border-line text-sm">
              <div className="border-r border-line bg-accent-soft px-2 py-1.5 font-medium">Column A</div><div className="bg-accent-soft px-2 py-1.5 font-medium">Column B</div>
              {q.matches.map((pair, index) => <Fragment key={index}><div className="border-r border-t border-line px-2 py-1.5">{String.fromCharCode(65 + index)}. {pair.left}</div><div className="border-t border-line px-2 py-1.5">{index + 1}. {pair.right}</div></Fragment>)}
            </div>
          )}
          {(['one_line', 'fill_blank', 'true_false', 'define_list_state', 'short'].includes(q.type)) && <RuledLines count={q.type === 'short' ? 2 : 1} />}
          {(['short_answer', 'long'].includes(q.type)) && <RuledLines count={q.type === 'long' ? 5 : 3} />}
        </div>
        <div className="flex w-14 shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-sm text-muted tabular-nums">[{q.marks}]</span>
          {q.sourcePage != null && (
            <span className="citation flex items-center gap-0.5 text-[10px] text-muted">
              <BookmarkSimple size={10} aria-hidden="true" />
              p.{q.sourcePage}
            </span>
          )}
          {editable && !selected && (
            <PencilSimple size={12} className="no-print text-muted" aria-hidden="true" />
          )}
        </div>
      </div>
      {selected && <QuestionEditor busy={busy} questionType={q.type} onRevise={onRevise} onClose={onClose} />}
      {busy && (
        <div className="no-print absolute inset-0 z-10 flex items-center justify-center rounded-md bg-surface/70 p-4 backdrop-blur-sm">
          <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-full border border-accent/20 bg-surface px-3.5 py-2 text-sm font-medium text-accent shadow-md">
            <CircleNotch size={17} weight="bold" className="animate-spin" aria-hidden="true" />
            Updating this question…
          </div>
        </div>
      )}
    </li>
  );
}

export function WorksheetSheet({
  worksheet,
  editable = false,
  selectedQuestions = [],
  onSelectQuestion,
  onCloseQuestion,
  busyQuestions = [],
  onReviseQuestion,
}: {
  worksheet: Worksheet;
  editable?: boolean;
  selectedQuestions?: Question[];
  onSelectQuestion?: (question: Question) => void;
  onCloseQuestion?: (question: Question) => void;
  busyQuestions?: Question[];
  onReviseQuestion?: (question: Question, questionIndex: number, instruction: string, targetType?: Question['type']) => void;
}) {
  // Preserve the model's ordering within a tier, but always print the tiers in
  // difficulty order so a struggling child starts on something they can do.
  const byTier = TIERS.map((tier) => ({
    tier,
    questions: worksheet.questions.filter((q) => q.tier === tier),
  })).filter((g) => g.questions.length > 0);

  let n = 0;
  const numbered = byTier.map((g) => ({
    ...g,
    questions: g.questions.map((q) => ({ q, number: ++n })),
  }));

  return (
    <article className="worksheet mx-auto max-w-[210mm] bg-surface p-8 text-foreground shadow-sm sm:p-10">
      <header className="worksheet-header border-b-2 border-foreground pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="worksheet-eyebrow text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Class Worksheet
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight">{worksheet.topic}</h1>
            <p className="mt-1 text-sm text-muted">{worksheet.classLevel}</p>
          </div>
          <div className="score-box shrink-0 rounded-md border border-foreground px-3.5 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Score</div>
            <div className="mt-0.5 font-mono text-sm">____ / {worksheet.totalMarks}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <div className="flex items-end gap-2">
            <span className="text-muted">Name</span>
            <span className="flex-1 border-b border-foreground" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-muted">Class</span>
            <span className="flex-1 border-b border-foreground" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-muted">Date</span>
            <span className="flex-1 border-b border-foreground" />
          </div>
        </div>
        <p className="worksheet-instructions mt-4 text-xs italic text-muted">
          Instructions: Answer all questions in the space provided. Read each question
          carefully before you begin.
        </p>
      </header>

      {editable && (
        <p className="no-print mt-4 flex items-center gap-1.5 text-xs text-muted">
          <PencilSimple size={13} aria-hidden="true" />
          Click as many questions as you like to revise them in parallel.
        </p>
      )}

      {numbered.map(({ tier, questions }) => {
        const TierIcon = TIER_ICONS[tier];
        return (
          <section key={tier} className={`tier-section tier-${tier} mt-6`}>
            <h2
              className="tier-heading mb-1.5 flex items-center gap-1.5 border-l-4 pl-2 text-sm font-semibold uppercase tracking-wide"
              style={{ borderColor: 'var(--tier)', color: 'var(--tier)' }}
            >
              <TierIcon size={14} weight="bold" aria-hidden="true" />
              {TIER_LABELS[tier]}
            </h2>
            <ol className="divide-y divide-line/60">
              {questions.map(({ q, number }) => (
                <QuestionBlock
                  key={number}
                  q={q}
                  number={number}
                  editable={editable}
                  selected={selectedQuestions.includes(q)}
                  busy={busyQuestions.includes(q)}
                  onSelect={() => onSelectQuestion?.(q)}
                  onClose={() => onCloseQuestion?.(q)}
                  onRevise={(instruction, targetType) => onReviseQuestion?.(q, worksheet.questions.indexOf(q), instruction, targetType)}
                />
              ))}
            </ol>
          </section>
        );
      })}

      <div className="print-footer" aria-hidden>
        <span>{worksheet.topic}</span>
        <span>GuruSheet</span>
      </div>
    </article>
  );
}
