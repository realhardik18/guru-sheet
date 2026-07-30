import { promises as fs } from 'fs';
import path from 'path';
import type { Book, Chat, LibraryCollection } from './types';
import { requireAppConfig } from './config';
import { normalizeImportedChapterTitle } from './indexer';

/**
 * All managed-library writes live here. The NCERT importer is the only reader
 * of an external teacher-selected source folder.
 *
 * The configured Guru Sheet folder is the only data home. No route or page
 * needs to know where the teacher chose to keep it.
 */
async function directories() {
  const { dataDir } = await requireAppConfig();
  return {
    books: path.join(dataDir, 'books'),
    chats: path.join(dataDir, 'chats'),
    collections: path.join(dataDir, 'collections'),
  };
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function listBooks(): Promise<Book[]> {
  const { books: booksDir } = await directories();
  const ids = await listDirs(booksDir);
  const books = await Promise.all(ids.map((id) => getBook(id)));
  return books
    .filter((b): b is Book => b !== null)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function listBooksForCollection(collectionId: string): Promise<Book[]> {
  const books = await listBooks();
  return books.filter((book) => book.collectionId === collectionId);
}

export async function getBook(bookId: string): Promise<Book | null> {
  const { books } = await directories();
  return readJson<Book>(path.join(books, bookId, 'meta.json'));
}

export async function getBookPdf(bookId: string): Promise<Buffer | null> {
  const { books } = await directories();
  if (!(await getBook(bookId))) return null;
  try {
    return await fs.readFile(path.join(books, bookId, 'original.pdf'));
  } catch {
    return null;
  }
}

export async function saveBook(book: Book): Promise<void> {
  const { books } = await directories();
  const dir = path.join(books, book.id);
  await fs.mkdir(path.join(dir, 'chapters'), { recursive: true });
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(book, null, 2));
}

/** Saves the uploaded source PDF and its extracted index as one book record. */
export async function saveIndexedBook(
  book: Book,
  pdf: Buffer,
  texts: Record<string, string>,
): Promise<void> {
  const { books } = await directories();
  const dir = path.join(books, book.id);
  await fs.mkdir(path.join(dir, 'chapters'), { recursive: true });
  await fs.writeFile(path.join(dir, 'original.pdf'), pdf);
  await Promise.all(
    book.chapters.map((chapter) =>
      fs.writeFile(path.join(dir, chapter.textPath), texts[chapter.id] ?? ''),
    ),
  );
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(book, null, 2));
}

export async function listCollections(): Promise<LibraryCollection[]> {
  const { collections } = await directories();
  const ids = await listDirs(collections);
  const items = await Promise.all(
    ids.map((id) => readJson<LibraryCollection>(path.join(collections, id, 'meta.json'))),
  );
  return items
    .filter((item): item is LibraryCollection => item !== null)
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export async function getCollection(collectionId: string): Promise<LibraryCollection | null> {
  const { collections } = await directories();
  return readJson<LibraryCollection>(path.join(collections, collectionId, 'meta.json'));
}

export async function findCollection(
  name: string,
  classLevel: string,
  subject: string,
): Promise<LibraryCollection | null> {
  const normalized = (value: string) => value.trim().toLocaleLowerCase();
  const collections = await listCollections();
  return (
    collections.find(
      (collection) =>
        normalized(collection.name) === normalized(name) &&
        normalized(collection.classLevel) === normalized(classLevel) &&
        normalized(collection.subject) === normalized(subject),
    ) ?? null
  );
}

export async function saveCollection(collection: LibraryCollection): Promise<void> {
  const { collections } = await directories();
  const dir = path.join(collections, collection.id);
  await fs.mkdir(path.join(dir, 'source-zips'), { recursive: true });
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(collection, null, 2));
}

export async function saveCollectionArchive(
  collectionId: string,
  filename: string,
  archive: Buffer,
): Promise<void> {
  const { collections } = await directories();
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]+/g, '-');
  await fs.mkdir(path.join(collections, collectionId, 'source-zips'), { recursive: true });
  await fs.writeFile(path.join(collections, collectionId, 'source-zips', safeName), archive);
}

export async function deleteBook(bookId: string): Promise<void> {
  const { books } = await directories();
  await fs.rm(path.join(books, bookId), { recursive: true, force: true });
}

/** Removes an imported collection together with the chapter books it owns. */
export async function deleteCollection(collectionId: string): Promise<boolean> {
  const collection = await getCollection(collectionId);
  if (!collection) return false;

  const { books, chats, collections } = await directories();
  const collectionBooks = await listBooksForCollection(collectionId);
  const bookIds = new Set([...collection.bookIds, ...collectionBooks.map((book) => book.id)]);
  const chatFiles = await fs.readdir(chats).catch(() => [] as string[]);
  const relatedChats = await Promise.all(
    chatFiles
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => ({ file, chat: await readJson<Chat>(path.join(chats, file)) })),
  );

  await Promise.all([
    ...[...bookIds].map((bookId) => fs.rm(path.join(books, bookId), { recursive: true, force: true })),
    ...relatedChats
      .filter(({ chat }) => chat?.bookId && bookIds.has(chat.bookId))
      .map(({ file }) => fs.rm(path.join(chats, file), { force: true })),
    fs.rm(path.join(collections, collectionId), { recursive: true, force: true }),
  ]);

  return true;
}

/** Returns '' when the chapter text is missing, so callers can flag it. */
export async function getChapterText(bookId: string, chapterId: string): Promise<string> {
  const { books } = await directories();
  const book = await getBook(bookId);
  const chapter = book?.chapters.find((c) => c.id === chapterId);
  if (!chapter) return '';
  try {
    return await fs.readFile(path.join(books, bookId, chapter.textPath), 'utf-8');
  } catch {
    return '';
  }
}

export async function listChats(): Promise<Chat[]> {
  const { chats: chatsDir } = await directories();
  let files: string[] = [];
  try {
    files = (await fs.readdir(chatsDir)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const chats = await Promise.all(
    files.map((f) => readJson<Chat>(path.join(chatsDir, f))),
  );
  return chats
    .filter((c): c is Chat => c !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const { chats } = await directories();
  return readJson<Chat>(path.join(chats, `${chatId}.json`));
}

export async function saveChat(chat: Chat): Promise<void> {
  const { chats } = await directories();
  await fs.mkdir(chats, { recursive: true });
  await fs.writeFile(
    path.join(chats, `${chat.id}.json`),
    JSON.stringify(chat, null, 2),
  );
}

/** Repairs extracted NCERT headings and the chats that inherited them in one pass. */
export async function repairCollectionTitles(collectionId: string): Promise<number> {
  const collection = await getCollection(collectionId);
  if (!collection) return 0;
  const books = (await Promise.all(collection.bookIds.map((id) => getBook(id)))).filter((book): book is Book => book !== null);
  const byId = new Map(books.map((book) => [book.id, book]));
  let changed = 0;
  await Promise.all(books.map(async (book) => {
    const chapters = book.chapters.map((chapter) => ({ ...chapter, title: normalizeImportedChapterTitle(chapter.title) }));
    const title = normalizeImportedChapterTitle(book.title);
    if (title !== book.title || chapters.some((chapter, index) => chapter.title !== book.chapters[index].title)) {
      changed++;
      await saveBook({ ...book, title, chapters });
    }
  }));
  const chats = await listChats();
  await Promise.all(chats.filter((chat) => chat.bookId && byId.has(chat.bookId)).map(async (chat) => {
    const book = byId.get(chat.bookId!);
    const chapterTitle = book?.chapters.find((chapter) => chapter.id === chat.chapterId)?.title;
    const title = chapterTitle ? normalizeImportedChapterTitle(chapterTitle) : normalizeImportedChapterTitle(chat.title);
    if (title !== chat.title) { changed++; await saveChat({ ...chat, title }); }
  }));
  return changed;
}

export async function updateChatTags(chatId: string, tagIds: string[]): Promise<boolean> {
  const chat = await getChat(chatId);
  if (!chat) return false;
  await saveChat({ ...chat, tagIds });
  return true;
}

export async function removeTagFromChats(tagId: string): Promise<void> {
  const chats = await listChats();
  await Promise.all(chats.map(async (chat) => {
    if (!chat.tagIds?.includes(tagId)) return;
    await saveChat({ ...chat, tagIds: chat.tagIds.filter((id) => id !== tagId) });
  }));
}

export async function renameChat(chatId: string, title: string): Promise<boolean> {
  const chat = await getChat(chatId);
  if (!chat) return false;
  await saveChat({ ...chat, title });
  return true;
}

export async function deleteChat(chatId: string): Promise<void> {
  const { chats } = await directories();
  await fs.rm(path.join(chats, `${chatId}.json`), { force: true });
}
