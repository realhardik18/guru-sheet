import { getAppConfig } from '@/lib/config';
import { importNcertFolder } from '@/lib/ncert-importer';
import { findCollection } from '@/lib/store';

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!(await getAppConfig())) {
    return Response.json({ error: 'Complete GuruSheet setup first.' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid NCERT import request.' }, { status: 400 });
  }
  const fields = ['sourceDirectory', 'name', 'classLevel', 'subject'] as const;
  if (fields.some((field) => typeof body[field] !== 'string' || !body[field].trim())) {
    return Response.json({ error: 'Choose a folder and complete every collection field.' }, { status: 400 });
  }

  const input = {
    sourceDirectory: body.sourceDirectory as string,
    name: body.name as string,
    classLevel: body.classLevel as string,
    subject: body.subject as string,
  };
  if (await findCollection(input.name, input.classLevel, input.subject)) {
    return Response.json(
      { error: 'This Class, subject, and collection name already exist. Rename it to import again.' },
      { status: 409 },
    );
  }

  try {
    return Response.json(await importNcertFolder(input));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not import this NCERT folder.' },
      { status: 422 },
    );
  }
}
