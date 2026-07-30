import { Books } from '@phosphor-icons/react/dist/ssr';
import { listCollections } from '@/lib/store';
import { UploadDropzone } from '@/components/UploadDropzone';
import { NcertImport } from '@/components/NcertImport';
import { requireConfiguredPage } from '@/lib/setup';

export const dynamic = 'force-dynamic';

export default async function ImportBooksPage() {
  await requireConfiguredPage();
  const collections = await listCollections();
  const subjectSuggestions = [...new Set([
    'English',
    'Hindi',
    'Mathematics',
    'Science',
    'Social Science',
    'Environmental Studies',
    'Computer Science',
    ...collections.map((collection) => collection.subject),
  ])].sort();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-5 py-10">
      <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
        <Books size={24} className="text-accent" aria-hidden="true" />
        Import books
      </h1>
      <p className="mt-1 text-muted">Add a PDF book or import an NCERT chapter collection.</p>

      <div className="mt-6"><NcertImport subjectSuggestions={subjectSuggestions} /></div>
      <div className="mt-5"><UploadDropzone /></div>
    </main>
  );
}
