import { promises as fs } from 'fs';
import path from 'path';
import * as yauzl from 'yauzl';
import { indexChapterPdf } from './indexer';
import { saveCollection, saveCollectionArchive, saveIndexedBook } from './store';
import type { Book, LibraryCollection } from './types';

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
            const book: Book = {
              id,
              title: indexed.chapters[0].title,
              uploadedAt: new Date().toISOString(),
              pageCount: indexed.pageCount,
              chapters: indexed.chapters,
              collectionId: collection.id,
            };
            await saveIndexedBook(book, pdf, indexed.texts);
            collection.bookIds.push(id);
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

  await saveCollection(collection);
  return {
    collection,
    archiveCount: 1,
    importedCount: collection.bookIds.length,
    failures,
  };
}
