import type { Worksheet } from './ai/schema';

export type Chapter = {
  id: string; // "ch01"
  title: string;
  startPage: number;
  endPage: number;
  charCount: number; // surfaces bad extraction immediately
  textPath: string; // "chapters/ch01.txt"
};

export type Book = {
  id: string;
  title: string;
  uploadedAt: string;
  pageCount: number;
  chapters: Chapter[];
  /** Set when the book is an individual NCERT chapter in a collection. */
  collectionId?: string;
};

export type LibraryCollection = {
  id: string;
  name: string;
  classLevel: string;
  subject: string;
  importedAt: string;
  bookIds: string[];
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type Chat = {
  id: string;
  title: string;
  bookId?: string;
  chapterId?: string;
  createdAt: string;
  messages: ChatMessage[];
  worksheet?: Worksheet;
};

/** Below this, a chapter is almost certainly a scanned image, not text. */
export const LOW_TEXT_THRESHOLD = 500;
