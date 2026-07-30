import { extractText, getResolvedPDFJS } from 'unpdf';
import type { Chapter } from './types';

/**
 * Chapter boundaries are found structurally, never by asking the model.
 * A model split is slow and, worse, a wrong split stays invisible until the
 * worksheet comes out subtly wrong.
 *
 * Three strategies, in descending order of reliability:
 *   1. the PDF's own outline / bookmark tree  — free and exact
 *   2. a regex for "Chapter N" at the start of a line
 *   3. give up cleanly and treat the whole book as one chapter
 */

type Boundary = { title: string; startPage: number };

/** Strategy 1: the outline the publisher already embedded. */
async function fromOutline(data: Uint8Array): Promise<Boundary[]> {
  try {
    const pdfjs = await getResolvedPDFJS();
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const outline = await doc.getOutline();
    if (!outline?.length) return [];

    const boundaries: Boundary[] = [];
    for (const item of outline) {
      try {
        const dest =
          typeof item.dest === 'string'
            ? await doc.getDestination(item.dest)
            : item.dest;
        if (!dest) continue;
        const pageIndex = await doc.getPageIndex(dest[0]);
        boundaries.push({ title: item.title.trim(), startPage: pageIndex + 1 });
      } catch {
        // One bad outline entry shouldn't lose the whole tree.
      }
    }
    return boundaries;
  } catch {
    return [];
  }
}

/** Strategy 2: look for a chapter heading at the top of a line. */
function fromHeadings(pages: string[]): Boundary[] {
  const re = /^\s*(chapter|unit|lesson)\s+(\d+|[ivxlc]+)\b[.:—-]*\s*(.*)$/im;
  const boundaries: Boundary[] = [];

  pages.forEach((text, i) => {
    for (const line of text.split('\n').slice(0, 12)) {
      const m = line.match(re);
      if (!m) continue;
      const label = `${m[1]} ${m[2]}`.replace(/\b\w/g, (c) => c.toUpperCase());
      const rest = m[3]?.trim();
      boundaries.push({
        title: rest ? `${label}: ${rest}` : label,
        startPage: i + 1,
      });
      break;
    }
  });

  // A running header repeats the SAME title on every page of a chapter; a real
  // chapter opening is distinct. So collapse by title and keep the first page it
  // appears on — that page is the chapter start either way. (Counting matches
  // instead would throw away a short book whose chapters are one page each.)
  const firstPageOfTitle = new Map<string, Boundary>();
  for (const b of boundaries) {
    const key = b.title.toLowerCase().replace(/\s+/g, ' ').trim();
    const seen = firstPageOfTitle.get(key);
    if (!seen || b.startPage < seen.startPage) firstPageOfTitle.set(key, b);
  }

  return [...firstPageOfTitle.values()].sort((a, b) => a.startPage - b.startPage);
}

export type IndexResult = {
  chapters: Chapter[];
  pageCount: number;
  /** Which strategy produced the split — surfaced in the UI so it can be trusted or overridden. */
  method: 'outline' | 'headings' | 'whole-book';
  texts: Record<string, string>;
};

export async function indexPdf(buffer: Buffer): Promise<IndexResult> {
  const data = new Uint8Array(buffer);

  const { totalPages, text: pages } = await extractText(data, {
    mergePages: false,
  });
  const pageTexts = pages as string[];

  let boundaries = await fromOutline(data);
  let method: IndexResult['method'] = 'outline';

  if (boundaries.length < 2) {
    boundaries = fromHeadings(pageTexts);
    method = 'headings';
  }

  if (boundaries.length < 1) {
    boundaries = [{ title: 'Full text', startPage: 1 }];
    method = 'whole-book';
  }

  boundaries.sort((a, b) => a.startPage - b.startPage);

  const chapters: Chapter[] = [];
  const texts: Record<string, string> = {};

  boundaries.forEach((b, i) => {
    const startPage = Math.max(1, b.startPage);
    const endPage =
      i + 1 < boundaries.length ? boundaries[i + 1].startPage - 1 : totalPages;
    if (endPage < startPage) return;

    const id = `ch${String(chapters.length + 1).padStart(2, '0')}`;
    // Page markers survive into the stored text so the model can cite which
    // book page a question came from — see worksheetSystemPrompt.
    const text = pageTexts
      .slice(startPage - 1, endPage)
      .map((pageText, offset) => `[[page ${startPage + offset}]]\n${pageText}`)
      .join('\n\n')
      .trim();

    texts[id] = text;
    chapters.push({
      id,
      title: b.title || `Chapter ${chapters.length + 1}`,
      startPage,
      endPage,
      charCount: text.length,
      textPath: `chapters/${id}.txt`,
    });
  });

  return { chapters, pageCount: totalPages, method, texts };
}

/** Indexes one NCERT chapter PDF. Its title is taken only from page one. */
export async function indexChapterPdf(
  buffer: Buffer,
  fallbackTitle: string,
): Promise<IndexResult> {
  const { totalPages, text: pages } = await extractText(new Uint8Array(buffer), {
    mergePages: false,
  });
  const pageTexts = pages as string[];
  const firstPage = pageTexts[0] ?? '';
  const title = titleFromFirstPage(firstPage, fallbackTitle);
  const text = pageTexts
    .map((pageText, i) => `[[page ${i + 1}]]\n${pageText}`)
    .join('\n\n')
    .trim();
  const chapter: Chapter = {
    id: 'ch01',
    title,
    startPage: 1,
    endPage: totalPages,
    charCount: text.length,
    textPath: 'chapters/ch01.txt',
  };
  return {
    chapters: [chapter],
    pageCount: totalPages,
    method: 'whole-book',
    texts: { ch01: text },
  };
}

function titleFromFirstPage(firstPage: string, fallbackTitle: string): string {
  const lines = firstPage
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 3 && line.length <= 140);
  const headingIndex = lines.findIndex((line) => /^(chapter|unit|lesson)\s+[\divxlc]+\b/i.test(line));
  if (headingIndex >= 0) {
    const heading = lines[headingIndex];
    const next = lines[headingIndex + 1];
    return next && !/^(page|contents)\b/i.test(next) ? `${heading}: ${next}` : heading;
  }
  return lines[0] ?? fallbackTitle;
}
