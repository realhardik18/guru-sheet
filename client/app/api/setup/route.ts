import { configureApp } from '@/lib/config';

export async function POST(req: Request) {
  let body: { teacherName?: unknown; parentDirectory?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid setup request.' }, { status: 400 });
  }

  if (typeof body.teacherName !== 'string' || typeof body.parentDirectory !== 'string') {
    return Response.json({ error: 'Enter your name and a folder location.' }, { status: 400 });
  }

  try {
    const config = await configureApp({
      teacherName: body.teacherName,
      parentDirectory: body.parentDirectory,
    });
    return Response.json({ config });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not complete setup.' },
      { status: 422 },
    );
  }
}
