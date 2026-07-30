import { promises as fs } from 'fs';
import path from 'path';
import * as yauzl from 'yauzl';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { indexChapterPdf } from './indexer';
import { saveCollection, saveCollectionArchive, saveIndexedBook } from './store';
import type { Book, LibraryCollection } from './types';
import { hasApiKey, worksheetModel } from './ai/model';

const MAX_PDF_BYTES = 80 * 1024 * 1024;

export type NcertImportResult = {
  collection: LibraryCollection;
  archiveCount: number;
  importedCount: number;
  failures: Array<{ file: string; error: string }>;
};

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(value: string) {
  return (
    value
      .replace(/\.pdf$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'chapter'
  );
}

function fallbackTitle(filename: string) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type PendingChapter = { id: string; pdf: Buffer; indexed: Awaited<ReturnType<typeof indexChapterPdf>> };

function firstPageText(indexed: PendingChapter['indexed']) {
  return (indexed.texts.ch01 ?? '').split(/\[\[page 2\]\]/)[0].replace(/\[\[page 1\]\]/, '').trim().slice(0, 1400);
}

async function nameChaptersInBatch(chapters: PendingChapter[]): Promise<Map<string, string>> {
  const fallback = new Map(chapters.map((chapter) => [chapter.id, chapter.indexed.chapters[0].title]));
  if (!hasApiKey() || chapters.length === 0) return fallback;
  const schema = z.object({ titles: z.array(z.object({ id: z.string(), title: z.string().min(3).max(120) })) });
  for (let offset = 0; offset < chapters.length; offset += 10) {
    const batch = chapters.slice(offset, offset + 10);
    const prompt = `Name these NCERT chapter PDFs from their first-page text. Return one concise, student-facing chapter title per ID. Remove page numbers, headers, publisher text, codes, and repeated running titles. Do not invent a topic; use the actual chapter heading.\n\n${batch.map((chapter) => `ID: ${chapter.id}\nFIRST PAGE:\n${firstPageText(chapter.indexed)}`).join('\n\n---\n\n')}`;
    try {
      const { output } = await generateText({ model: worksheetModel, output: Output.object({ schema }), prompt });
      for (const item of output.titles) {
        if (fallback.has(item.id) && item.title.trim()) fallback.set(item.id, item.title.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim());
      }
    } catch (error) {
      console.warn('[ncert import] batch chapter naming unavailable; using extracted headings for this batch.', error);
    }
  }
  return fallback;
}

function isSafePdfEntry(entryPath: string) {
  return (
    !entryPath.startsWith('/') &&
    !entryPath.includes('\\') &&
    !entryPath.split('/').includes('..') &&
    path.posix.extname(entryPath).toLowerCase() === '.pdf'
  );
}

async function streamToBuffer(stream: NodeJS.ReadableStream, maxBytes: number) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new Error('PDF is larger than the 80 MB import limit.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export async function importNcertZip(input: {
  sourceZip: string;
  name: string;
  classLevel: string;
  subject: string;
}): Promise<NcertImportResult> {
  const sourceZip = path.resolve(input.sourceZip.trim());
  if (!path.isAbsolute(input.sourceZip.trim())) {
    throw new Error('Choose an absolute NCERT ZIP file path.');
  }
  if (path.extname(sourceZip).toLowerCase() !== '.zip') throw new Error('Choose a .zip file.');
  const sourceStats = await fs.stat(sourceZip).catch(() => null);
  if (!sourceStats?.isFile()) throw new Error('The selected NCERT ZIP file is unavailable.');

  const collection: LibraryCollection = {
    id: `ncert-${newId()}`,
    name: input.name.trim(),
    classLevel: input.classLevel.trim(),
    subject: input.subject.trim(),
    importedAt: new Date().toISOString(),
    bookIds: [],
  };
  await saveCollection(collection);

  const failures: NcertImportResult['failures'] = [];
  const pending: PendingChapter[] = [];
  for (const [archiveIndex, zipPath] of [sourceZip].entries()) {
    const archiveLabel = path.basename(zipPath);
    try {
      await saveCollectionArchive(
        collection.id,
        `${String(archiveIndex + 1).padStart(3, '0')}-${path.basename(zipPath)}`,
        await fs.readFile(zipPath),
      );
      const archive = await yauzl.openPromise(zipPath, {
        lazyEntries: true,
        validateEntrySizes: true,
      });
      let foundPdf = false;
      try {
        for await (const entry of archive.eachEntry()) {
          if (!isSafePdfEntry(entry.fileName)) continue;
          foundPdf = true;
          const entryLabel = `${archiveLabel} → ${entry.fileName}`;
          try {
            if (entry.uncompressedSize > MAX_PDF_BYTES) {
              throw new Error('PDF is larger than the 80 MB import limit.');
            }
            const pdf = await streamToBuffer(
              await archive.openReadStreamPromise(entry),
              MAX_PDF_BYTES,
            );
            const indexed = await indexChapterPdf(pdf, fallbackTitle(entry.fileName));
            const id = `${slugify(entry.fileName)}-${newId()}`;
            pending.push({ id, pdf, indexed });
          } catch (error) {
            failures.push({
              file: entryLabel,
              error: error instanceof Error ? error.message : 'Could not index this PDF.',
            });
          }
        }
      } finally {
        archive.close();
      }
      if (!foundPdf) failures.push({ file: archiveLabel, error: 'No safe PDF files found in this ZIP.' });
    } catch (error) {
      failures.push({
        file: archiveLabel,
        error: error instanceof Error ? error.message : 'Could not read this ZIP.',
      });
    }
  }

  const titles = await nameChaptersInBatch(pending);
  for (const item of pending) {
    const title = titles.get(item.id) ?? item.indexed.chapters[0].title;
    const chapters = item.indexed.chapters.map((chapter) => ({ ...chapter, title }));
    const book: Book = { id: item.id, title, uploadedAt: new Date().toISOString(), pageCount: item.indexed.pageCount, chapters, collectionId: collection.id };
    await saveIndexedBook(book, item.pdf, item.indexed.texts);
    collection.bookIds.push(item.id);
  }

  await saveCollection(collection);
  return {
    collection,
    archiveCount: 1,
    importedCount: collection.bookIds.length,
    failures,
  };
}
