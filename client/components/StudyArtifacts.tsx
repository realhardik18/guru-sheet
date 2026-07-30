import type { ReactNode } from 'react';
import type { MindMapArtifact, NotesArtifact } from '@/lib/types';

export function NotesSheet({ notes }: { notes: NotesArtifact }) {
  return <article className="worksheet mx-auto max-w-[210mm] bg-surface p-8 text-foreground shadow-sm sm:p-10">
    <header className="border-b-2 border-foreground pb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Short notes</p>
      <h1 className="mt-1 text-2xl font-bold">{notes.title}</h1>
    </header>
    <div className="mt-6 grid gap-5">
      {notes.sections.map((section, sectionIndex) => <section key={`${section.heading}-${sectionIndex}`}>
        <h2 className="text-sm font-semibold text-accent">{section.heading}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
          {section.points.map((point, pointIndex) => <li key={`${sectionIndex}-${pointIndex}`}><RichInlineText text={point} /></li>)}
        </ul>
      </section>)}
    </div>
    <aside className="mt-7 rounded-lg border border-accent/30 bg-accent-soft p-4">
      <h2 className="text-sm font-semibold text-accent">Quick recap</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {notes.recap.map((item, itemIndex) => <li key={`recap-${itemIndex}`}><RichInlineText text={item} /></li>)}
      </ul>
    </aside>
  </article>;
}

export function MindMapSheet({ map }: { map: MindMapArtifact }) {
  const midpoint = Math.ceil(map.branches.length / 2);
  const columns = [map.branches.slice(0, midpoint), map.branches.slice(midpoint)];
  return <article className="worksheet mx-auto max-w-[210mm] bg-surface p-8 text-foreground shadow-sm sm:p-10">
    <header className="border-b-2 border-foreground pb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Mind map</p>
      <h1 className="mt-1 text-2xl font-bold">{map.title}</h1>
    </header>
    <div className="mindmap-layout mt-6 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)]">
      <MindMapColumn branches={columns[0]} side="left" />
      <div className="mindmap-center order-first rounded-2xl bg-accent px-4 py-6 text-center text-base font-bold leading-snug text-white shadow-sm sm:order-none">{map.title}</div>
      <MindMapColumn branches={columns[1]} side="right" />
    </div>
  </article>;
}

function RichInlineText({ text }: { text: string }) {
  return <>{renderMarkdownWithMath(text)}</>;
}

function renderMarkdownWithMath(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const parts = text.split(/(\$[^$]+\$)/g);
  parts.forEach((part, partIndex) => {
    if (!part) return;
    if (part.startsWith('$') && part.endsWith('$')) {
      nodes.push(<MathInline key={`math-${partIndex}`} value={part.slice(1, -1)} />);
      return;
    }
    nodes.push(...renderMarkdownInline(part, `text-${partIndex}`));
  });
  return nodes;
}

function renderMarkdownInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const value = match[0];
    const indexKey = `${keyPrefix}-${match.index}`;
    if (value.startsWith('**')) nodes.push(<strong key={indexKey}>{value.slice(2, -2)}</strong>);
    else nodes.push(<em key={indexKey}>{value.slice(1, -1)}</em>);
    lastIndex = match.index + value.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function MathInline({ value }: { value: string }) {
  return <span className="math-inline">{renderMath(normalizeLatex(value))}</span>;
}

function normalizeLatex(value: string) {
  return value
    .replace(/\f/g, '\\f')
    .replace(/(?<!\\)rac\{/g, '\\frac{')
    .replace(/(?<!\\)frac\{/g, '\\frac{')
    .replace(/(?<!\\)imes\b/g, '\\times')
    .replace(/(?<!\\)ext\{/g, '\\text{')
    .replace(/π/g, '\\pi');
}

function renderMath(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let index = 0;
  while (index < value.length) {
    if (value.startsWith('\\frac{', index)) {
      const numerator = readBrace(value, index + 5);
      const denominator = numerator ? readBrace(value, numerator.end) : null;
      if (numerator && denominator) {
        nodes.push(<span key={`frac-${index}`} className="math-frac"><span>{renderMath(numerator.value)}</span><span>{renderMath(denominator.value)}</span></span>);
        index = denominator.end;
        continue;
      }
    }
    if (value.startsWith('\\text{', index)) {
      const content = readBrace(value, index + 5);
      if (content) {
        nodes.push(<span key={`text-${index}`}>{content.value}</span>);
        index = content.end;
        continue;
      }
    }
    if (value.startsWith('\\times', index)) { nodes.push(<span key={`times-${index}`}>×</span>); index += 6; continue; }
    if (value.startsWith('\\pi', index)) { nodes.push(<span key={`pi-${index}`}>π</span>); index += 3; continue; }
    if (value[index] === '^' || value[index] === '_') {
      const Script = value[index] === '^' ? 'sup' : 'sub';
      const script = value[index + 1] === '{' ? readBrace(value, index + 1) : { value: value[index + 1] ?? '', end: index + 2 };
      if (!script) { nodes.push(value[index]); index += 1; continue; }
      nodes.push(<Script key={`script-${index}`}>{renderMath(script.value)}</Script>);
      index = script.end;
      continue;
    }
    nodes.push(value[index]);
    index += 1;
  }
  return nodes;
}

function readBrace(value: string, openIndex: number): { value: string; end: number } | null {
  if (value[openIndex] !== '{') return null;
  let depth = 0;
  for (let index = openIndex; index < value.length; index++) {
    if (value[index] === '{') depth += 1;
    if (value[index] === '}') depth -= 1;
    if (depth === 0) return { value: value.slice(openIndex + 1, index), end: index + 1 };
  }
  return null;
}

function MindMapColumn({ branches, side }: { branches: MindMapArtifact['branches']; side: 'left' | 'right' }) {
  return <div className={`mindmap-column mindmap-column-${side} space-y-3`}>
    {branches.map((branch, branchIndex) => <section key={`${branch.label}-${branchIndex}`} className="mindmap-branch break-inside-avoid rounded-xl border border-line bg-background p-3">
      <h2 className="text-sm font-semibold leading-snug text-accent">{branch.label}</h2>
      <ul className="mindmap-children mt-2 space-y-1">
        {branch.children.map((child, childIndex) => <li key={`${branchIndex}-${childIndex}`} className="mindmap-child rounded-md bg-surface px-2 py-1 text-xs leading-snug text-foreground">{child}</li>)}
      </ul>
    </section>)}
  </div>;
}
