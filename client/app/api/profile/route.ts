import { updateTeacherName } from '@/lib/config';

export async function PATCH(req: Request) {
  let body: { teacherName?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid profile request.' }, { status: 400 });
  }

  if (typeof body.teacherName !== 'string') {
    return Response.json({ error: 'Enter a valid name.' }, { status: 400 });
  }

  try {
    return Response.json({ config: await updateTeacherName(body.teacherName) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not save your profile.' },
      { status: 422 },
    );
  }
}
