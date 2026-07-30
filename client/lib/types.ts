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

export type WorksheetFormatTag = 'balanced' | 'more-mcqs' | 'more-written';
export type WorksheetDifficultyTag = 'easier' | 'challenge';

export type WorksheetVersionSettings = {
  questionCount: number;
  format: WorksheetFormatTag;
  difficulty?: WorksheetDifficultyTag;
};

export type WorksheetVersion = {
  id: string;
  label: string;
  settings: WorksheetVersionSettings;
  worksheet?: Worksheet;
};

export type ArtifactType = 'worksheet' | 'notes' | 'mindmap';
export type NotesStyle = 'study-sheet' | 'bullet-summary' | 'exam-revision' | 'formula-sheet';

export type NotesArtifact = {
  title: string;
  style: NotesStyle;
  sections: Array<{ heading: string; points: string[] }>;
  recap: string[];
};

export type MindMapArtifact = {
  title: string;
  branches: Array<{ label: string; children: string[] }>;
};

export type Chat = {
  id: string;
  title: string;
  bookId?: string;
  chapterId?: string;
  createdAt: string;
  messages: ChatMessage[];
  /** Reusable organization labels, managed from the dashboard. */
  tagIds?: string[];
  artifactType?: ArtifactType;
  notesStyle?: NotesStyle;
  notes?: NotesArtifact;
  mindMap?: MindMapArtifact;
  /** New chats retain independent printable versions; worksheet stays for old chats. */
  worksheetVersions?: WorksheetVersion[];
  worksheet?: Worksheet;
};

export type QuickTag = {
  id: string;
  name: string;
  color: string;
};

/** Below this, a chapter is almost certainly a scanned image, not text. */
export const LOW_TEXT_THRESHOLD = 500;
